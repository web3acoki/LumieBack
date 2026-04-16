import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsArray,
  ValidateNested,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';

class MessageDto {
  @ApiProperty({ example: 'user' })
  @IsString()
  role: string;

  @ApiProperty({ example: 'Hello!' })
  @IsString()
  content: string;
}

export class ChatCompletionDto {
  @ApiProperty({ example: 'gpt-4o' })
  @IsString()
  model: string;

  @ApiProperty({ type: [MessageDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MessageDto)
  messages: MessageDto[];

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
}
