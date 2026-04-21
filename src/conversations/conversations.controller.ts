import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { ConversationsService } from './conversations.service';

@ApiTags('Conversations')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller({ path: 'conversations', version: '1' })
export class ConversationsController {
  constructor(private readonly service: ConversationsService) {}

  @Get()
  @ApiOperation({ summary: 'List user conversations' })
  async list(
    @Request() req,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.service.listByUser(
      req.user.id,
      limit ? parseInt(limit, 10) : 50,
      offset ? parseInt(offset, 10) : 0,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get conversation with messages' })
  async getOne(@Request() req, @Param('id') id: string) {
    const conv = await this.service.getWithMessages(
      parseInt(id, 10),
      req.user.id,
    );
    if (!conv) throw new NotFoundException('Conversation not found');
    return conv;
  }

  @Post()
  @ApiOperation({ summary: 'Create a conversation' })
  async create(
    @Request() req,
    @Body() body: { title?: string; model?: string; systemPrompt?: string },
  ) {
    return this.service.create(req.user.id, body);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update conversation' })
  async update(
    @Request() req,
    @Param('id') id: string,
    @Body() body: { title?: string; model?: string; systemPrompt?: string },
  ) {
    const conv = await this.service.update(parseInt(id, 10), req.user.id, body);
    if (!conv) throw new NotFoundException('Conversation not found');
    return conv;
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete conversation' })
  async remove(@Request() req, @Param('id') id: string) {
    const ok = await this.service.remove(parseInt(id, 10), req.user.id);
    if (!ok) throw new NotFoundException('Conversation not found');
  }

  @Post(':id/messages')
  @ApiOperation({ summary: 'Add message to conversation' })
  async addMessage(
    @Request() req,
    @Param('id') id: string,
    @Body() body: { role: string; content: string; tokens?: number },
  ) {
    const msg = await this.service.addMessage(
      parseInt(id, 10),
      req.user.id,
      body,
    );
    if (!msg) throw new NotFoundException('Conversation not found');
    return msg;
  }
}
