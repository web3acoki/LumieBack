import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsArray,
  IsObject,
  Allow,
} from 'class-validator';

/**
 * Message DTO — intentionally permissive to support OpenAI-compatible formats.
 * OpenClaw agent sends messages with content as string OR array (multi-modal),
 * plus fields like tool_calls, tool_call_id, name, etc.
 * We validate minimally and pass through to the upstream provider as-is.
 */
class MessageDto {
  @ApiProperty({ example: 'user' })
  @IsString()
  role: string;

  @ApiPropertyOptional({ example: 'Hello!' })
  @IsOptional()
  @Allow()
  content?: any;

  @ApiPropertyOptional()
  @IsOptional()
  @Allow()
  tool_calls?: any;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tool_call_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;
}

export class ChatCompletionDto {
  @ApiProperty({ example: 'gpt-4o' })
  @IsString()
  model: string;

  @ApiProperty({ type: [MessageDto] })
  @IsArray()
  messages: any[];

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  temperature?: number;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  stream?: boolean;

  @ApiPropertyOptional({ example: 4096 })
  @IsOptional()
  @IsNumber()
  max_tokens?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  response_format?: any;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  tools?: any[];

  @ApiPropertyOptional()
  @IsOptional()
  @Allow()
  tool_choice?: any;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  parallel_tool_calls?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  top_p?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  frequency_penalty?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  presence_penalty?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Allow()
  stop?: any;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  seed?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  n?: number;
}

