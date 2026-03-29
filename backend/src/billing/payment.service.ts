import { Injectable, Logger, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Invoice } from './entities/billing.entities';
import { InvoiceService } from './invoice.service';
import { WalletService } from './wallet.service';
import * as crypto from 'crypto';

/**
 * PaymentService
 *
 * Handles payment gateway integrations. Keys are read ONLY from env vars.
 * Signature verification is mandatory on all webhooks.
 * Raw secrets are never stored in DB.
 */
@Injectable()
export class PaymentService {
    private readonly logger = new Logger(PaymentService.name);

    constructor(
        private config: ConfigService,
        private invoiceService: InvoiceService,
        private walletService: WalletService,
        @InjectRepository(Invoice)
        private invoiceRepo: Repository<Invoice>,
    ) { }

    // ─────────────────────────────────────────────────────────
    // RAZORPAY — Create Order
    // ─────────────────────────────────────────────────────────
    async createRazorpayOrder(invoiceId: string, tenantId: string): Promise<{
        orderId: string;
        amount: number;
        currency: string;
        key_id: string;
    }> {
        const invoice = await this.invoiceService.findOne(invoiceId, tenantId);
        if (invoice.status !== 'PENDING' && invoice.status !== 'DPD') {
            throw new BadRequestException('Invoice is not payable');
        }

        const keyId = this.config.get<string>('RAZORPAY_KEY_ID');
        const keySecret = this.config.get<string>('RAZORPAY_KEY_SECRET');
        if (!keyId || !keySecret) {
            throw new BadRequestException('Razorpay not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET');
        }

        // Razorpay API call
        const Razorpay = require('razorpay');
        const rzp = new Razorpay({ key_id: keyId, key_secret: keySecret });

        const order = await rzp.orders.create({
            amount: Math.round(+invoice.total * 100), // paise
            currency: invoice.currency,
            receipt: invoice.invoice_number,
            notes: {
                tenant_id: tenantId,
                invoice_id: invoiceId,
                invoice_number: invoice.invoice_number,
            },
        });

        // Store gateway order ID
        await this.invoiceRepo.update(invoiceId, {
            payment_gateway_id: order.id,
            payment_gateway: 'razorpay',
            status: 'PROCESSING',
        });

        this.logger.log(`Razorpay order ${order.id} created for invoice ${invoice.invoice_number}`);
        return { orderId: order.id, amount: +invoice.total, currency: invoice.currency, key_id: keyId };
    }

    // ─────────────────────────────────────────────────────────
    // RAZORPAY — Verify Webhook Signature (CRITICAL SECURITY)
    // ─────────────────────────────────────────────────────────
    verifyRazorpayWebhook(rawBody: string, signature: string): boolean {
        const secret = this.config.get<string>('RAZORPAY_WEBHOOK_SECRET');
        if (!secret) throw new UnauthorizedException('RAZORPAY_WEBHOOK_SECRET not set');
        const expectedSignature = crypto
            .createHmac('sha256', secret)
            .update(rawBody)
            .digest('hex');
        const valid = crypto.timingSafeEqual(
            Buffer.from(signature, 'hex'),
            Buffer.from(expectedSignature, 'hex'),
        );
        if (!valid) {
            this.logger.error('Razorpay webhook signature MISMATCH — possible fraud attempt');
            throw new UnauthorizedException('Invalid webhook signature');
        }
        return true;
    }

