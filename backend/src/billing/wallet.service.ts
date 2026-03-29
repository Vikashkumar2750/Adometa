import {
    Injectable,
    Logger,
    NotFoundException,
    BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager } from 'typeorm';
import { TenantWallet, TenantTransaction } from './entities/billing.entities';

export interface CreditResult {
    newBalance: number;
    transactionId: string;
}

export interface DebitResult {
    newBalance: number;
    transactionId: string;
    sufficient: boolean;
}

@Injectable()
export class WalletService {
    private readonly logger = new Logger(WalletService.name);

    constructor(
        @InjectRepository(TenantWallet)
        private walletRepo: Repository<TenantWallet>,
        @InjectRepository(TenantTransaction)
        private txnRepo: Repository<TenantTransaction>,
        private dataSource: DataSource,
    ) { }

    // ─────────────────────────────────────────────────────────
    // Internal: get or auto-create wallet (idempotent)
    // ─────────────────────────────────────────────────────────
    async getOrCreate(tenantId: string, manager?: EntityManager): Promise<TenantWallet> {
        const repo = manager ? manager.getRepository(TenantWallet) : this.walletRepo;
        let wallet = await repo.findOne({ where: { tenant_id: tenantId } });
        if (!wallet) {
            wallet = repo.create({ tenant_id: tenantId, balance: 0, currency: 'INR' });
            wallet = await repo.save(wallet);
            this.logger.log(`Auto-created wallet for tenant ${tenantId}`);
        }
        return wallet;
    }

    // ─────────────────────────────────────────────────────────
    // Get wallet balance for tenant
    // ─────────────────────────────────────────────────────────
    async getBalance(tenantId: string): Promise<{ balance: number; currency: string; low_balance_threshold: number; isLow: boolean }> {
        const wallet = await this.getOrCreate(tenantId);
        return {
            balance: +wallet.balance,
            currency: wallet.currency,
            low_balance_threshold: +wallet.low_balance_threshold,
            isLow: +wallet.balance <= +wallet.low_balance_threshold,
        };
    }

    // ─────────────────────────────────────────────────────────
    // Credit  (super admin top-up or payment webhook)
    // ─────────────────────────────────────────────────────────
    async credit(params: {
        tenantId: string;
        amount: number;
        description: string;
        referenceType?: string;
        referenceId?: string;
        createdBy?: string;
        manager?: EntityManager;
    }): Promise<CreditResult> {
        if (params.amount <= 0) throw new BadRequestException('Credit amount must be positive');

        return this.dataSource.transaction(async (em) => {
            const m = params.manager ? params.manager : em;
            const walletRepo = m.getRepository(TenantWallet);
            const txnRepo = m.getRepository(TenantTransaction);

            // Pessimistic write lock to prevent race conditions
            const wallet = await walletRepo
                .createQueryBuilder('w')
                .setLock('pessimistic_write')
                .where('w.tenant_id = :tid', { tid: params.tenantId })
                .getOne();

            const w = wallet || await this.getOrCreate(params.tenantId, m);
            const newBalance = +w.balance + params.amount;
            await walletRepo.update({ tenant_id: params.tenantId }, { balance: newBalance });

            const txn = txnRepo.create({
                tenant_id: params.tenantId,
                type: 'CREDIT',
                amount: params.amount,
                balance_after: newBalance,
                description: params.description,
                reference_type: params.referenceType as any,
                reference_id: params.referenceId,
                created_by: params.createdBy,
                status: 'SUCCESS',
            });
            const saved = await txnRepo.save(txn);
            this.logger.log(`CREDIT ${params.amount} → tenant ${params.tenantId} | balance: ${newBalance}`);
            return { newBalance, transactionId: saved.id };
        });
    }

    // ─────────────────────────────────────────────────────────
    // Debit (campaign usage)
    // Returns sufficient=false if wallet short — caller decides action
    // ─────────────────────────────────────────────────────────
    async debit(params: {
        tenantId: string;
        amount: number;
        description: string;
        referenceType?: string;
        referenceId?: string;
        createdBy?: string;
        failIfInsufficient?: boolean; // default true
    }): Promise<DebitResult> {
        if (params.amount <= 0) throw new BadRequestException('Debit amount must be positive');
        const failIfInsufficient = params.failIfInsufficient !== false;

        return this.dataSource.transaction(async (em) => {
            const walletRepo = em.getRepository(TenantWallet);
            const txnRepo = em.getRepository(TenantTransaction);

            // Pessimistic write lock
            const wallet = await walletRepo
                .createQueryBuilder('w')
                .setLock('pessimistic_write')
                .where('w.tenant_id = :tid', { tid: params.tenantId })
                .getOne();

            const w = wallet || await this.getOrCreate(params.tenantId, em);
            const currentBalance = +w.balance;

            if (currentBalance < params.amount) {
                if (failIfInsufficient) {
                    throw new BadRequestException(`Insufficient wallet balance. Have ₹${currentBalance}, need ₹${params.amount}`);
                }
                // Log FAILED transaction and return
                const txn = txnRepo.create({
                    tenant_id: params.tenantId,
                    type: 'DEBIT',
                    amount: params.amount,
                    balance_after: currentBalance,
                    description: params.description + ' [FAILED - insufficient balance]',
                    reference_type: params.referenceType as any,
                    reference_id: params.referenceId,
                    status: 'FAILED',
                });
                await txnRepo.save(txn);
                return { newBalance: currentBalance, transactionId: txn.id, sufficient: false };
            }

            const newBalance = currentBalance - params.amount;
            await walletRepo.update({ tenant_id: params.tenantId }, { balance: newBalance });

            const txn = txnRepo.create({
                tenant_id: params.tenantId,
                type: 'DEBIT',
                amount: params.amount,
                balance_after: newBalance,
                description: params.description,
                reference_type: params.referenceType as any,
                reference_id: params.referenceId,
                status: 'SUCCESS',
            });
            const saved = await txnRepo.save(txn);
            this.logger.log(`DEBIT ${params.amount} ← tenant ${params.tenantId} | balance: ${newBalance}`);
            return { newBalance, transactionId: saved.id, sufficient: true };
        });
    }

