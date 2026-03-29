import {
    WebSocketGateway, WebSocketServer, SubscribeMessage,
    MessageBody, ConnectedSocket, OnGatewayConnection,
    OnGatewayDisconnect, WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { SupportService } from './support.service';

@WebSocketGateway({
    namespace: '/support',
    cors: { origin: '*', credentials: true },
})
export class SupportGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer() server: Server;
    private readonly logger = new Logger(SupportGateway.name);

    // Map: userId → socket.id (for direct user push)
    private userSockets = new Map<string, string>();

    constructor(
        private supportService: SupportService,
        private jwtService: JwtService,
        private config: ConfigService,
    ) { }

    async handleConnection(socket: Socket) {
        try {
            const token = (socket.handshake.auth?.token || socket.handshake.headers?.authorization)
                ?.replace('Bearer ', '');
            if (!token) throw new WsException('No token');

            const payload = this.jwtService.verify(token, {
                secret: this.config.get('JWT_SECRET'),
            });
            (socket as any).user = payload;
            this.userSockets.set(payload.sub, socket.id);
            this.logger.log(`🔌 Support WS connected: ${payload.email}`);
        } catch {
            socket.disconnect();
        }
    }

    handleDisconnect(socket: Socket) {
        const user = (socket as any).user;
        if (user) this.userSockets.delete(user.sub);
        this.logger.log(`🔌 Support WS disconnected: ${socket.id}`);
    }

    // ─── CLIENT: Join a ticket room ─────────────────────────────────────────
    @SubscribeMessage('join_ticket')
    async joinTicket(@ConnectedSocket() socket: Socket, @MessageBody() data: { ticketId: string }) {
        const user = (socket as any).user;
        socket.join(`ticket:${data.ticketId}`);
        // Mark messages as read when joining
        const role = user?.role === 'SUPER_ADMIN' || user?.role === 'SUPPORT_ADMIN' ? 'agent' : 'user';
        await this.supportService.markRead(data.ticketId, role);
        socket.emit('joined', { ticketId: data.ticketId });
    }

    // ─── CLIENT: Send a message ─────────────────────────────────────────────
    @SubscribeMessage('send_message')
    async handleMessage(
        @ConnectedSocket() socket: Socket,
        @MessageBody() data: { ticketId: string; content: string; attachments?: any[] },
    ) {
        const user = (socket as any).user;
        if (!user) return;

        const isAgent = ['SUPER_ADMIN', 'SUPPORT_ADMIN'].includes(user.role);
        const message = await this.supportService.sendMessage({
            ticketId: data.ticketId,
            senderId: user.sub,
            senderName: user.name || user.email,
            senderRole: isAgent ? 'agent' : 'user',
            content: data.content,
            attachments: data.attachments,
        });

        // Broadcast to the ticket room (both user and agents)
        this.server.to(`ticket:${data.ticketId}`).emit('new_message', message);

        // Also notify if the other party isn't in the room
        return message;
    }

    // ─── CLIENT: Mark as read ──────────────────────────────────────────────
    @SubscribeMessage('mark_read')
    async handleMarkRead(@ConnectedSocket() socket: Socket, @MessageBody() data: { ticketId: string }) {
        const user = (socket as any).user;
        if (!user) return;
        const role = ['SUPER_ADMIN', 'SUPPORT_ADMIN'].includes(user.role) ? 'agent' : 'user';
        await this.supportService.markRead(data.ticketId, role);
        this.server.to(`ticket:${data.ticketId}`).emit('messages_read', { ticketId: data.ticketId, role });
    }

    // ─── CLIENT: Typing indicator ──────────────────────────────────────────
    @SubscribeMessage('typing')
    handleTyping(@ConnectedSocket() socket: Socket, @MessageBody() data: { ticketId: string; isTyping: boolean }) {
        const user = (socket as any).user;
        socket.to(`ticket:${data.ticketId}`).emit('typing', {
            userId: user?.sub,
            name: user?.name,
            isTyping: data.isTyping,
        });
    }

    // ─── SERVER-side push: broadcast new ticket to admins ──────────────────
    notifyAdmins(event: string, data: any) {
        this.server.emit(event, data);
    }
}