    // ─────────────────────────────────────────────────────────
    // RAZORPAY — Handle Payment Success Webhook
    // ─────────────────────────────────────────────────────────
    async handleRazorpayWebhook(rawBody: string, signature: string, payload: any): Promise<void> {
        this.verifyRazorpayWebhook(rawBody, signature);

        const event = payload.event;
        if (event !== 'payment.captured') {
            this.logger.log(`Razorpay event ${event} — no action needed`);
            return;
        }

        const payment = payload.payload?.payment?.entity;
        const orderId = payment?.order_id;
        const paymentId = payment?.id;

        const invoice = await this.invoiceRepo.findOne({ where: { payment_gateway_id: orderId } });
        if (!invoice) {
            this.logger.warn(`No invoice found for Razorpay order ${orderId}`);
            return;
        }
        if (invoice.status === 'PAID') {
            this.logger.log(`Invoice ${invoice.id} already paid — duplicate webhook ignored`);
            return;
        }

        await this.invoiceService.markPaid(invoice.id, invoice.tenant_id, paymentId, 'razorpay');
        this.logger.log(`Invoice ${invoice.invoice_number} PAID via Razorpay payment ${paymentId}`);
    }

    // ─────────────────────────────────────────────────────────
    // CLIENT VERIFICATION — Frontend confirms Razorpay payment
    // without exposing raw order details. Returns only success.
    // ─────────────────────────────────────────────────────────
    async verifyRazorpayPayment(params: {
        razorpay_order_id: string;
        razorpay_payment_id: string;
        razorpay_signature: string;
        invoiceId: string;
        tenantId: string;
    }): Promise<{ success: boolean }> {
        const keySecret = this.config.get<string>('RAZORPAY_KEY_SECRET') ?? '';
        const body = `${params.razorpay_order_id}|${params.razorpay_payment_id}`;
        const expectedSig = crypto.createHmac('sha256', keySecret).update(body).digest('hex');
        if (expectedSig !== params.razorpay_signature) {
            throw new UnauthorizedException('Payment signature verification failed');
        }

        await this.invoiceService.markPaid(
            params.invoiceId,
            params.tenantId,
            params.razorpay_payment_id,
            'razorpay',
        );
        return { success: true };
    }

