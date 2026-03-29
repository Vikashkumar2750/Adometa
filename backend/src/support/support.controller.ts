import {
    Controller, Get, Post, Patch, Param, Body, Req,
    UseGuards, Query, UseInterceptors, UploadedFiles,
    HttpCode, HttpStatus, BadRequestException, Logger,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { SupportService } from './support.service';
import { SupportGateway } from './support.gateway';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { TenantIsolationGuard } from '../common/guards/tenant-isolation.guard';
import { CreateTicketDto, UpdateStatusDto } from './dto/support.dto';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

/** Resolve tenantId regardless of which guard populated it */
function resolveTenantId(req: any): string | undefined {
    return req.tenantId || req.user?.tenantId || undefined;
}

// ─── CLIENT CONTROLLER ────────────────────────────────────────────────────────
@ApiTags('Support — Client')
@ApiBearerAuth()
@Controller('support')
@UseGuards(AuthGuard('jwt'), TenantIsolationGuard)
export class SupportController {
    private readonly logger = new Logger(SupportController.name);

    constructor(
        private supportService: SupportService,
        private gateway: SupportGateway,
    ) { }

    @Get('tickets')
    @ApiOperation({ summary: 'Get my support tickets' })
    getMyTickets(@Req() req: any, @Query('page') page = 1, @Query('limit') limit = 20) {
        const tenantId = resolveTenantId(req);
        if (!tenantId) throw new BadRequestException('No tenant context');
        return this.supportService.getMyTickets(tenantId, req.user.sub, +page, +limit);
    }

    @Post('tickets')
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Create a new support ticket' })
    async createTicket(@Req() req: any, @Body() dto: CreateTicketDto) {
        const tenantId = resolveTenantId(req);
        if (!tenantId) {
            throw new BadRequestException('No tenant context — please log in as a tenant user');
        }
        this.logger.log(`Creating ticket: tenant=${tenantId} user=${req.user?.sub} subject="${dto.subject}"`);

        const ticket = await this.supportService.createTicket({
            tenantId,
            userId: req.user.sub,
            userName: req.user.name || req.user.email,
            userEmail: req.user.email,
            subject: dto.subject,
            message: dto.message,
            priority: dto.priority,
        });

        try { this.gateway.notifyAdmins('new_ticket', ticket); } catch { }
        return ticket;
    }

    @Get('tickets/:id')
    @ApiOperation({ summary: 'Get ticket details + messages' })
    getTicket(@Req() req: any, @Param('id') id: string) {
        return this.supportService.getTicket(id, req.user.sub, false);
    }

    @Post('tickets/:id/messages')
    @HttpCode(HttpStatus.CREATED)
    @UseInterceptors(FilesInterceptor('attachments', 5, {
        storage: memoryStorage(),
        limits: { fileSize: MAX_FILE_SIZE },
        fileFilter: (_req, file, cb) => {
            const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'text/plain'];
            if (allowed.includes(file.mimetype)) cb(null, true);
            else cb(new BadRequestException(`File type ${file.mimetype} not allowed`) as any, false);
        },
    }))
    @ApiOperation({ summary: 'Send a message (with optional file attachments)' })
    async sendMessage(
        @Req() req: any,
        @Param('id') id: string,
        @Body('content') content: string,
        @UploadedFiles() files?: Express.Multer.File[],
    ) {
        if (!content?.trim() && (!files || files.length === 0)) {
            throw new BadRequestException('Message or attachment is required');
        }
        const attachments = await Promise.all((files || []).map(f => this.supportService.saveAttachment(f, id)));
        const message = await this.supportService.sendMessage({
            ticketId: id,
            senderId: req.user.sub,
            senderName: req.user.name || req.user.email,
            senderRole: 'user',
            content: content?.trim() || '',
            attachments,
        });
        try { this.gateway.notifyAdmins('new_message', { ...message, ticketId: id }); } catch { }
        return message;
    }

    @Post('tickets/:id/close')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Close a ticket (user initiated)' })
    closeTicket(@Param('id') id: string) {
        return this.supportService.updateStatus(id, 'closed');
    }
}

// ─── ADMIN CONTROLLER ─────────────────────────────────────────────────────────
@ApiTags('Support — Admin')
@ApiBearerAuth()
@Controller('admin/support')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('SUPER_ADMIN')
export class SupportAdminController {
    constructor(
        private supportService: SupportService,
        private gateway: SupportGateway,
    ) { }

    @Get('stats')
    @ApiOperation({ summary: 'Support ticket statistics' })
    getStats() { return this.supportService.getStats(); }

    @Get('tickets')
    @ApiOperation({ summary: 'Get all tickets (admin)' })
    getAllTickets(
        @Query('status') status?: any,
        @Query('tenantId') tenantId?: string,
        @Query('page') page = 1,
        @Query('limit') limit = 30,
    ) {
        return this.supportService.getAllTickets({ status, tenantId, page: +page, limit: +limit });
    }

    @Get('tickets/:id')
    @ApiOperation({ summary: 'Get ticket details (admin)' })
    getTicket(@Param('id') id: string) {
        return this.supportService.getTicket(id, undefined, true);
    }

    @Post('tickets/:id/messages')
    @HttpCode(HttpStatus.CREATED)
    @UseInterceptors(FilesInterceptor('attachments', 5, { storage: memoryStorage(), limits: { fileSize: MAX_FILE_SIZE } }))
    @ApiOperation({ summary: 'Agent replies to a ticket' })
    async agentReply(
        @Req() req: any,
        @Param('id') id: string,
        @Body('content') content: string,
        @UploadedFiles() files?: Express.Multer.File[],
    ) {
        const attachments = await Promise.all((files || []).map(f => this.supportService.saveAttachment(f, id)));
        const message = await this.supportService.sendMessage({
            ticketId: id,
            senderId: req.user.sub,
            senderName: req.user.name || 'Support Agent',
            senderRole: 'agent',
            content: content?.trim() || '',
            attachments,
        });
        try { this.gateway.server?.to(`ticket:${id}`).emit('new_message', message); } catch { }
        return message;
    }

    @Patch('tickets/:id/status')
    @ApiOperation({ summary: 'Update ticket status' })
    updateStatus(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateStatusDto) {
        return this.supportService.updateStatus(id, dto.status as any, req.user.sub, req.user.name);
    }
}
