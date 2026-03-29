# 🔐 Tenant Isolation Implementation Guide

## Overview

This guide explains how tenant isolation is enforced in the Techaasvik platform to prevent cross-tenant data leakage.

---

## Architecture

### 1. **Guards**
- **`TenantIsolationGuard`**: Ensures every request has tenant context
- **`RolesGuard`**: Enforces role-based access control

### 2. **Interceptors**
- **`TenantContextInterceptor`**: Injects tenant context into requests

### 3. **Repository Pattern**
- **`BaseTenantRepository`**: Automatically filters queries by `tenant_id`

### 4. **Decorators**
- **`@TenantId()`**: Extracts tenant ID from request
- **`@Roles()`**: Specifies required roles
- **`@BypassTenantIsolation()`**: Bypasses isolation (Super Admin only)

---

## How It Works

### Request Flow

```
1. Request arrives → JWT Auth Guard validates token
2. TenantContextInterceptor extracts tenant_id from JWT
3. TenantIsolationGuard verifies tenant context
4. RolesGuard checks user role
5. Controller receives tenantId via @TenantId() decorator
6. Service uses BaseTenantRepository for database operations
7. All queries automatically filtered by tenant_id
```

---

## Implementation Examples

### Example 1: Creating a Tenant-Scoped Module

#### Step 1: Create Entity with `tenant_id`

```typescript
// src/contacts/entities/contact.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, Index } from 'typeorm';

@Entity('tenant_contacts')
@Index(['tenant_id']) // CRITICAL: Index for performance
export class Contact {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column('uuid')
    tenant_id: string; // REQUIRED for all tenant tables

    @Column()
    name: string;

    @Column()
    mobile: string;

    @Column({ type: 'jsonb', nullable: true })
    metadata: Record<string, any>;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    created_at: Date;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    updated_at: Date;
}
```

#### Step 2: Create Repository (Optional but Recommended)

```typescript
// src/contacts/contacts.repository.ts
import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BaseTenantRepository } from '../security/base-tenant.repository';
import { Contact } from './entities/contact.entity';

@Injectable()
export class ContactsRepository extends BaseTenantRepository<Contact> {
    constructor(private dataSource: DataSource) {
        super(Contact, dataSource.createEntityManager());
    }

    // Add custom tenant-scoped queries here
    async findByMobile(tenantId: string, mobile: string): Promise<Contact | null> {
        return this.findOneForTenant(tenantId, { mobile } as any);
    }
}
```

#### Step 3: Create Service

```typescript
// src/contacts/contacts.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ContactsRepository } from './contacts.repository';
import { Contact } from './entities/contact.entity';

@Injectable()
export class ContactsService {
    private readonly logger = new Logger(ContactsService.name);

    constructor(private readonly contactsRepository: ContactsRepository) {}

    async findAll(tenantId: string): Promise<Contact[]> {
        this.logger.debug(`Finding all contacts for tenant: ${tenantId}`);
        return this.contactsRepository.findAllForTenant(tenantId);
    }

    async findOne(tenantId: string, id: string): Promise<Contact | null> {
        return this.contactsRepository.findByIdForTenant(tenantId, id);
    }

    async create(tenantId: string, contactData: Partial<Contact>): Promise<Contact> {
        return this.contactsRepository.createForTenant(tenantId, contactData);
    }

    async update(tenantId: string, id: string, updateData: Partial<Contact>): Promise<Contact> {
        return this.contactsRepository.updateForTenant(tenantId, id, updateData);
    }

    async remove(tenantId: string, id: string): Promise<void> {
        await this.contactsRepository.deleteForTenant(tenantId, id);
    }
}
```

#### Step 4: Create Controller

```typescript
// src/contacts/contacts.controller.ts
import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TenantIsolationGuard } from '../common/guards/tenant-isolation.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { ContactsService } from './contacts.service';
import { Contact } from './entities/contact.entity';

@Controller('contacts')
@UseGuards(AuthGuard('jwt'), TenantIsolationGuard, RolesGuard)
@Roles('TENANT_ADMIN', 'TENANT_MARKETER') // Only tenant users
export class ContactsController {
    constructor(private readonly contactsService: ContactsService) {}

    @Get()
    async findAll(@TenantId() tenantId: string): Promise<Contact[]> {
        // tenantId automatically extracted from JWT
        return this.contactsService.findAll(tenantId);
    }

    @Get(':id')
    async findOne(
        @TenantId() tenantId: string,
        @Param('id') id: string
    ): Promise<Contact> {
        return this.contactsService.findOne(tenantId, id);
    }

    @Post()
    async create(
        @TenantId() tenantId: string,
        @Body() contactData: Partial<Contact>
    ): Promise<Contact> {
        return this.contactsService.create(tenantId, contactData);
    }

    @Patch(':id')
    async update(
        @TenantId() tenantId: string,
        @Param('id') id: string,
        @Body() updateData: Partial<Contact>
    ): Promise<Contact> {
        return this.contactsService.update(tenantId, id, updateData);
    }

    @Delete(':id')
    async remove(
        @TenantId() tenantId: string,
        @Param('id') id: string
    ): Promise<void> {
        await this.contactsService.remove(tenantId, id);
    }
}
```

