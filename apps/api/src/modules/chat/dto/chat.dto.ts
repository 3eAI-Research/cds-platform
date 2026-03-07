import { IsString, IsOptional, IsUUID } from 'class-validator';

export class CreateChannelDto {
  @IsUUID()
  demandId!: string;

  @IsUUID()
  providerUserId!: string;
}

export class SendMessageDto {
  @IsString()
  content!: string;

  @IsOptional()
  @IsString()
  attachmentKey?: string;
}

export class ChatQueryDto {
  @IsOptional()
  @IsString()
  page?: string;

  @IsOptional()
  @IsString()
  pageSize?: string;
}
