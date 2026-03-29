# 🎯 Next Phase: Tenant Management Implementation

**Phase**: Core Tenant Operations  
**Timeline**: Immediate (Next 2-3 hours)  
**Status**: Backend Running ✅ | Database Connected ✅ | Auth Working ✅

---

## ✅ Current State Verification

### What's Working
1. **Backend Server**: Running on `http://localhost:3001/api`
2. **Database**: PostgreSQL connected and schema initialized
3. **Authentication**: Super Admin login functional
4. **Endpoints Active**:
   - `POST /api/auth/login` ✅
   - `GET /api/auth/me` ✅
   - `POST /api/tenants` ✅
   - `GET /api/tenants` ✅
   - `GET /api/tenants/:id` ✅

### What's Pending
1. **Tenant Service Logic**: CRUD operations need implementation
2. **Frontend Integration**: Login page needs backend connection
3. **Super Admin Dashboard**: Tenant management UI
4. **Approval Workflow**: Tenant approval process

---

## 🎯 Immediate Goals (Next Steps)

### Step 1: Complete Tenant Service Implementation (30 mins)

**File**: `backend/src/tenants/tenants.service.ts`

**Required Methods**:
```typescript
// 1. Create Tenant (with validation)
async create(createTenantDto: CreateTenantDto): Promise<Tenant>

// 2. List All Tenants (with pagination & filters)
async findAll(filters?: TenantFilters): Promise<{ data: Tenant[], total: number }>

// 3. Get Single Tenant
async findOne(id: string): Promise<Tenant>

// 4. Update Tenant
async update(id: string, updateTenantDto: UpdateTenantDto): Promise<Tenant>

// 5. Approve Tenant (Super Admin only)
async approve(id: string, approvedBy: string): Promise<Tenant>

// 6. Reject Tenant
async reject(id: string, reason: string): Promise<Tenant>

// 7. Soft Delete
async remove(id: string): Promise<void>
```

**Business Rules**:
- New tenants start with `status: 'PENDING_APPROVAL'`
- Only Super Admin can approve/reject
- Email must be unique
- Business name must be unique
- Approved tenants get `approved_at` timestamp
- Audit log every state change

---

### Step 2: Implement DTOs (15 mins)

**Files to Create**:

1. **`backend/src/tenants/dto/create-tenant.dto.ts`**
```typescript
export class CreateTenantDto {
  @IsNotEmpty()
  @IsString()
  business_name: string;

  @IsEmail()
  owner_email: string;

  @IsNotEmpty()
  @IsString()
  owner_name: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEnum(['STARTER', 'PROFESSIONAL', 'ENTERPRISE'])
  plan?: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsString()
  locale?: string;
}
```

2. **`backend/src/tenants/dto/update-tenant.dto.ts`**
```typescript
export class UpdateTenantDto extends PartialType(CreateTenantDto) {}
```

3. **`backend/src/tenants/dto/tenant-filters.dto.ts`**
```typescript
export class TenantFiltersDto {
  @IsOptional()
  @IsEnum(['PENDING_APPROVAL', 'ACTIVE', 'SUSPENDED', 'REJECTED'])
  status?: string;

  @IsOptional()
  @IsEnum(['STARTER', 'PROFESSIONAL', 'ENTERPRISE'])
  plan?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
```

---

### Step 3: Enhance Tenant Controller (20 mins)

**File**: `backend/src/tenants/tenants.controller.ts`

**Add Missing Endpoints**:
```typescript
// Approve tenant (Super Admin only)
@Post(':id/approve')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
async approve(@Param('id') id: string, @Request() req) {
  return this.tenantsService.approve(id, req.user.userId);
}

// Reject tenant
@Post(':id/reject')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
async reject(
  @Param('id') id: string,
  @Body('reason') reason: string
) {
  return this.tenantsService.reject(id, reason);
}

// Update tenant
@Patch(':id')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
async update(
  @Param('id') id: string,
  @Body() updateTenantDto: UpdateTenantDto
) {
  return this.tenantsService.update(id, updateTenantDto);
}

// Soft delete
@Delete(':id')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
async remove(@Param('id') id: string) {
  return this.tenantsService.remove(id);
}
```

