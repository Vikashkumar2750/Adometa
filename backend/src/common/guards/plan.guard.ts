/**
 * PlanGuard — enforces plan-level feature gates.
 *
 * Usage:
 *   @UseGuards(AuthGuard('jwt'), PlanGuard)
 *   @RequiredPlan('STARTER')            // block FREE_TRIAL
 *
 * Also attaches tenant to the request for downstream use.
 */
import {
    Injectable,
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from '../../entities/tenant.entities';

export const REQUIRED_PLAN_KEY = 'required_plan';
export const RequiredPlan = (plan: string) => SetMetadata(REQUIRED_PLAN_KEY, plan);

// Plan hierarchy — higher index = more powerful
const PLAN_ORDER = ['FREE_TRIAL', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE'];

function planLevel(plan: string): number {
    const idx = PLAN_ORDER.indexOf(plan);
    return idx === -1 ? -1 : idx;
}

@Injectable()
export class PlanGuard implements CanActivate {
    constructor(
        private reflector: Reflector,
        @InjectRepository(Tenant)
        private tenantsRepo: Repository<Tenant>,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const requiredPlan = this.reflector.getAllAndOverride<string>(REQUIRED_PLAN_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        // No plan requirement set — allow
        if (!requiredPlan) return true;

        const request = context.switchToHttp().getRequest();
        const tenantId: string | undefined = request.user?.tenantId;

        // Super admins bypass plan checks
        if (request.user?.role === 'SUPER_ADMIN') return true;

        if (!tenantId) {
            throw new ForbiddenException('Tenant context required');
        }

        const tenant = await this.tenantsRepo.findOneBy({ id: tenantId });
        if (!tenant) {
            throw new ForbiddenException('Tenant not found');
        }

        if (tenant.status !== 'ACTIVE') {
            throw new ForbiddenException(
                `Your account is ${tenant.status.toLowerCase().replace(/_/g, ' ')}. Contact support.`,
            );
        }

        const tenantLevel = planLevel(tenant.plan);
        const requiredLevel = planLevel(requiredPlan);

        if (tenantLevel < requiredLevel) {
            const planNames: Record<string, string> = {
                FREE_TRIAL: 'Free Trial',
                STARTER: 'Starter (₹2,499/mo)',
                PROFESSIONAL: 'Professional (₹7,499/mo)',
                ENTERPRISE: 'Enterprise (₹19,999/mo)',
            };
            throw new ForbiddenException(
                `Your current plan (${planNames[tenant.plan] || tenant.plan}) does not support this feature. ` +
                `Upgrade to ${planNames[requiredPlan] || requiredPlan} or higher.`,
            );
        }

        // Attach resolved tenant to request for downstream use
        request.tenant = tenant;
        return true;
    }
}
