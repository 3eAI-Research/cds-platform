import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Mistral } from '@mistralai/mistralai';
import { Tool } from '@mistralai/mistralai/models/components/tool';
import { ToolChoiceEnum } from '@mistralai/mistralai/models/components/toolchoiceenum';

// Tool definitions for structured data extraction
const AGENT_TOOLS: Tool[] = [
  {
    type: 'function',
    function: {
      name: 'extract_address',
      description:
        'Extract a moving address from the conversation. Call this when the user mentions an address.',
      parameters: {
        type: 'object',
        properties: {
          direction: {
            type: 'string',
            enum: ['from', 'to'],
            description: 'Whether this is the origin or destination',
          },
          street: { type: 'string', description: 'Street name' },
          houseNumber: { type: 'string', description: 'House/building number' },
          postCode: { type: 'string', description: 'Postal code' },
          placeName: { type: 'string', description: 'City name' },
          floor: { type: 'number', description: 'Floor number (0 for ground)' },
          additionalInfo: {
            type: 'string',
            description:
              'Additional info like apartment number, access codes',
          },
        },
        required: ['direction', 'placeName'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'extract_estate',
      description:
        'Extract apartment/property details. Call when user mentions apartment type, size, or rooms.',
      parameters: {
        type: 'object',
        properties: {
          estateType: {
            type: 'string',
            enum: ['apartment', 'house', 'office', 'warehouse'],
          },
          totalSquareMeters: {
            type: 'number',
            description: 'Total area in m²',
          },
          numberOfRooms: {
            type: 'number',
            description: 'Number of rooms',
          },
          floor: { type: 'number', description: 'Floor number' },
          elevatorType: {
            type: 'string',
            enum: ['NONE', 'PERSONAL', 'FREIGHT'],
          },
        },
        required: ['estateType'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'extract_furniture',
      description:
        'Extract furniture items from conversation. Call when user lists their furniture.',
      parameters: {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: {
                  type: 'string',
                  description: 'Furniture name (e.g., Doppelbett, Schrank)',
                },
                quantity: {
                  type: 'number',
                  description: 'How many',
                  default: 1,
                },
                room: {
                  type: 'string',
                  description: 'Which room it belongs to',
                },
              },
              required: ['name'],
            },
          },
        },
        required: ['items'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'extract_dates',
      description:
        'Extract preferred moving dates. Call when user mentions dates.',
      parameters: {
        type: 'object',
        properties: {
          preferredDateStart: {
            type: 'string',
            description: 'Earliest date (ISO format YYYY-MM-DD)',
          },
          preferredDateEnd: {
            type: 'string',
            description: 'Latest date (ISO format YYYY-MM-DD)',
          },
          dateFlexibility: {
            type: 'boolean',
            description: 'Whether dates are flexible',
          },
        },
        required: ['preferredDateStart'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'extract_services',
      description:
        'Extract additional services. Call when user mentions packing, assembly, etc.',
      parameters: {
        type: 'object',
        properties: {
          serviceType: {
            type: 'string',
            enum: ['PRIVATE_MOVE', 'COMMERCIAL_MOVE', 'FURNITURE_TRANSPORT'],
          },
          numberOfPeople: {
            type: 'number',
            description: 'Number of people/helpers needed',
          },
          furnitureMontage: {
            type: 'boolean',
            description: 'Furniture assembly/disassembly',
          },
          kitchenMontage: {
            type: 'boolean',
            description: 'Kitchen assembly',
          },
          packingService: {
            type: 'boolean',
            description: 'Packing service',
          },
          halteverbotRequired: {
            type: 'boolean',
            description: 'No-parking zone needed',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'show_summary',
      description:
        'Show a summary of all collected data. Call ONLY when all required fields (from address, to address, estate type, at least 1 furniture item, and at least a start date) are collected.',
      parameters: {
        type: 'object',
        properties: {
          ready: {
            type: 'boolean',
            description: 'Whether all data is collected',
          },
        },
        required: ['ready'],
      },
    },
  },
];

const SYSTEM_PROMPT = `You are a friendly moving assistant for CDS Platform. You help users plan their move by collecting information through natural conversation.

Your job is to collect:
1. FROM address (where they're moving from) — street, house number, postal code, city, floor
2. TO address (where they're moving to) — same fields
3. Property type (apartment, house, office, warehouse), size in m², number of rooms
4. Furniture list — what items they're moving
5. Preferred moving dates
6. Additional services (packing, furniture assembly, kitchen assembly, no-parking zone)

RULES:
- Respond in the SAME LANGUAGE the user writes in
- Be conversational and friendly, not robotic
- Ask one topic at a time, don't overwhelm
- When the user provides information, use the appropriate tool to extract it
- After extracting data, confirm what you understood and ask about the next missing piece
- When you have at least: both addresses, estate type, 1+ furniture items, and a start date — call show_summary
- If the user wants to change something after summary, update the relevant field
- If the user is vague ("I have a 3-room apartment"), infer what you can and ask for specifics
- Support photo uploads — when the user mentions photos, tell them they can upload room photos for automatic furniture detection`;

@Injectable()
export class MistralService {
  private readonly logger = new Logger(MistralService.name);
  private readonly client: Mistral;
  private readonly model: string;
  private readonly visionModel: string;

  constructor(private readonly configService: ConfigService) {
    this.client = new Mistral({
      apiKey: configService.get('MISTRAL_API_KEY', ''),
    });
    this.model = configService.get('MISTRAL_MODEL', 'mistral-large-latest');
    this.visionModel = configService.get(
      'MISTRAL_VISION_MODEL',
      'pixtral-large-latest',
    );
  }

  /**
   * Send a chat message with conversation history and receive a response
   * with optional tool calls for structured data extraction.
   */
  async chat(
    conversationHistory: Array<{ role: string; content: string }>,
  ): Promise<{
    content: string;
    toolCalls: Array<{
      name: string;
      arguments: Record<string, unknown>;
    }>;
  }> {
    const messages = [
      { role: 'system' as const, content: SYSTEM_PROMPT },
      ...conversationHistory.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    ];

    try {
      const response = await this.client.chat.complete({
        model: this.model,
        messages,
        tools: AGENT_TOOLS,
        toolChoice: ToolChoiceEnum.Auto,
      });

      const choice = response.choices?.[0];
      const message = choice?.message;

      const toolCalls = (message?.toolCalls || []).map((tc) => ({
        name: tc.function.name,
        arguments: JSON.parse(tc.function.arguments as string),
      }));

      return {
        content: (message?.content as string) || '',
        toolCalls,
      };
    } catch (error) {
      this.logger.error('Mistral chat error', error);
      throw error;
    }
  }

  /**
   * Analyze a photo using Pixtral vision model and detect furniture items.
   * Returns an array of detected furniture with name (German), quantity, and confidence.
   */
  async analyzePhoto(
    imageBase64: string,
    mimeType: string = 'image/jpeg',
  ): Promise<
    Array<{ name: string; quantity: number; confidence: number }>
  > {
    try {
      const response = await this.client.chat.complete({
        model: this.visionModel,
        messages: [
          {
            role: 'system',
            content:
              'You are a furniture detection assistant. Analyze the photo and list ALL furniture items you can see. For each item, provide: name (in German), estimated quantity, and your confidence (0-1). Return ONLY a JSON array.',
          },
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                imageUrl: {
                  url: `data:${mimeType};base64,${imageBase64}`,
                },
              },
              {
                type: 'text',
                text: 'List all furniture items in this photo as JSON array: [{"name": "Doppelbett", "quantity": 1, "confidence": 0.95}]',
              },
            ],
          },
        ],
      });

      const content =
        (response.choices?.[0]?.message?.content as string) || '[]';
      // Extract JSON from response (may be wrapped in markdown code blocks)
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return [];
    } catch (error) {
      this.logger.error('Mistral vision error', error);
      throw error;
    }
  }
}
