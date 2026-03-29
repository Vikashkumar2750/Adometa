import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

export interface EmailOptions {
    to: string | string[];
    subject: string;
    html: string;
    text?: string;
    attachments?: { filename: string; content: Buffer | string; contentType?: string }[];
    replyTo?: string;
}

@Injectable()
export class EmailService {
    private readonly logger = new Logger(EmailService.name);
    private transporter: Transporter;
    private fromAddress: string;
    private fromName: string;
    private enabled: boolean;

    constructor(private config: ConfigService) {
        const host = config.get<string>('SMTP_HOST');
        const port = config.get<number>('SMTP_PORT') || 587;
        const user = config.get<string>('SMTP_USER');
        const pass = config.get<string>('SMTP_PASS');
        this.fromAddress = config.get<string>('SMTP_FROM') || user || 'noreply@techaasvik.in';
        this.fromName = config.get<string>('SMTP_FROM_NAME') || 'Techaasvik';
        this.enabled = !!(host && user && pass);

        if (this.enabled) {
            this.transporter = nodemailer.createTransport({
                host,
                port,
                secure: port === 465,
                auth: { user, pass },
                tls: { rejectUnauthorized: false },
            });
            this.logger.log(`✅ Email service ready (${host}:${port})`);
        } else {
            this.logger.warn('⚠️  Email service DISABLED — set SMTP_HOST/SMTP_USER/SMTP_PASS in .env');
        }
    }

    async send(opts: EmailOptions): Promise<boolean> {
        if (!this.enabled) {
            this.logger.warn(`Email skipped (no SMTP config): ${opts.subject} → ${opts.to}`);
            return false;
        }
        try {
            await this.transporter.sendMail({
                from: `"${this.fromName}" <${this.fromAddress}>`,
                to: Array.isArray(opts.to) ? opts.to.join(', ') : opts.to,
                subject: opts.subject,
                html: opts.html,
                text: opts.text || this.stripHtml(opts.html),
                attachments: opts.attachments,
                replyTo: opts.replyTo,
            });
            this.logger.log(`📧 Email sent: "${opts.subject}" → ${opts.to}`);
            return true;
        } catch (err) {
            this.logger.error(`❌ Email failed: ${err.message}`, err.stack);
            return false;
        }
    }

    // ─── Templated Email Methods ──────────────────────────────────────────────

    async sendPasswordReset(to: string, name: string, token: string, frontendUrl: string) {
        const resetUrl = `${frontendUrl}/reset-password?token=${token}`;
        return this.send({
            to,
            subject: '🔐 Reset Your Techaasvik Password',
            html: this.baseTemplate(`
                <h2>Password Reset Request</h2>
                <p>Hi <strong>${name}</strong>,</p>
                <p>We received a request to reset your password. Click the button below to set a new password:</p>
                <div style="text-align:center;margin:32px 0;">
                    <a href="${resetUrl}" style="background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;padding:14px 32px;border-radius:12px;font-size:16px;font-weight:600;text-decoration:none;display:inline-block;">
                        Reset Password
                    </a>
                </div>
                <p style="color:#6b7280;font-size:13px;">This link expires in <strong>1 hour</strong>. If you didn't request this, please ignore this email.</p>
                <p style="color:#6b7280;font-size:13px;">Or copy this URL: <a href="${resetUrl}" style="color:#6366f1;">${resetUrl}</a></p>
            `),
        });
    }

    async sendWelcome(to: string, name: string, frontendUrl: string) {
        return this.send({
            to,
            subject: '🎉 Welcome to Techaasvik — Your WhatsApp SaaS Platform',
            html: this.baseTemplate(`
                <h2>Welcome, ${name}! 🚀</h2>
                <p>Your account has been created and approved. You can now start using the platform.</p>
                <div style="text-align:center;margin:32px 0;">
                    <a href="${frontendUrl}/dashboard" style="background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;padding:14px 32px;border-radius:12px;font-size:16px;font-weight:600;text-decoration:none;display:inline-block;">
                        Go to Dashboard
                    </a>
                </div>
                <p>Here's what you can do:</p>
                <ul>
                    <li>📱 Connect your WhatsApp Business Account</li>
                    <li>📇 Import your contacts</li>
                    <li>📣 Launch your first campaign</li>
                    <li>📊 Track delivery &amp; analytics</li>
                </ul>
            `),
        });
    }

    async sendTeamInvite(to: string, inviterName: string, tenantName: string, token: string, role: string, frontendUrl: string) {
        const inviteUrl = `${frontendUrl}/accept-invite?token=${token}`;
        return this.send({
            to,
            subject: `📨 You've been invited to join ${tenantName} on Techaasvik`,
            html: this.baseTemplate(`
                <h2>You've been invited!</h2>
                <p><strong>${inviterName}</strong> has invited you to join <strong>${tenantName}</strong> on Techaasvik as a <strong>${role}</strong>.</p>
                <div style="text-align:center;margin:32px 0;">
                    <a href="${inviteUrl}" style="background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;padding:14px 32px;border-radius:12px;font-size:16px;font-weight:600;text-decoration:none;display:inline-block;">
                        Accept Invitation
                    </a>
                </div>
                <p style="color:#6b7280;font-size:13px;">This invite expires in 48 hours.</p>
            `),
        });
    }

