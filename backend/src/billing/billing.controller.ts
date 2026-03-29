import {
    Controller, Get, Post, Patch, Param, Body, Query,
    UseGuards, Request, ParseUUIDPipe,
    Req, Headers,
    BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
    ApiTags, ApiBearerAuth, ApiOperation, ApiResponse,
    ApiQuery, ApiParam,
} from '@nestjs/swagger';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { TenantIsolationGuard } from '../common/guards/tenant-isolation.guard';
import { WalletService } from './wallet.service';
import { InvoiceService } from './invoice.service';
import { PaymentService } from './payment.service';
import { TenantSettingsService } from './tenant-settings.service';
import { WabaMonitorService } from './waba-monitor.service';
import { IsNumber, IsPositive, IsString, IsOptional, IsEnum, IsUUID, Min, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

// ─── DTOs ─────────────────────────────────────────────────────────────────────
class CreditWalletDto {
    @ApiProperty() @IsNumber() @IsPositive() amount: number;
    @ApiProperty() @IsString() description: string;
    @IsOptional() @IsUUID() referenceId?: string;
}

class UpdateSettingsDto {
    @IsOptional() @IsNumber() @Min(1) max_api_rpm?: number;
    @IsOptional() @IsNumber() @Min(1) max_campaigns_per_day?: number;
    @IsOptional() @IsNumber() @Min(1) max_broadcast_size?: number;
    @IsOptional() @IsNumber() @IsPositive() cost_per_message?: number;
    @IsOptional() @IsNumber() @Min(1) max_team_members?: number;
}

class NotifPrefsDto {
    @IsOptional() @IsBoolean() campaignComplete?: boolean;
    @IsOptional() @IsBoolean() deliveryFailures?: boolean;
    @IsOptional() @IsBoolean() newContacts?: boolean;
    @IsOptional() @IsBoolean() weeklyReport?: boolean;
    @IsOptional() @IsBoolean() securityAlerts?: boolean;
}

class TopupOrderDto {
    @ApiProperty() @IsNumber() @IsPositive() amount: number; // INR rupees
    @ApiProperty() @IsString() description: string;
}

class TopupVerifyDto {
    @IsString() razorpay_order_id: string;
    @IsString() razorpay_payment_id: string;
    @IsString() razorpay_signature: string;
    @IsNumber() amount: number;
}

class WalletCreditRequestDto {
    @ApiProperty() @IsNumber() @IsPositive() amount: number;
    @ApiProperty() @IsString() note: string;
}

class SetEnabledDto {
    @ApiProperty() enabled: boolean;
    @IsOptional() @IsString() reason?: string;
}

class RazorpayVerifyDto {
    @IsString() razorpay_order_id: string;
    @IsString() razorpay_payment_id: string;
    @IsString() razorpay_signature: string;
    @IsUUID() invoice_id: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// CLIENT: Billing endpoints (tenant-isolated)
// ─────────────────────────────────────────────────────────────────────────────
@ApiTags('Client - Billing')
@ApiBearerAuth()
@Controller('billing')
@UseGuards(AuthGuard('jwt'), TenantIsolationGuard, RolesGuard)
@Roles('TENANT_ADMIN', 'TENANT_MARKETER', 'TENANT_DEVELOPER', 'READ_ONLY')
export class BillingController {
    constructor(
        private walletService: WalletService,
        private invoiceService: InvoiceService,
        private paymentService: PaymentService,
        private tenantSettingsService: TenantSettingsService,
    ) { }

    @Get('wallet')
    @ApiOperation({ summary: 'Get wallet balance for current tenant' })
    async getWallet(@TenantId() tenantId: string) {
        return this.walletService.getBalance(tenantId);
    }

    @Get('transactions')
    @ApiOperation({ summary: 'Get transaction history' })
    @ApiQuery({ name: 'page', required: false })
    @ApiQuery({ name: 'limit', required: false })
    @ApiQuery({ name: 'type', required: false, enum: ['CREDIT', 'DEBIT'] })
    async getTransactions(
        @TenantId() tenantId: string,
        @Query('page') page = 1,
        @Query('limit') limit = 20,
        @Query('type') type?: 'CREDIT' | 'DEBIT',
    ) {
        return this.walletService.getTransactions(tenantId, +page, +limit, type);
    }

    @Get('invoices')
    @ApiOperation({ summary: 'Get invoices for current tenant' })
    async getInvoices(
        @TenantId() tenantId: string,
        @Query('page') page = 1,
        @Query('limit') limit = 20,
    ) {
        return this.invoiceService.getTenantInvoices(tenantId, +page, +limit);
    }

    @Get('invoices/:id')
    @ApiOperation({ summary: 'Get single invoice' })
    async getInvoice(
        @TenantId() tenantId: string,
        @Param('id', ParseUUIDPipe) id: string,
    ) {
        return this.invoiceService.findOne(id, tenantId);
    }

    @Get('notifications')
    @ApiOperation({ summary: 'Get billing notification flags for dashboard banner' })
    async getNotifications(@TenantId() tenantId: string) {
        const [invoiceFlags, balance] = await Promise.all([
            this.invoiceService.getNotificationFlags(tenantId),
            this.walletService.getBalance(tenantId),
        ]);
        return {
            ...invoiceFlags,
            isLowBalance: balance.isLow,
            balance: balance.balance,
            currency: balance.currency,
        };
    }

    @Get('notification-prefs')
    @ApiOperation({ summary: 'Get notification preferences for the current tenant' })
    async getNotifPrefs(@TenantId() tenantId: string) {
        const s = await this.tenantSettingsService.getOrCreate(tenantId);
        return s.notification_prefs ?? {
            campaignComplete: true,
            deliveryFailures: true,
            newContacts: false,
            weeklyReport: true,
            securityAlerts: true,
        };
    }

    @Patch('notification-prefs')
    @ApiOperation({ summary: 'Save notification preferences for the current tenant' })
    async saveNotifPrefs(@TenantId() tenantId: string, @Body() dto: NotifPrefsDto) {
        return this.tenantSettingsService.updateNotificationPrefs(tenantId, dto as Record<string, boolean>);
    }


    // Payment — Razorpay
    @Post('invoices/:id/pay/razorpay')
    @ApiOperation({ summary: 'Create Razorpay order for invoice' })
    async payRazorpay(
        @TenantId() tenantId: string,
        @Param('id', ParseUUIDPipe) id: string,
    ) {
        return this.paymentService.createRazorpayOrder(id, tenantId);
    }

    @Post('invoices/pay/razorpay/verify')
    @ApiOperation({ summary: 'Verify Razorpay payment signature' })
    async verifyRazorpay(
        @TenantId() tenantId: string,
        @Body() dto: RazorpayVerifyDto,
    ) {
        return this.paymentService.verifyRazorpayPayment({
            ...dto,
            invoiceId: dto.invoice_id,
            tenantId,
        });
    }

    // Payment — PayPal
    @Post('invoices/:id/pay/paypal')
    @ApiOperation({ summary: 'Create PayPal order for invoice' })
    async payPaypal(
        @TenantId() tenantId: string,
        @Param('id', ParseUUIDPipe) id: string,
    ) {
        return this.paymentService.createPaypalOrder(id, tenantId);
    }

    @Post('pay/paypal/capture')
    @ApiOperation({ summary: 'Capture PayPal payment after redirect' })
    async capturePaypal(
        @TenantId() tenantId: string,
        @Body('order_id') orderId: string,
    ) {
        if (!orderId) throw new BadRequestException('order_id is required');
        return this.paymentService.capturePaypalOrder(orderId, tenantId);
    }

    // ── Wallet Top-up via Razorpay ────────────────────────────────────────────
    @Post('wallet/topup/razorpay')
    @Roles('TENANT_ADMIN')
    @ApiOperation({ summary: 'Create Razorpay order to top-up wallet' })
    async createWalletTopupOrder(
        @TenantId() tenantId: string,
        @Body() dto: TopupOrderDto,
    ) {
        return this.paymentService.createWalletTopupOrder(tenantId, dto.amount, dto.description);
    }

    @Post('wallet/topup/razorpay/verify')
    @Roles('TENANT_ADMIN')
    @ApiOperation({ summary: 'Verify Razorpay wallet top-up and credit wallet' })
    async verifyWalletTopup(
        @TenantId() tenantId: string,
        @Body() dto: TopupVerifyDto,
        @Request() req: any,
    ) {
        return this.paymentService.verifyAndCreditWallet(tenantId, dto, req.user?.id);
    }

    // ── Credit Request to Super Admin ─────────────────────────────────────────
    @Post('wallet/credit-request')
    @Roles('TENANT_ADMIN')
    @ApiOperation({ summary: 'Raise a credit request to super admin' })
    async raiseCreditRequest(
        @TenantId() tenantId: string,
        @Body() dto: WalletCreditRequestDto,
        @Request() req: any,
    ) {
        // Store as a pending CREDIT transaction with status PENDING
        return this.walletService.raiseCreditRequest({
            tenantId,
            amount: dto.amount,
            note: dto.note,
            requestedBy: req.user?.id,
            requesterEmail: req.user?.email,
        });
    }

    // ── Tenant settings (read-only for client) ────────────────────────────────
    @Get('settings')
    @ApiOperation({ summary: 'Get tenant billing settings (max team members, rate limits)' })
    async getMySettings(@TenantId() tenantId: string) {
        return this.tenantSettingsService.getOrCreate(tenantId);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN: Billing controls (SUPER_ADMIN only, no tenant isolation)
// ─────────────────────────────────────────────────────────────────────────────
@ApiTags('Admin - Billing')
@ApiBearerAuth()
@Controller('admin/billing')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('SUPER_ADMIN')
export class AdminBillingController {
    constructor(
        private walletService: WalletService,
        private invoiceService: InvoiceService,
        private tenantSettingsService: TenantSettingsService,
        private wabaMonitorService: WabaMonitorService,
    ) { }

    // ── Wallet Management ────────────────────────────────────────────────────

    @Get('wallets')
    @ApiOperation({ summary: 'All tenant wallets with balances' })
    async getAllWallets() {
        return this.walletService.getAdminWalletSummary();
    }

    @Get('wallets/:tenantId')
    @ApiOperation({ summary: 'Get wallet for specific tenant' })
    async getTenantWallet(@Param('tenantId', ParseUUIDPipe) tenantId: string) {
        return this.walletService.getBalance(tenantId);
    }

    @Post('wallets/:tenantId/credit')
    @ApiOperation({ summary: 'Manually credit a tenant wallet' })
    async creditWallet(
        @Param('tenantId', ParseUUIDPipe) tenantId: string,
        @Body() dto: CreditWalletDto,
        @Request() req: any,
    ) {
        return this.walletService.credit({
            tenantId,
            amount: dto.amount,
            description: dto.description,
            referenceType: 'MANUAL',
            referenceId: dto.referenceId,
            createdBy: req.user?.id,
        });
    }

    @Get('credit-requests')
    @ApiOperation({ summary: 'Get all pending wallet credit requests from tenants' })
    async getCreditRequests(@Query('status') status?: string) {
        return this.walletService.getCreditRequests(status);
    }

    @Post('credit-requests/:id/approve')
    @ApiOperation({ summary: 'Approve and credit a wallet request' })
    async approveCreditRequest(
        @Param('id', ParseUUIDPipe) id: string,
        @Request() req: any,
    ) {
        return this.walletService.approveCreditRequest(id, req.user?.id);
    }

    @Post('credit-requests/:id/reject')
    @ApiOperation({ summary: 'Reject a wallet credit request' })
    async rejectCreditRequest(
        @Param('id', ParseUUIDPipe) id: string,
        @Body('reason') reason: string,
    ) {
        return this.walletService.rejectCreditRequest(id, reason);
    }

    @Get('wallets/:tenantId/transactions')
    @ApiOperation({ summary: 'Get transaction history for tenant' })
    async getTenantTransactions(
        @Param('tenantId', ParseUUIDPipe) tenantId: string,
        @Query('page') page = 1,
        @Query('limit') limit = 50,
    ) {
        return this.walletService.getTransactions(tenantId, +page, +limit);
    }

    // ── Invoice Management ───────────────────────────────────────────────────

    @Get('invoices')
    @ApiOperation({ summary: 'All invoices across tenants' })
    @ApiQuery({ name: 'status', required: false })
    @ApiQuery({ name: 'tenantId', required: false })
    @ApiQuery({ name: 'page', required: false })
    async getInvoices(
        @Query('page') page = 1,
        @Query('limit') limit = 50,
        @Query('status') status?: string,
        @Query('tenantId') tenantId?: string,
    ) {
        return this.invoiceService.getAdminInvoices(+page, +limit, status, tenantId);
    }

    @Post('invoices/:id/cancel')
    @ApiOperation({ summary: 'Cancel a pending invoice' })
    async cancelInvoice(@Param('id', ParseUUIDPipe) id: string) {
        return this.invoiceService.cancelInvoice(id);
    }

    @Post('invoices/dpd/update')
    @ApiOperation({ summary: 'Run DPD status update (also runs via cron)' })
    async runDpdUpdate() {
        const count = await this.invoiceService.updateDpdStatuses();
        return { updated: count, message: `${count} invoices marked DPD` };
    }

    // ── Tenant Settings (Rate Limits) ────────────────────────────────────────

    @Get('settings/:tenantId')
    @ApiOperation({ summary: 'Get rate limit settings for tenant' })
    async getSettings(@Param('tenantId', ParseUUIDPipe) tenantId: string) {
        return this.tenantSettingsService.getOrCreate(tenantId);
    }

    @Patch('settings/:tenantId')
    @ApiOperation({ summary: 'Update rate limit settings for tenant' })
    async updateSettings(
        @Param('tenantId', ParseUUIDPipe) tenantId: string,
        @Body() dto: UpdateSettingsDto,
        @Request() req: any,
    ) {
        return this.tenantSettingsService.updateSettings(tenantId, dto, req.user?.id);
    }

    @Post('settings/:tenantId/enable')
    @ApiOperation({ summary: 'Enable or disable a tenant' })
    async setEnabled(
        @Param('tenantId', ParseUUIDPipe) tenantId: string,
        @Body() dto: SetEnabledDto,
        @Request() req: any,
    ) {
        return this.tenantSettingsService.setEnabled(tenantId, dto.enabled, dto.reason, req.user?.id);
    }

    @Get('settings')
    @ApiOperation({ summary: 'All tenant settings' })
    async getAllSettings() {
        return this.tenantSettingsService.getAll();
    }

    // ── WABA Monitoring ──────────────────────────────────────────────────────

    @Get('waba/connections')
    @ApiOperation({ summary: 'All tenant WABA connections (masked tokens only)' })
    @ApiQuery({ name: 'status', required: false })
    @ApiQuery({ name: 'page', required: false })
    async getConnections(@Query('page') page = 1, @Query('limit') limit = 50, @Query('status') status?: string) {
        return this.wabaMonitorService.getAllConnections(+page, +limit, status);
    }

    @Get('waba/connections/:tenantId')
    @ApiOperation({ summary: 'WABA connection for specific tenant (masked token)' })
    async getConnection(@Param('tenantId', ParseUUIDPipe) tenantId: string) {
        return this.wabaMonitorService.getConnection(tenantId);
    }

    @Get('waba/summary')
    @ApiOperation({ summary: 'WABA monitoring summary stats' })
    async getMonitoringSummary() {
        return this.wabaMonitorService.getMonitoringSummary();
    }

    // ── Revenue & Analytics ──────────────────────────────────────────────────

    @Get('revenue')
    @ApiOperation({ summary: 'Platform-wide revenue & analytics summary' })
    @ApiQuery({ name: 'period', required: false, enum: ['week', 'month', 'quarter', 'year'] })
    async getRevenue(@Query('period') period: string = 'month') {
        // Period window
        const now = new Date();
        const periodStart = new Date(now);
        if (period === 'week') periodStart.setDate(now.getDate() - 7);
        else if (period === 'month') periodStart.setDate(1);
        else if (period === 'quarter') periodStart.setMonth(now.getMonth() - 3);
        else periodStart.setFullYear(now.getFullYear() - 1);

        // Wallets
        const wallets = await this.walletService.getAdminWalletSummary() as any[];
        const totalWalletBalance = wallets.reduce((s: number, w: any) => s + (+w.balance || 0), 0);
        const avgWalletBalance = wallets.length > 0 ? totalWalletBalance / wallets.length : 0;

        // Invoices (with tenant relation)
        const allInvoices = await this.invoiceService.getAdminInvoicesWithTenant(1, 1000) as any;
        const invoiceList: any[] = Array.isArray(allInvoices) ? allInvoices : (allInvoices?.items || []);
        const totalInvoices = invoiceList.length;
        const paidInvoices = invoiceList.filter((i: any) => i.status === 'PAID').length;
        const pendingInvoices = invoiceList.filter((i: any) => i.status === 'PENDING').length;
        const dpdInvoices = invoiceList.filter((i: any) => i.status === 'DPD').length;
        const totalRevenue = invoiceList.filter((i: any) => i.status === 'PAID').reduce((s: number, i: any) => s + (+i.total || 0), 0);
        const periodPaidInvoices = invoiceList.filter((i: any) => i.status === 'PAID' && new Date(i.paid_at || i.updated_at) >= periodStart);
        const periodRevenue = periodPaidInvoices.reduce((s: number, i: any) => s + (+i.total || 0), 0);

        // Weekly sub-period for comparison
        const weekStart = new Date(now); weekStart.setDate(now.getDate() - 7);
        const weeklyRevenue = invoiceList.filter((i: any) => i.status === 'PAID' && new Date(i.paid_at || i.updated_at) >= weekStart).reduce((s: number, i: any) => s + (+i.total || 0), 0);

        // Monthly trend (last 6 months)
        const monthlyTrend: { month: string; revenue: number; invoices: number }[] = [];
        for (let m = 5; m >= 0; m--) {
            const d = new Date(now.getFullYear(), now.getMonth() - m, 1);
            const dEnd = new Date(now.getFullYear(), now.getMonth() - m + 1, 0);
            const label = d.toLocaleString('en-IN', { month: 'short' });
            const monthInvoices = invoiceList.filter((i: any) => {
                const dt = new Date(i.paid_at || i.updated_at);
                return i.status === 'PAID' && dt >= d && dt <= dEnd;
            });
            monthlyTrend.push({ month: label, revenue: monthInvoices.reduce((s: number, i: any) => s + (+i.total || 0), 0), invoices: monthInvoices.length });
        }

        // Recent payments (last 10 paid)
        const recentPayments = invoiceList.filter((i: any) => i.status === 'PAID').sort((a: any, b: any) => new Date(b.paid_at || b.updated_at).getTime() - new Date(a.paid_at || a.updated_at).getTime()).slice(0, 10).map((i: any) => ({
            tenant: i.tenant?.business_name || i.tenant_id || 'Unknown',
            amount: +i.total || 0,
            date: i.paid_at || i.updated_at,
            invoice: i.invoice_number || i.id,
        }));

        // Plan breakdown from wallets joined to tenant
        const planMap: Record<string, { count: number; revenue: number }> = {};
        wallets.forEach((w: any) => {
            const plan = w.tenant?.plan || 'FREE_TRIAL';
            if (!planMap[plan]) planMap[plan] = { count: 0, revenue: 0 };
            planMap[plan].count++;
        });
        invoiceList.filter((i: any) => i.status === 'PAID').forEach((i: any) => {
            const plan = i.tenant?.plan || 'FREE_TRIAL';
            if (!planMap[plan]) planMap[plan] = { count: 0, revenue: 0 };
            planMap[plan].revenue += +i.total || 0;
        });
        const planBreakdown = Object.entries(planMap).map(([plan, v]) => ({ plan: plan.replace('_', ' '), count: v.count, revenue: v.revenue }));

        return {
            totalRevenue,
            monthlyRevenue: period === 'month' ? periodRevenue : periodRevenue,
            weeklyRevenue,
            totalInvoices,
            paidInvoices,
            pendingInvoices,
            dpdInvoices,
            totalTenants: wallets.length,
            activeTenants: wallets.filter((w: any) => w.tenant?.status === 'ACTIVE').length,
            totalWalletBalance,
            avgWalletBalance: Math.round(avgWalletBalance),
            totalMessages: 0,  // Would require campaign/message aggregation
            totalCampaigns: 0,
            planBreakdown,
            recentPayments,
            monthlyTrend,
        };
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// WEBHOOKS: Public endpoints — no auth, but mandatory signature verification
// ─────────────────────────────────────────────────────────────────────────────
@ApiTags('Webhooks - Payments')
@Controller('webhooks')
export class PaymentWebhookController {
    constructor(private paymentService: PaymentService) { }

    @Post('razorpay')
    @ApiOperation({ summary: 'Razorpay payment webhook' })
    async razorpayWebhook(
        @Req() req: any,
        @Headers('x-razorpay-signature') signature: string,
        @Body() payload: any,
    ) {
        const rawBody = req.rawBody?.toString() || JSON.stringify(payload);
        await this.paymentService.handleRazorpayWebhook(rawBody, signature, payload);
        return { status: 'ok' };
    }
}