    // ─────────────────────────────────────────────────────────
    // Transaction history (tenant-isolated)
    // ─────────────────────────────────────────────────────────
    async getTransactions(tenantId: string, page = 1, limit = 20, type?: 'CREDIT' | 'DEBIT') {
        const qb = this.txnRepo.createQueryBuilder('t')
            .where('t.tenant_id = :tenantId', { tenantId })
            .orderBy('t.created_at', 'DESC')
            .skip((page - 1) * limit)
            .take(limit);

        if (type) qb.andWhere('t.type = :type', { type });

        const [items, total] = await qb.getManyAndCount();
        return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
    }

    // ─────────────────────────────────────────────────────────
    // Admin: all wallets with balance summary
    // ─────────────────────────────────────────────────────────
    async getAdminWalletSummary() {
        return this.walletRepo
            .createQueryBuilder('w')
            .leftJoinAndSelect('w.tenant', 'tenant')
            .orderBy('w.balance', 'ASC')
            .getMany();
    }

    // ─────────────────────────────────────────────────────────
    // Update low balance threshold
    // ─────────────────────────────────────────────────────────
    async updateThreshold(tenantId: string, threshold: number) {
        const wallet = await this.getOrCreate(tenantId);
        wallet.low_balance_threshold = threshold;
        return this.walletRepo.save(wallet);
    }

    // ─────────────────────────────────────────────────────────
    // Credit Request system — tenant asks, admin approves
    // Stored as PENDING transactions (no wallet row until approved)
    // ─────────────────────────────────────────────────────────
    async raiseCreditRequest(params: {
        tenantId: string;
        amount: number;
        note: string;
        requestedBy?: string;
        requesterEmail?: string;
    }): Promise<TenantTransaction> {
        if (params.amount <= 0) throw new BadRequestException('Amount must be positive');
        const wallet = await this.getOrCreate(params.tenantId);
        const txn = this.txnRepo.create({
            tenant_id: params.tenantId,
            type: 'CREDIT',
            amount: params.amount,
            balance_after: +wallet.balance, // unchanged until approved
            description: `Credit request: ${params.note} (requested by ${params.requesterEmail || params.requestedBy || 'tenant'})`,
            reference_type: 'MANUAL',
            created_by: params.requestedBy,
            status: 'PENDING',
        });
        const saved = await this.txnRepo.save(txn);
        this.logger.log(`Credit request ${saved.id} raised by tenant ${params.tenantId} for ₹${params.amount}`);
        return saved;
    }

    async getCreditRequests(status?: string): Promise<TenantTransaction[]> {
        const qb = this.txnRepo.createQueryBuilder('t')
            .leftJoinAndSelect('t.tenant', 'tenant')
            .where('t.type = :type', { type: 'CREDIT' })
            .andWhere('t.reference_type = :rt', { rt: 'MANUAL' });
        if (status) {
            qb.andWhere('t.status = :status', { status: status.toUpperCase() });
        } else {
            qb.andWhere('t.status IN (:...statuses)', { statuses: ['PENDING', 'SUCCESS', 'FAILED'] });
        }
        return qb.orderBy('t.created_at', 'DESC').getMany();
    }

    async approveCreditRequest(txnId: string, adminId?: string): Promise<{ success: boolean; newBalance: number }> {
        const txn = await this.txnRepo.findOne({ where: { id: txnId } });
        if (!txn) throw new BadRequestException('Credit request not found');
        if (txn.status !== 'PENDING') throw new BadRequestException('Request is not in PENDING status');

        const result = await this.credit({
            tenantId: txn.tenant_id,
            amount: +txn.amount,
            description: txn.description + ' [APPROVED]',
            referenceType: 'MANUAL',
            createdBy: adminId,
        });

        // Mark original request as SUCCESS
        await this.txnRepo.update(txnId, { status: 'SUCCESS' });
        this.logger.log(`Credit request ${txnId} approved by admin ${adminId} — ₹${txn.amount} credited`);
        return { success: true, newBalance: result.newBalance };
    }

    async rejectCreditRequest(txnId: string, reason?: string): Promise<{ success: boolean }> {
        const txn = await this.txnRepo.findOne({ where: { id: txnId } });
        if (!txn) throw new BadRequestException('Credit request not found');
        if (txn.status !== 'PENDING') throw new BadRequestException('Request is not in PENDING status');

        await this.txnRepo.update(txnId, {
            status: 'FAILED',
            description: txn.description + ` [REJECTED: ${reason || 'no reason given'}]`,
        });
        this.logger.log(`Credit request ${txnId} rejected — reason: ${reason}`);
        return { success: true };
    }
}