    async sendLowBalanceAlert(to: string, tenantName: string, balance: number, currency: string, frontendUrl: string) {
        return this.send({
            to,
            subject: `⚠️ Low Wallet Balance — ${tenantName}`,
            html: this.baseTemplate(`
                <h2>⚠️ Low Balance Alert</h2>
                <p>Hi, your Techaasvik wallet balance is running low.</p>
                <div style="background:#fef3c7;border-left:4px solid #f59e0b;padding:16px;border-radius:8px;margin:20px 0;">
                    <strong>Current Balance: ${currency} ${balance.toFixed(2)}</strong>
                </div>
                <p>Top up now to keep your campaigns running without interruption.</p>
                <div style="text-align:center;margin:24px 0;">
                    <a href="${frontendUrl}/dashboard/billing" style="background:linear-gradient(135deg,#f59e0b,#ef4444);color:#fff;padding:14px 32px;border-radius:12px;font-size:16px;font-weight:600;text-decoration:none;display:inline-block;">
                        Top Up Wallet
                    </a>
                </div>
            `),
        });
    }

    async sendSupportAlert(to: string, ticket: {
        id: string; title: string; from: string;
        tenantName: string; createdAt: Date; url: string;
    }): Promise<boolean> {
        const ageMinutes = Math.floor((Date.now() - new Date(ticket.createdAt).getTime()) / 60000);
        return this.send({
            to,
            subject: `⚠️ Unattended support ticket [${ticket.id.slice(0, 8)}] — ${ageMinutes}min old`,
            html: this.baseTemplate(`
                <h2>⏰ Support Ticket Needs Attention</h2>
                <p>A support ticket has been open for <strong>${ageMinutes} minutes</strong> without an agent response.</p>
                <div style="background:#fee2e2;border-left:4px solid #ef4444;padding:16px;border-radius:8px;margin:20px 0;">
                    <strong>Ticket:</strong> ${ticket.title}<br/>
                    <strong>From:</strong> ${ticket.from} (${ticket.tenantName})<br/>
                    <strong>Opened:</strong> ${ticket.createdAt.toLocaleString()}<br/>
                    <strong>ID:</strong> ${ticket.id}
                </div>
                <div style="text-align:center;margin:24px 0;">
                    <a href="${ticket.url}" style="background:linear-gradient(135deg,#ef4444,#dc2626);color:#fff;padding:14px 32px;border-radius:12px;font-size:16px;font-weight:600;text-decoration:none;display:inline-block;">
                        Open Ticket Now
                    </a>
                </div>
            `),
        });
    }

    async sendSupportTicketConfirmation(to: string, name: string, ticketId: string, subject: string): Promise<boolean> {
        return this.send({
            to,
            subject: `✅ Support Ticket Received — #${ticketId.slice(0, 8)}`,
            html: this.baseTemplate(`
                <h2>We received your support request</h2>
                <p>Hi <strong>${name}</strong>,</p>
                <p>Your support ticket has been created:</p>
                <div style="background:#f0fdf4;border-left:4px solid #22c55e;padding:16px;border-radius:8px;margin:20px 0;">
                    <strong>Subject:</strong> ${subject}<br/>
                    <strong>Ticket ID:</strong> #${ticketId.slice(0, 8)}<br/>
                    <strong>Status:</strong> Open — Our team will respond shortly
                </div>
                <p>You can track your ticket status from your dashboard → Support.</p>
                <p style="color:#6b7280;font-size:13px;">Average response time: under 2 hours during business hours.</p>
            `),
        });
    }



    // ─── HTML Base Template ────────────────────────────────────────────────────
    private baseTemplate(body: string): string {
        return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Techaasvik</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,.07);">
        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:32px;text-align:center;">
          <h1 style="margin:0;color:#fff;font-size:24px;font-weight:700;letter-spacing:-0.5px;">✦ Techaasvik</h1>
          <p style="margin:4px 0 0;color:rgba(255,255,255,0.8);font-size:13px;">WhatsApp Business SaaS Platform</p>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:40px 40px 32px;color:#1e293b;font-size:15px;line-height:1.7;">
          ${body}
        </td></tr>
        <!-- Footer -->
        <tr><td style="background:#f8fafc;padding:24px 40px;border-top:1px solid #e2e8f0;text-align:center;">
          <p style="margin:0;color:#94a3b8;font-size:12px;">© ${new Date().getFullYear()} Techaasvik. All rights reserved.</p>
          <p style="margin:4px 0 0;color:#94a3b8;font-size:12px;">
            <a href="https://techaasvik.in" style="color:#6366f1;text-decoration:none;">techaasvik.in</a> · 
            <a href="mailto:support@techaasvik.in" style="color:#6366f1;text-decoration:none;">support@techaasvik.in</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
    }

    private stripHtml(html: string): string {
        return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    }

    async sendPasswordResetSuccess(to: string, name: string): Promise<boolean> {
        return this.send({
            to,
            subject: '✅ Your Techaasvik password has been changed',
            html: this.baseTemplate(`
                <h2 style="margin:0 0 16px;color:#0f172a;font-size:22px;font-weight:700;">Password Changed Successfully</h2>
                <p style="margin:0 0 16px;color:#475569;">Hi <strong>${name}</strong>, your account password has been updated successfully.</p>
                <div style="background:#f0fdf4;border-left:4px solid #22c55e;padding:16px;border-radius:8px;margin:20px 0;">
                    <p style="margin:0;color:#166534;font-size:14px;">If you did not make this change, please contact support immediately at <a href="mailto:support@techaasvik.in" style="color:#166534;">support@techaasvik.in</a></p>
                </div>
                <p style="margin:0;color:#94a3b8;font-size:13px;">This is an automated security notification.</p>
            `),
        });
    }

    isEnabled(): boolean { return this.enabled; }
}