---

## Super Admin Access

### Scenario: Super Admin needs to view all contacts across tenants

```typescript
@Controller('admin/contacts')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('SUPER_ADMIN')
export class AdminContactsController {
    constructor(private readonly contactsService: ContactsService) {}

    @Get()
    @BypassTenantIsolation() // Super Admin can bypass
    async findAllAcrossTenants(): Promise<Contact[]> {
        // This would require a different service method
        // that doesn't filter by tenant_id
        return this.contactsService.findAllForAdmin();
    }

    @Get('tenant/:tenantId')
    async findForSpecificTenant(
        @Param('tenantId') tenantId: string
    ): Promise<Contact[]> {
        // Super Admin can specify which tenant to view
        return this.contactsService.findAll(tenantId);
    }
}
```

---

## Security Checklist

When creating a new tenant-scoped module, ensure:

- [ ] Entity has `tenant_id` column
- [ ] `tenant_id` is indexed for performance
- [ ] Repository extends `BaseTenantRepository`
- [ ] Service uses repository's tenant-scoped methods
- [ ] Controller uses `@TenantId()` decorator
- [ ] Controller has `TenantIsolationGuard` applied
- [ ] Controller has `RolesGuard` applied
- [ ] Super Admin endpoints use `@BypassTenantIsolation()` if needed
- [ ] All database queries filtered by `tenant_id`
- [ ] No direct TypeORM queries without tenant filter

---

## Common Pitfalls

### ❌ DON'T: Direct TypeORM queries without tenant filter

```typescript
// WRONG - No tenant filtering
async findAll() {
    return this.repository.find();
}
```

### ✅ DO: Use BaseTenantRepository methods

```typescript
// CORRECT - Automatic tenant filtering
async findAll(tenantId: string) {
    return this.repository.findAllForTenant(tenantId);
}
```

### ❌ DON'T: Forget to add tenant_id to entities

```typescript
// WRONG - Missing tenant_id
@Entity('contacts')
export class Contact {
    @PrimaryGeneratedColumn('uuid')
    id: string;
    
    @Column()
    name: string;
}
```

### ✅ DO: Always include tenant_id

```typescript
// CORRECT - Has tenant_id
@Entity('tenant_contacts')
export class Contact {
    @PrimaryGeneratedColumn('uuid')
    id: string;
    
    @Column('uuid')
    tenant_id: string; // REQUIRED
    
    @Column()
    name: string;
}
```

---

## Testing Tenant Isolation

### Test 1: Verify tenant cannot access other tenant's data

```typescript
describe('Tenant Isolation', () => {
    it('should not allow tenant A to access tenant B data', async () => {
        // Create contact for tenant A
        const contactA = await contactsService.create('tenant-a-id', {
            name: 'Contact A',
            mobile: '1234567890'
        });

        // Try to access from tenant B
        const result = await contactsService.findOne('tenant-b-id', contactA.id);

        expect(result).toBeNull(); // Should not find it
    });
});
```

### Test 2: Verify Super Admin can access all tenants

```typescript
describe('Super Admin Access', () => {
    it('should allow super admin to access any tenant', async () => {
        const contactA = await contactsService.create('tenant-a-id', {
            name: 'Contact A'
        });

        // Super Admin can specify tenant
        const result = await contactsService.findOne('tenant-a-id', contactA.id);

        expect(result).toBeDefined();
        expect(result.id).toBe(contactA.id);
    });
});
```

---

## Performance Considerations

1. **Always index `tenant_id`**: Critical for query performance
2. **Use composite indexes**: For frequently queried columns with tenant_id
3. **Pagination**: Always paginate large datasets
4. **Caching**: Consider Redis caching for frequently accessed data

```typescript
// Example composite index
@Index(['tenant_id', 'created_at'])
@Index(['tenant_id', 'status'])
export class Campaign {
    @Column('uuid')
    tenant_id: string;
    
    @Column()
    status: string;
    
    @Column({ type: 'timestamp' })
    created_at: Date;
}
```

---

## Audit Logging

All tenant operations should be logged:

```typescript
async create(tenantId: string, data: any) {
    const entity = await this.repository.createForTenant(tenantId, data);
    
    // Log the action
    await this.auditService.log({
        tenantId,
        action: 'CREATE',
        entity: 'Contact',
        entityId: entity.id,
        userId: currentUser.id
    });
    
    return entity;
}
```

---

## Summary

**Tenant isolation is enforced at multiple layers:**

1. **Guard Layer**: TenantIsolationGuard blocks requests without tenant context
2. **Repository Layer**: BaseTenantRepository filters all queries
3. **Database Layer**: All tables have tenant_id column
4. **Application Layer**: Services always pass tenantId

**This multi-layered approach ensures:**
- ✅ Zero cross-tenant data leakage
- ✅ Automatic tenant filtering
- ✅ Clear audit trail
- ✅ Performance optimization via indexes

---

**Last Updated**: 2026-02-09 21:31 IST  
**Status**: ✅ Tenant Isolation System Complete
