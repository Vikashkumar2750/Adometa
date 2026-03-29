import {
    Injectable, Logger, NotFoundException, ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SupportTicket, SupportMessage, TicketStatus } from './entities/support.entities';
import { EmailService } from '../email/email.service';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class SupportService {
    private readonly logger = new Logger(SupportService.name);

    constructor(
        @InjectRepository(SupportTicket) private ticketRepo: Repository<SupportTicket>,
        @InjectRepository(SupportMessage) private messageRepo: Repository<SupportMessage>,
        private emailService: EmailService,
        private config: ConfigService,
    ) { }

    // ─── Create Ticket ─────────────────────────────────────────────────────────
    async createTicket(dto: {
        tenantId: string;
        userId: string;
        userName: string;
        userEmail: string;
        subject: string;
        message: string;
        priority?: string;
    }): Promise<SupportTicket> {
        const ticket = this.ticketRepo.create({
            tenant_id: dto.tenantId,
            user_id: dto.userId,
            user_name: dto.userName,
            user_email: dto.userEmail,
            subject: dto.subject,
            first_message: dto.message,
            status: 'open',
            priority: (dto.priority as any) || 'normal',
            message_count: 1,
            last_message_at: new Date(),
        });
        const saved = await this.ticketRepo.save(ticket);

        // Create the first message record
        await this.messageRepo.save(this.messageRepo.create({
            ticket_id: saved.id,
            sender_id: dto.userId,
            sender_name: dto.userName,
            sender_role: 'user',
            content: dto.message,
            is_read: false,
        }));

        // Send confirmation email to user
        this.emailService.sendSupportTicketConfirmation(
            dto.userEmail,
            dto.userName,
            saved.id,
            dto.subject,
        ).catch(() => { });

        return saved;
    }

    // ─── Get Tickets (client view) ─────────────────────────────────────────────
    async getMyTickets(tenantId: string, userId: string, page = 1, limit = 20) {
        const [data, total] = await this.ticketRepo.findAndCount({
            where: { tenant_id: tenantId, user_id: userId },
            order: { last_message_at: 'DESC' },
            skip: (page - 1) * limit,
            take: limit,
        });
        return { data, total, page, limit };
    }

    // ─── Get All Tickets (admin view) ──────────────────────────────────────────
    async getAllTickets(filters: {
        status?: TicketStatus;
        tenantId?: string;
        page?: number;
        limit?: number;
    }) {
        const qb = this.ticketRepo.createQueryBuilder('t')
            .orderBy('t.last_message_at', 'DESC');
        if (filters.status) qb.andWhere('t.status = :status', { status: filters.status });
        if (filters.tenantId) qb.andWhere('t.tenant_id = :tid', { tid: filters.tenantId });
        const page = filters.page || 1;
        const limit = filters.limit || 30;
        qb.skip((page - 1) * limit).take(limit);
        const [data, total] = await qb.getManyAndCount();
        return { data, total, page, limit };
    }

    // ─── Get Single Ticket with Messages ───────────────────────────────────────
    async getTicket(ticketId: string, requesterId?: string, isAdmin = false): Promise<{ ticket: SupportTicket; messages: SupportMessage[] }> {
        const ticket = await this.ticketRepo.findOne({ where: { id: ticketId } });
        if (!ticket) throw new NotFoundException('Ticket not found');
        if (!isAdmin && ticket.user_id !== requesterId) throw new ForbiddenException('Access denied');

        const messages = await this.messageRepo.find({
            where: { ticket_id: ticketId },
            order: { created_at: 'ASC' },
        });
        return { ticket, messages };
    }

    // ─── Send Message ───────────────────────────────────────────────────────────
    async sendMessage(dto: {
        ticketId: string;
        senderId: string;
        senderName: string;
        senderRole: 'user' | 'agent';
        content: string;
        attachments?: { filename: string; url: string; mime: string; size: number }[];
    }): Promise<SupportMessage> {
        const ticket = await this.ticketRepo.findOne({ where: { id: dto.ticketId } });
        if (!ticket) throw new NotFoundException('Ticket not found');
        if (ticket.status === 'closed') throw new ForbiddenException('Ticket is closed');

        const message = await this.messageRepo.save(this.messageRepo.create({
            ticket_id: dto.ticketId,
            sender_id: dto.senderId,
            sender_name: dto.senderName,
            sender_role: dto.senderRole,
            content: dto.content,
            attachments: dto.attachments || null,
            is_read: false,
        }));

        // Update ticket stats
        const updates: Partial<SupportTicket> = {
            message_count: ticket.message_count + 1,
            last_message_at: new Date(),
        };
        if (dto.senderRole === 'agent') {
            updates.status = 'in_progress';
            if (!ticket.first_reply_at) updates.first_reply_at = new Date();
        } else {
            // User replied — re-open if waiting
            if (ticket.status === 'waiting_user') updates.status = 'in_progress';
        }
        await this.ticketRepo.update(ticket.id, updates);

        return message;
    }

    // ─── Mark Messages as Read ─────────────────────────────────────────────────
    async markRead(ticketId: string, readerRole: 'user' | 'agent') {
        // Mark all messages from the other role as read
        const senderRole = readerRole === 'agent' ? 'user' : 'agent';
        await this.messageRepo.update(
            { ticket_id: ticketId, sender_role: senderRole as any, is_read: false },
            { is_read: true, read_at: new Date() },
        );
    }

    // ─── Update Ticket Status ──────────────────────────────────────────────────
    async updateStatus(ticketId: string, status: TicketStatus, agentId?: string, agentName?: string) {
        const updates: Partial<SupportTicket> = { status };
        if (status === 'resolved') updates.resolved_at = new Date();
        if (agentId) { updates.assigned_to = agentId; updates.assigned_name = agentName; }
        await this.ticketRepo.update(ticketId, updates);
        return this.ticketRepo.findOne({ where: { id: ticketId } });
    }

    // ─── Save Uploaded Attachment ──────────────────────────────────────────────
    async saveAttachment(file: Express.Multer.File, ticketId: string): Promise<{ url: string; filename: string; mime: string; size: number }> {
        const uploadDir = path.join(process.cwd(), 'uploads', 'support');
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

        const ext = path.extname(file.originalname);
        const fname = `${ticketId}_${Date.now()}${ext}`;
        const dest = path.join(uploadDir, fname);
        fs.writeFileSync(dest, file.buffer);

        return {
            url: `/uploads/support/${fname}`,
            filename: file.originalname,
            mime: file.mimetype,
            size: file.size,
        };
    }

    // ─── Admin Stats ───────────────────────────────────────────────────────────
    async getStats() {
        const [total, open, inProgress, resolved] = await Promise.all([
            this.ticketRepo.count(),
            this.ticketRepo.count({ where: { status: 'open' } }),
            this.ticketRepo.count({ where: { status: 'in_progress' } }),
            this.ticketRepo.count({ where: { status: 'resolved' } }),
        ]);
        return { total, open, inProgress, resolved, closed: total - open - inProgress - resolved };
    }

    // ─── CRON: 5-Minute Unread Alert ──────────────────────────────────────────
    @Cron(CronExpression.EVERY_MINUTE)
    async checkUnreadTickets() {
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        const adminEmail = this.config.get<string>('SUPER_ADMIN_EMAIL') || 'admin@techaasvik.com';
        const frontendUrl = this.config.get<string>('FRONTEND_URL') || 'http://localhost:3000';

        // Find open tickets older than 5 min without agent reply and alert not sent
        const unattended = await this.ticketRepo
            .createQueryBuilder('t')
            .where('t.status = :s', { s: 'open' })
            .andWhere('t.first_reply_at IS NULL')
            .andWhere('t.alert_sent = false')
            .andWhere('t.created_at < :cutoff', { cutoff: fiveMinutesAgo })
            .getMany();

        for (const ticket of unattended) {
            try {
                await this.emailService.sendSupportAlert(adminEmail, {
                    id: ticket.id,
                    title: ticket.subject,
                    from: `${ticket.user_name} <${ticket.user_email}>`,
                    tenantName: ticket.tenant_id, // Could join tenant name
                    createdAt: ticket.created_at,
                    url: `${frontendUrl}/admin/support?ticket=${ticket.id}`,
                });
                await this.ticketRepo.update(ticket.id, { alert_sent: true });
                this.logger.warn(`📧 5-min alert sent for ticket ${ticket.id}`);
            } catch (err) {
                this.logger.error(`Failed to send alert for ticket ${ticket.id}: ${err.message}`);
            }
        }
    }
}