    // ─────────────────────────────────────────────────────────
    // PAYPAL — Create Order
    // ─────────────────────────────────────────────────────────
    async createPaypalOrder(invoiceId: string, tenantId: string): Promise<{ approvalUrl: string; orderId: string }> {
        const invoice = await this.invoiceService.findOne(invoiceId, tenantId);
        if (invoice.status !== 'PENDING' && invoice.status !== 'DPD') {
            throw new BadRequestException('Invoice is not payable');
        }

        const clientId = this.config.get<string>('PAYPAL_CLIENT_ID');
        const clientSecret = this.config.get<string>('PAYPAL_CLIENT_SECRET');
        const mode = this.config.get<string>('PAYPAL_MODE') || 'sandbox';

        if (!clientId || !clientSecret) {
            throw new BadRequestException('PayPal not configured. Set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET');
        }

        const baseUrl = mode === 'live'
            ? 'https://api-m.paypal.com'
            : 'https://api-m.sandbox.paypal.com';

        // Get access token
        const tokenRes = await fetch(`${baseUrl}/v1/oauth2/token`, {
            method: 'POST',
            headers: {
                Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: 'grant_type=client_credentials',
        });
        const tokenData = await tokenRes.json() as any;
        const accessToken = tokenData.access_token;

        // Create order
        const orderRes = await fetch(`${baseUrl}/v2/checkout/orders`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                intent: 'CAPTURE',
                purchase_units: [{
                    reference_id: invoice.invoice_number,
                    amount: { currency_code: 'USD', value: (+invoice.total / 83).toFixed(2) }, // rough INR→USD
                    description: `Techaasvik — ${invoice.invoice_number}`,
                }],
                application_context: {
                    return_url: `${this.config.get('FRONTEND_URL')}/dashboard/billing?payment=success&invoice=${invoiceId}`,
                    cancel_url: `${this.config.get('FRONTEND_URL')}/dashboard/billing?payment=cancelled`,
                },
            }),
        });
        const orderData = await orderRes.json() as any;
        const approvalUrl = orderData.links?.find((l: any) => l.rel === 'approve')?.href;

        await this.invoiceRepo.update(invoiceId, {
            payment_gateway_id: orderData.id,
            payment_gateway: 'paypal',
            status: 'PROCESSING',
        });

        return { approvalUrl, orderId: orderData.id };
    }

    // ─────────────────────────────────────────────────────────
    // PAYPAL — Verify + Capture (called on return_url)
    // ─────────────────────────────────────────────────────────
    async capturePaypalOrder(orderId: string, tenantId: string): Promise<{ success: boolean }> {
        const clientId = this.config.get<string>('PAYPAL_CLIENT_ID');
        const clientSecret = this.config.get<string>('PAYPAL_CLIENT_SECRET');
        const mode = this.config.get<string>('PAYPAL_MODE') || 'sandbox';
        const baseUrl = mode === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';

        const tokenRes = await fetch(`${baseUrl}/v1/oauth2/token`, {
            method: 'POST',
            headers: {
                Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: 'grant_type=client_credentials',
        });
        const { access_token } = await tokenRes.json() as any;

        const captureRes = await fetch(`${baseUrl}/v2/checkout/orders/${orderId}/capture`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${access_token}`, 'Content-Type': 'application/json' },
        });
        const captureData = await captureRes.json() as any;

        if (captureData.status === 'COMPLETED') {
            const invoice = await this.invoiceRepo.findOne({ where: { payment_gateway_id: orderId } });
            if (invoice && invoice.status !== 'PAID') {
                await this.invoiceService.markPaid(invoice.id, invoice.tenant_id, orderId, 'paypal');
            }
            return { success: true };
        }
        throw new BadRequestException(`PayPal capture failed: ${captureData.status}`);
    }

    // ────────────────────────────────────────────────────────────
    // WALLET TOP-UP — Create Razorpay order for wallet credit
    // ────────────────────────────────────────────────────────────
    async createWalletTopupOrder(tenantId: string, amountRupees: number, description: string): Promise<{
        orderId: string; amount: number; currency: string; key_id: string;
    }> {
        const keyId = this.config.get<string>('RAZORPAY_KEY_ID');
        const keySecret = this.config.get<string>('RAZORPAY_KEY_SECRET');
        if (!keyId || !keySecret) {
            throw new BadRequestException('Razorpay not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET');
        }

        const Razorpay = require('razorpay');
        const rzp = new Razorpay({ key_id: keyId, key_secret: keySecret });

        const order = await rzp.orders.create({
            amount: Math.round(amountRupees * 100), // convert to paise
            currency: 'INR',
            receipt: `wallet-topup-${tenantId}-${Date.now()}`,
            notes: { tenant_id: tenantId, purpose: 'wallet_topup', description },
        });

        this.logger.log(`Wallet top-up order ${order.id} created for tenant ${tenantId} — ₹${amountRupees}`);
        return { orderId: order.id, amount: amountRupees, currency: 'INR', key_id: keyId };
    }

    // ────────────────────────────────────────────────────────────
    // WALLET TOP-UP — Verify signature and credit wallet
    // ────────────────────────────────────────────────────────────
    async verifyAndCreditWallet(tenantId: string, params: {
        razorpay_order_id: string;
        razorpay_payment_id: string;
        razorpay_signature: string;
        amount: number;
    }, userId?: string): Promise<{ success: boolean; newBalance: number }> {
        const keySecret = this.config.get<string>('RAZORPAY_KEY_SECRET') ?? '';
        const body = `${params.razorpay_order_id}|${params.razorpay_payment_id}`;
        const expectedSig = crypto.createHmac('sha256', keySecret).update(body).digest('hex');
        if (expectedSig !== params.razorpay_signature) {
            throw new UnauthorizedException('Wallet top-up signature verification failed');
        }

        const result = await this.walletService.credit({
            tenantId,
            amount: params.amount,
            description: `Wallet top-up via Razorpay — ${params.razorpay_payment_id}`,
            referenceType: 'PAYMENT',
            referenceId: params.razorpay_payment_id,
            createdBy: userId,
        });

        this.logger.log(`Wallet credited ₹${params.amount} for tenant ${tenantId} via payment ${params.razorpay_payment_id}`);
        return { success: true, newBalance: result.newBalance };
    }
}
