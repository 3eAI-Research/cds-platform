import { Injectable, Logger, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { MistralService } from './mistral.service';
import { PhotoAnalyzerService, DetectedItem } from './photo-analyzer.service';
import { PlanCalculatorService, PlanInput, MovingPlan } from './plan-calculator.service';
import { ReportService } from './report.service';
import { CreditService } from '../../credit/services/credit.service';
import { PhotoStorageService, PhotoStorageResult } from './photo-storage.service';
import { DemandService } from '../../demand/services/demand.service';
import { Prisma } from '@prisma/client';
import { BusinessException, NotFoundException } from '../../../common/exceptions/business.exception';
import { ErrorCode } from '../../../common/types/error-codes';
import { ChatMessageResponse, SessionResponse } from '../dto/agent.dto';
import {
  CreateDemandDto,
  DemandServiceType,
  TransportType,
  ElevatorType,
} from '../../demand/dto/create-demand.dto';

// ─── Constants ───────────────────────────────────────────────────────────────

const SESSION_TTL_SECONDS = 1800; // 30 minutes
const REDIS_KEY_PREFIX = 'agent:session:';

// ─── Session State (stored in Redis) ─────────────────────────────────────────

type SessionStateType =
  | 'ACTIVE'
  | 'COLLECTING'
  | 'SUMMARY'
  | 'SUBMITTED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'EXPIRED';

interface SessionState {
  sessionId: string;
  userId: string;
  state: SessionStateType;
  conversationHistory: Array<{ role: string; content: string; timestamp: string }>;
  extractedData: {
    from?: { address?: Record<string, unknown>; estate?: Record<string, unknown> };
    to?: { address?: Record<string, unknown>; estate?: Record<string, unknown> };
    furniture?: Array<{ furnitureTypeId?: string; name: string; quantity: number }>;
    dates?: { preferredDateStart?: string; preferredDateEnd?: string; dateFlexibility?: boolean };
    services?: Record<string, unknown>;
    serviceType?: string;
    numberOfPeople?: number;
  };
  completionPercentage: number;
  demandId?: string;
}

// ─── Service ─────────────────────────────────────────────────────────────────

@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly mistralService: MistralService,
    private readonly photoAnalyzerService: PhotoAnalyzerService,
    private readonly planCalculatorService: PlanCalculatorService,
    private readonly reportService: ReportService,
    private readonly creditService: CreditService,
    private readonly demandService: DemandService,
    private readonly photoStorageService: PhotoStorageService,
  ) {}

  // ─── Create Session ──────────────────────────────────────────────────────────

  async createSession(userId: string): Promise<{ sessionId: string }> {
    const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);

    const session = await this.prisma.agentSession.create({
      data: {
        userId,
        state: 'ACTIVE',
        expiresAt,
      },
    });

    const sessionState: SessionState = {
      sessionId: session.id,
      userId,
      state: 'ACTIVE',
      conversationHistory: [],
      extractedData: {},
      completionPercentage: 0,
    };

    await this.redis.setJson(
      `${REDIS_KEY_PREFIX}${session.id}`,
      sessionState,
      SESSION_TTL_SECONDS,
    );

    this.logger.log(`Session created: ${session.id} for user ${userId}`);

    return { sessionId: session.id };
  }

  // ─── Send Message ────────────────────────────────────────────────────────────

  async sendMessage(
    sessionId: string,
    userId: string,
    content: string,
  ): Promise<ChatMessageResponse> {
    const session = await this.loadAndValidateSession(sessionId, userId);

    // Transition ACTIVE → COLLECTING on first message
    if (session.state === 'ACTIVE') {
      session.state = 'COLLECTING';
    }

    // Add user message to history
    const now = new Date().toISOString();
    session.conversationHistory.push({
      role: 'user',
      content,
      timestamp: now,
    });

    // Call Mistral AI
    const aiResponse = await this.mistralService.chat(
      session.conversationHistory.map((m) => ({ role: m.role, content: m.content })),
    );

    // Process tool calls — merge extracted data into session state
    for (const toolCall of aiResponse.toolCalls) {
      this.processToolCall(session, toolCall.name, toolCall.arguments);
    }

    // Add assistant response to history
    const assistantTimestamp = new Date().toISOString();
    if (aiResponse.content) {
      session.conversationHistory.push({
        role: 'assistant',
        content: aiResponse.content,
        timestamp: assistantTimestamp,
      });
    }

    // Recalculate completion percentage
    session.completionPercentage = this.calculateCompletionPercentage(session.extractedData);

    // Save to Redis (refresh TTL)
    await this.redis.setJson(
      `${REDIS_KEY_PREFIX}${sessionId}`,
      session,
      SESSION_TTL_SECONDS,
    );

    // Persist messages to DB
    const messagesToPersist: Prisma.AgentMessageCreateManyInput[] = [
      {
        sessionId,
        role: 'user',
        content,
      },
    ];

    if (aiResponse.content) {
      messagesToPersist.push({
        sessionId,
        role: 'assistant',
        content: aiResponse.content,
        metadata: aiResponse.toolCalls.length > 0
          ? (aiResponse.toolCalls as unknown as Prisma.InputJsonValue)
          : undefined,
      });
    }

    await this.prisma.agentMessage.createMany({ data: messagesToPersist });

    // Update AgentSession in DB
    await this.prisma.agentSession.update({
      where: { id: sessionId },
      data: {
        state: session.state,
        completionPct: session.completionPercentage,
        messageCount: { increment: messagesToPersist.length },
        extractedData: session.extractedData as unknown as Prisma.InputJsonValue,
      },
    });

    // Return the last 2 messages (user + assistant) for convenience
    const recentMessages = session.conversationHistory.slice(-2);

    return {
      sessionId,
      messages: recentMessages,
      extractedData: session.extractedData as Record<string, unknown>,
      state: session.state,
      completionPercentage: session.completionPercentage,
    };
  }

  // ─── Upload Photos ───────────────────────────────────────────────────────────

  async uploadPhotos(
    sessionId: string,
    userId: string,
    photos: Array<{ buffer: Buffer; mimeType: string; originalName?: string }>,
    keepPhotos: boolean = false,
  ): Promise<{ detectedItems: DetectedItem[]; storedPhotos?: PhotoStorageResult[] }> {
    const session = await this.loadAndValidateSession(sessionId, userId);

    // Deduct 1 credit for photo analysis
    await this.creditService.deductCredits(userId, 1, 'photo_analysis', sessionId);

    // Analyze photos
    const result = await this.photoAnalyzerService.analyzePhotos(photos);

    // If user opted to keep photos, store them in MinIO
    let storedPhotos: PhotoStorageResult[] | undefined;
    if (keepPhotos) {
      storedPhotos = [];
      for (const photo of photos) {
        try {
          const stored = await this.photoStorageService.storePhoto(
            userId,
            sessionId,
            photo.buffer,
            photo.originalName ?? `photo-${Date.now()}.jpg`,
            photo.mimeType,
          );
          storedPhotos.push(stored);
        } catch (err) {
          this.logger.warn(`Failed to store photo for user ${userId}: ${err}`);
          // Don't fail the whole upload — analysis already done
        }
      }
    }

    // Merge detected items into session furniture
    if (!session.extractedData.furniture) {
      session.extractedData.furniture = [];
    }

    for (const item of result.detectedItems) {
      const existing = session.extractedData.furniture.find(
        (f) => f.name.toLowerCase() === item.name.toLowerCase(),
      );
      if (existing) {
        existing.quantity += item.quantity;
        if (item.furnitureTypeId && !existing.furnitureTypeId) {
          existing.furnitureTypeId = item.furnitureTypeId;
        }
      } else {
        session.extractedData.furniture.push({
          furnitureTypeId: item.furnitureTypeId ?? undefined,
          name: item.name,
          quantity: item.quantity,
        });
      }
    }

    // Add system message about detected items
    const systemMsg = `Detected ${result.detectedItems.length} furniture items from ${photos.length} photo(s)`;
    session.conversationHistory.push({
      role: 'system',
      content: systemMsg,
      timestamp: new Date().toISOString(),
    });

    // Recalculate completion
    session.completionPercentage = this.calculateCompletionPercentage(session.extractedData);

    // Update Redis
    await this.redis.setJson(
      `${REDIS_KEY_PREFIX}${sessionId}`,
      session,
      SESSION_TTL_SECONDS,
    );

    // Persist system message to DB
    await this.prisma.agentMessage.create({
      data: { sessionId, role: 'system', content: systemMsg },
    });

    // Update session in DB
    await this.prisma.agentSession.update({
      where: { id: sessionId },
      data: {
        completionPct: session.completionPercentage,
        photoCount: { increment: photos.length },
        messageCount: { increment: 1 },
        extractedData: session.extractedData as unknown as Prisma.InputJsonValue,
      },
    });

    this.logger.log(
      `Photo analysis: ${result.detectedItems.length} items detected for session ${sessionId}` +
        (keepPhotos ? `, ${storedPhotos?.length ?? 0} photos stored` : ', photos discarded'),
    );

    return { detectedItems: result.detectedItems, storedPhotos };
  }

  // ─── Confirm Demand ──────────────────────────────────────────────────────────

  async confirmDemand(
    sessionId: string,
    userId: string,
  ): Promise<{ demandId: string }> {
    const session = await this.loadAndValidateSession(sessionId, userId);

    if (session.state !== 'SUMMARY') {
      throw new BusinessException(
        ErrorCode.BIZ_INVALID_STATUS_TRANSITION,
        `Cannot confirm demand: session state is ${session.state}, expected SUMMARY`,
      );
    }

    // Build CreateDemandDto from extractedData
    const demandDto = this.buildCreateDemandDto(session.extractedData);

    // Create demand via DemandService
    const demandResponse = await this.demandService.create(demandDto, userId);

    // Update session state
    session.state = 'SUBMITTED';
    session.demandId = demandResponse.id;

    await this.redis.setJson(
      `${REDIS_KEY_PREFIX}${sessionId}`,
      session,
      SESSION_TTL_SECONDS,
    );

    await this.prisma.agentSession.update({
      where: { id: sessionId },
      data: {
        state: 'SUBMITTED',
        demandId: demandResponse.id,
      },
    });

    this.logger.log(
      `Demand created: ${demandResponse.id} from session ${sessionId}`,
    );

    return { demandId: demandResponse.id };
  }

  // ─── Calculate Plan ──────────────────────────────────────────────────────────

  async calculatePlan(
    sessionId: string,
    userId: string,
  ): Promise<{ plan: MovingPlan; reportId: string; downloadPath: string }> {
    const session = await this.loadAndValidateSession(sessionId, userId);

    // Deduct 1 credit for report generation
    await this.creditService.deductCredits(userId, 1, 'report', sessionId);

    // Build PlanInput from extractedData
    const planInput = this.buildPlanInput(session.extractedData);

    // Calculate plan
    const plan = await this.planCalculatorService.calculatePlan(planInput);

    // Generate report
    const { reportId, downloadPath } = await this.reportService.generateReport(
      sessionId,
      userId,
      session.demandId ?? null,
      plan,
      session.extractedData as Record<string, unknown>,
    );

    // Update session state
    session.state = 'COMPLETED';

    await this.redis.setJson(
      `${REDIS_KEY_PREFIX}${sessionId}`,
      session,
      SESSION_TTL_SECONDS,
    );

    await this.prisma.agentSession.update({
      where: { id: sessionId },
      data: {
        state: 'COMPLETED',
        reportId,
      },
    });

    this.logger.log(
      `Plan calculated and report generated: ${reportId} for session ${sessionId}`,
    );

    return { plan, reportId, downloadPath };
  }

  // ─── Get Session ─────────────────────────────────────────────────────────────

  async getSession(sessionId: string, userId: string): Promise<SessionResponse> {
    const session = await this.loadAndValidateSession(sessionId, userId);

    const dbSession = await this.prisma.agentSession.findUnique({
      where: { id: sessionId },
    });

    return {
      sessionId: session.sessionId,
      state: session.state,
      extractedData: session.extractedData as Record<string, unknown>,
      completionPercentage: session.completionPercentage,
      createdAt: dbSession?.createdAt.toISOString() ?? new Date().toISOString(),
    };
  }

  // ─── Cancel Session ──────────────────────────────────────────────────────────

  /**
   * Get all agent sessions (admin).
   */
  async getAllSessions(page: number | string, pageSize: number | string) {
    const p = Number(page) || 1;
    const ps = Number(pageSize) || 50;
    const skip = (p - 1) * ps;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.agentSession.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: ps,
        include: { messages: { orderBy: { createdAt: 'asc' } } },
      }),
      this.prisma.agentSession.count(),
    ]);

    return {
      items: items.map((s) => ({
        id: s.id,
        userId: s.userId,
        state: s.state,
        messageCount: s.messageCount,
        photoCount: s.photoCount,
        createdAt: s.createdAt,
        messages: s.messages.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          createdAt: m.createdAt,
        })),
      })),
      total,
      page: p,
      pageSize: ps,
      totalPages: Math.ceil(total / ps),
    };
  }

  async cancelSession(sessionId: string, userId: string): Promise<void> {
    const session = await this.loadAndValidateSession(sessionId, userId);

    session.state = 'CANCELLED';

    // Remove from Redis
    await this.redis.del(`${REDIS_KEY_PREFIX}${sessionId}`);

    // Update DB
    await this.prisma.agentSession.update({
      where: { id: sessionId },
      data: { state: 'CANCELLED' },
    });

    this.logger.log(`Session cancelled: ${sessionId}`);
  }

  // ─── Private: Load & Validate Session ────────────────────────────────────────

  private async loadAndValidateSession(
    sessionId: string,
    userId: string,
  ): Promise<SessionState> {
    const session = await this.redis.getJson<SessionState>(
      `${REDIS_KEY_PREFIX}${sessionId}`,
    );

    if (!session) {
      // Try loading from DB as fallback
      const dbSession = await this.prisma.agentSession.findUnique({
        where: { id: sessionId },
      });

      if (!dbSession) {
        throw new NotFoundException('AgentSession', sessionId);
      }

      if (dbSession.userId !== userId) {
        throw new BusinessException(
          ErrorCode.AUTH_INSUFFICIENT_ROLE,
          'You do not own this session',
          HttpStatus.FORBIDDEN,
        );
      }

      if (dbSession.expiresAt < new Date()) {
        throw new BusinessException(
          ErrorCode.BUS_SESSION_EXPIRED,
          'Session has expired',
          HttpStatus.GONE,
        );
      }

      throw new BusinessException(
        ErrorCode.BUS_SESSION_EXPIRED,
        'Session data expired from cache. Please start a new session.',
        HttpStatus.GONE,
      );
    }

    // Validate ownership
    if (session.userId !== userId) {
      throw new BusinessException(
        ErrorCode.AUTH_INSUFFICIENT_ROLE,
        'You do not own this session',
        HttpStatus.FORBIDDEN,
      );
    }

    // Check terminal states
    const terminalStates: SessionStateType[] = ['CANCELLED', 'EXPIRED', 'COMPLETED'];
    if (terminalStates.includes(session.state)) {
      throw new BusinessException(
        ErrorCode.BIZ_INVALID_STATUS_TRANSITION,
        `Session is in terminal state: ${session.state}`,
      );
    }

    return session;
  }

  // ─── Private: Process Tool Calls ─────────────────────────────────────────────

  private processToolCall(
    session: SessionState,
    toolName: string,
    args: Record<string, unknown>,
  ): void {
    switch (toolName) {
      case 'extract_address': {
        const direction = args['direction'] as 'from' | 'to';
        if (!session.extractedData[direction]) {
          session.extractedData[direction] = {};
        }
        session.extractedData[direction]!.address = {
          street: args['street'],
          houseNumber: args['houseNumber'],
          postCode: args['postCode'],
          placeName: args['placeName'],
          floor: args['floor'],
          additionalInfo: args['additionalInfo'],
        };
        break;
      }

      case 'extract_estate': {
        if (!session.extractedData.from) {
          session.extractedData.from = {};
        }
        session.extractedData.from.estate = {
          estateType: args['estateType'],
          totalSquareMeters: args['totalSquareMeters'],
          numberOfRooms: args['numberOfRooms'],
          floor: args['floor'],
          elevatorType: args['elevatorType'],
        };
        break;
      }

      case 'extract_furniture': {
        const items = args['items'] as Array<{ name: string; quantity?: number; room?: string }>;
        if (!session.extractedData.furniture) {
          session.extractedData.furniture = [];
        }
        for (const item of items) {
          const existing = session.extractedData.furniture.find(
            (f) => f.name.toLowerCase() === item.name.toLowerCase(),
          );
          if (existing) {
            existing.quantity += (item.quantity ?? 1);
          } else {
            session.extractedData.furniture.push({
              name: item.name,
              quantity: item.quantity ?? 1,
            });
          }
        }
        break;
      }

      case 'extract_dates': {
        session.extractedData.dates = {
          preferredDateStart: args['preferredDateStart'] as string | undefined,
          preferredDateEnd: args['preferredDateEnd'] as string | undefined,
          dateFlexibility: args['dateFlexibility'] as boolean | undefined,
        };
        break;
      }

      case 'extract_services': {
        session.extractedData.services = {
          furnitureMontage: args['furnitureMontage'],
          kitchenMontage: args['kitchenMontage'],
          packingService: args['packingService'],
          halteverbotRequired: args['halteverbotRequired'],
        };
        if (args['serviceType']) {
          session.extractedData.serviceType = args['serviceType'] as string;
        }
        if (args['numberOfPeople']) {
          session.extractedData.numberOfPeople = args['numberOfPeople'] as number;
        }
        break;
      }

      case 'show_summary': {
        session.state = 'SUMMARY';
        break;
      }

      default:
        this.logger.warn(`Unknown tool call: ${toolName}`);
    }
  }

  // ─── Private: Calculate Completion Percentage ────────────────────────────────

  private calculateCompletionPercentage(
    data: SessionState['extractedData'],
  ): number {
    let percentage = 0;

    // 20% — from address
    if (data.from?.address && (data.from.address as Record<string, unknown>)['placeName']) {
      percentage += 20;
    }

    // 20% — to address
    if (data.to?.address && (data.to.address as Record<string, unknown>)['placeName']) {
      percentage += 20;
    }

    // 20% — estate type
    if (data.from?.estate && (data.from.estate as Record<string, unknown>)['estateType']) {
      percentage += 20;
    }

    // 20% — furniture (at least 1 item)
    if (data.furniture && data.furniture.length > 0) {
      percentage += 20;
    }

    // 20% — dates (at least start date)
    if (data.dates?.preferredDateStart) {
      percentage += 20;
    }

    return percentage;
  }

  // ─── Private: Build CreateDemandDto ──────────────────────────────────────────

  /**
   * Transform agent extractedData into the CreateDemandDto format
   * expected by DemandService.create().
   */
  private buildCreateDemandDto(
    data: SessionState['extractedData'],
  ): CreateDemandDto {
    const fromAddr = (data.from?.address ?? {}) as Record<string, unknown>;
    const toAddr = (data.to?.address ?? {}) as Record<string, unknown>;
    const fromEstate = (data.from?.estate ?? {}) as Record<string, unknown>;

    // Map estate type string to estateTypeId — use placeholder UUID for MVP
    // In production, this would look up the estate type by name
    const estateTypeId = crypto.randomUUID();

    // Map elevator type
    const elevatorType = fromEstate['elevatorType'] as string | undefined;
    const mappedElevatorType = elevatorType
      ? (elevatorType as ElevatorType)
      : ElevatorType.NONE;

    // Build furniture items for estate parts
    const furnitureItems = (data.furniture ?? [])
      .filter((f) => f.furnitureTypeId)
      .map((f) => ({
        furnitureTypeId: f.furnitureTypeId!,
        quantity: f.quantity,
      }));

    // Service type
    const serviceType = (data.serviceType as DemandServiceType) ?? DemandServiceType.PRIVATE_MOVE;

    // Preferred dates — ensure non-null strings for CreateDemandDto
    const startDate: string = data.dates?.preferredDateStart ?? new Date().toISOString().split('T')[0]!;
    const endDate: string = data.dates?.preferredDateEnd ?? startDate;

    const dto: CreateDemandDto = {
      serviceType,
      transportType: TransportType.LOCAL,
      from: {
        address: {
          street: (fromAddr['street'] as string) ?? 'Unknown',
          houseNumber: (fromAddr['houseNumber'] as string) ?? '1',
          postCode: (fromAddr['postCode'] as string) ?? '00000',
          placeName: (fromAddr['placeName'] as string) ?? 'Unknown',
          floor: fromAddr['floor'] as number | undefined,
          additionalInfo: fromAddr['additionalInfo'] as string | undefined,
        },
        estate: {
          estateTypeId,
          totalSquareMeters: (fromEstate['totalSquareMeters'] as number) ?? 50,
          numberOfRooms: (fromEstate['numberOfRooms'] as number) ?? 2,
          elevatorType: mappedElevatorType,
          furnitureMontage: (data.services?.['furnitureMontage'] as boolean) ?? false,
          kitchenMontage: (data.services?.['kitchenMontage'] as boolean) ?? false,
          packingService: (data.services?.['packingService'] as boolean) ?? false,
          halteverbotRequired: (data.services?.['halteverbotRequired'] as boolean) ?? false,
          parts: [
            {
              estatePartTypeId: crypto.randomUUID(), // MVP placeholder
              furnitureItems: furnitureItems.length > 0 ? furnitureItems : [],
            },
          ],
        },
      },
      to: {
        address: {
          street: (toAddr['street'] as string) ?? 'Unknown',
          houseNumber: (toAddr['houseNumber'] as string) ?? '1',
          postCode: (toAddr['postCode'] as string) ?? '00000',
          placeName: (toAddr['placeName'] as string) ?? 'Unknown',
          floor: toAddr['floor'] as number | undefined,
          additionalInfo: toAddr['additionalInfo'] as string | undefined,
        },
        estate: {
          estateTypeId,
          totalSquareMeters: (fromEstate['totalSquareMeters'] as number) ?? 50,
          numberOfRooms: (fromEstate['numberOfRooms'] as number) ?? 2,
          elevatorType: ElevatorType.NONE,
          parts: [
            {
              estatePartTypeId: crypto.randomUUID(), // MVP placeholder
              furnitureItems: [],
            },
          ],
        },
      },
      numberOfPeople: data.numberOfPeople ?? 2,
      preferredDateStart: startDate,
      preferredDateEnd: endDate,
      dateFlexibility: data.dates?.dateFlexibility,
    };

    return dto;
  }

  // ─── Private: Build PlanInput ────────────────────────────────────────────────

  /**
   * Transform agent extractedData into PlanInput for PlanCalculatorService.
   */
  private buildPlanInput(data: SessionState['extractedData']): PlanInput {
    const fromAddr = (data.from?.address ?? {}) as Record<string, unknown>;
    const toAddr = (data.to?.address ?? {}) as Record<string, unknown>;
    const fromEstate = (data.from?.estate ?? {}) as Record<string, unknown>;
    const toEstate = (data.to?.estate ?? {}) as Record<string, unknown>;

    return {
      fromAddress: {
        postCode: (fromAddr['postCode'] as string) ?? '00000',
        placeName: (fromAddr['placeName'] as string) ?? 'Unknown',
        street: fromAddr['street'] as string | undefined,
        floor: fromAddr['floor'] as number | undefined,
        elevatorType: (fromEstate['elevatorType'] as string) ?? 'NONE',
      },
      toAddress: {
        postCode: (toAddr['postCode'] as string) ?? '00000',
        placeName: (toAddr['placeName'] as string) ?? 'Unknown',
        street: toAddr['street'] as string | undefined,
        floor: toAddr['floor'] as number | undefined,
        elevatorType: (toEstate['elevatorType'] as string) ?? 'NONE',
      },
      furnitureItems: (data.furniture ?? [])
        .filter((f) => f.furnitureTypeId)
        .map((f) => ({
          furnitureTypeId: f.furnitureTypeId!,
          quantity: f.quantity,
        })),
      preferredDate: data.dates?.preferredDateStart,
      services: {
        furnitureMontage: (data.services?.['furnitureMontage'] as boolean) ?? false,
        kitchenMontage: (data.services?.['kitchenMontage'] as boolean) ?? false,
        packingService: (data.services?.['packingService'] as boolean) ?? false,
      },
    };
  }
}
