import { Module, Global } from '@nestjs/common';
import { EncryptionService } from './encryption.service';
import { TenantIsolationGuard } from '../common/guards/tenant-isolation.guard';
import { TenantContextInterceptor } from '../common/interceptors/tenant-context.interceptor';
import { ConfigModule } from '@nestjs/config';

@Global()
@Module({
    imports: [ConfigModule],
    providers: [
        EncryptionService,
        TenantIsolationGuard,
        TenantContextInterceptor,
    ],
    exports: [EncryptionService, TenantIsolationGuard, TenantContextInterceptor],
})
export class SecurityModule { }