---

### Step 4: Create Roles Guard (15 mins)

**File**: `backend/src/common/guards/roles.guard.ts`

```typescript
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.some((role) => user.role === role);
  }
}
```

**File**: `backend/src/common/decorators/roles.decorator.ts`

```typescript
import { SetMetadata } from '@nestjs/common';

export const Roles = (...roles: string[]) => SetMetadata('roles', roles);
```

---

### Step 5: Frontend Login Integration (30 mins)

**File**: `frontend/src/app/(auth)/login/page.tsx`

**Current Issues to Fix**:
1. Connect to backend API (`http://localhost:3001/api/auth/login`)
2. Store JWT token in cookies/localStorage
3. Redirect based on role:
   - `SUPER_ADMIN` → `/admin/tenants`
   - Others → `/dashboard`

**Implementation**:
```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import Cookies from 'js-cookie';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await axios.post('http://localhost:3001/api/auth/login', {
        email,
        password,
      });

      // Store token
      Cookies.set('token', res.data.access_token, { expires: 1 }); // 1 day
      
      // Store user info
      localStorage.setItem('user', JSON.stringify(res.data.user));

      // Redirect based on role
      if (res.data.user.role === 'SUPER_ADMIN') {
        router.push('/admin/tenants');
      } else {
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
        <h2 className="text-3xl font-bold text-center">Sign in to Techaasvik</h2>
        
        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
```

---

### Step 6: Create Super Admin Tenant List Page (45 mins)

**File**: `frontend/src/app/admin/tenants/page.tsx`

**Features**:
- List all tenants with status badges
- Filter by status (Pending, Active, Suspended)
- Approve/Reject actions
- Pagination
- Search by business name/email

---

## 🔄 Implementation Order

1. ✅ **Backend Running** (DONE)
2. ✅ **Database Connected** (DONE)
3. ✅ **Auth Endpoints** (DONE)
4. 🔄 **Tenant Service Logic** (NEXT - 30 mins)
5. 🔄 **DTOs & Validation** (15 mins)
6. 🔄 **Roles Guard** (15 mins)
7. 🔄 **Frontend Login** (30 mins)
8. 🔄 **Tenant List UI** (45 mins)

**Total Estimated Time**: ~2.5 hours

---

## 🧪 Testing Checklist

After implementation, verify:

### Backend Tests
```bash
# Test tenant creation
curl -X POST http://localhost:3001/api/tenants \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "business_name": "Test Company",
    "owner_email": "test@example.com",
    "owner_name": "Test Owner"
  }'

# Test tenant list
curl http://localhost:3001/api/tenants \
  -H "Authorization: Bearer $TOKEN"

# Test tenant approval
curl -X POST http://localhost:3001/api/tenants/{id}/approve \
  -H "Authorization: Bearer $TOKEN"
```

### Frontend Tests
1. Login as Super Admin
2. Navigate to `/admin/tenants`
3. Create new tenant
4. Approve tenant
5. Verify status updates

---

## 📊 Success Metrics

**Phase Complete When**:
- ✅ Super Admin can log in
- ✅ Super Admin can view all tenants
- ✅ Super Admin can create tenants
- ✅ Super Admin can approve/reject tenants
- ✅ Tenant status updates correctly
- ✅ Audit logs capture all actions
- ✅ Role-based access works

---

## 🚀 After This Phase

**Next Priorities**:
1. **WhatsApp OAuth Integration** - Connect Meta Business accounts
2. **Tenant User Management** - Add team members
3. **Template Management** - Create/approve message templates
4. **Campaign Engine** - Schedule and send campaigns

---

## 📝 Notes

- All tenant operations require `SUPER_ADMIN` role
- Tenant creation triggers email notification (implement later)
- Approval workflow is manual (no auto-approval)
- Soft delete preserves data for audit
- All state changes logged to `tenant_audit_logs`

---

**Ready to implement?** Let's start with the Tenant Service! 🚀
