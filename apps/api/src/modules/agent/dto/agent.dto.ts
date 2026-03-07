import { IsString, IsBoolean, IsOptional, MinLength, MaxLength } from 'class-validator';

// ─── Request DTOs ────────────────────────────────────────────────────────────

export class SendMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  content!: string;
}

export class UploadPhotosQueryDto {
  @IsBoolean()
  @IsOptional()
  keepPhotos?: boolean;
}

// ─── Response Interfaces ─────────────────────────────────────────────────────

export interface ChatMessageResponse {
  sessionId: string;
  messages: Array<{
    role: string;
    content: string;
    timestamp: string;
  }>;
  extractedData: Record<string, unknown>;
  state: string;
  completionPercentage: number;
}

export interface SessionResponse {
  sessionId: string;
  state: string;
  extractedData: Record<string, unknown>;
  completionPercentage: number;
  createdAt: string;
}
