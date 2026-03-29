# ⚡ Techaasvik - Quick Start Guide

**Get up and running in 15 minutes!**

---

## 🎯 Prerequisites

Before you begin, ensure you have:
- ✅ Node.js v18+ installed
- ✅ Docker Desktop installed and running
- ✅ Git installed
- ✅ A code editor (VS Code recommended)

---

## 🚀 Quick Start (15 Minutes)

### Step 1: Environment Setup (3 minutes)

```bash
# Navigate to project directory
cd c:\Users\Wall\Desktop\adometa.techaasvik.in

# Copy environment template
cp .env.example .env

# Generate secure secrets (run each command and copy output to .env)
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"
node -e "console.log('JWT_REFRESH_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"
node -e "console.log('ENCRYPTION_MASTER_KEY=' + require('crypto').randomBytes(32).toString('base64'))"
```

**Edit `.env` file:**
```bash
# Update these values in .env
DB_PASSWORD=your_secure_password_here
JWT_SECRET=<paste generated secret>
JWT_REFRESH_SECRET=<paste generated secret>
ENCRYPTION_MASTER_KEY=<paste generated key>
```

### Step 2: Start Infrastructure (2 minutes)

```bash
# Start PostgreSQL and Redis
docker-compose up -d postgres redis

# Verify services are running
docker-compose ps

# Expected output:
# NAME                      STATUS
# techaasvik-postgres       Up (healthy)
# techaasvik-redis          Up (healthy)
```

### Step 3: Install Backend Dependencies (5 minutes)

```bash
cd backend

# Install core dependencies
npm install @nestjs/config @nestjs/typeorm typeorm pg
npm install @nestjs/jwt @nestjs/passport passport passport-jwt
npm install bcrypt class-validator class-transformer
npm install ioredis @nestjs/bull bull
npm install @nestjs/swagger swagger-ui-express

# Install dev dependencies
npm install -D @types/bcrypt @types/passport-jwt
```

### Step 4: Setup Security Services (3 minutes)

```bash
# Create directories
mkdir -p src/security src/entities src/database

# Copy security services from artifacts
cp ../.artifacts/backend-services/encryption.service.ts src/security/
cp ../.artifacts/backend-services/tenant-isolation.guard.ts src/security/
cp ../.artifacts/backend-services/tenant-context.interceptor.ts src/security/
cp ../.artifacts/backend-services/base-tenant.repository.ts src/security/

# Copy entities
cp ../.artifacts/backend-services/tenant.entities.ts src/entities/
```

### Step 5: Verify Setup (2 minutes)

```bash
# Test database connection
docker exec -it techaasvik-postgres psql -U adotech_in -d adotech_in -c "SELECT version();"

# Test Redis connection
docker exec -it techaasvik-redis redis-cli ping
# Expected: PONG

# Check backend structure
ls -la src/
# Expected: security/, entities/, app.module.ts, main.ts, etc.
```

---

## ✅ What You Have Now

### Infrastructure
- ✅ PostgreSQL 16 running on port 5432
- ✅ Redis 7 running on port 6379
- ✅ Environment variables configured
- ✅ Secure secrets generated

### Backend
- ✅ NestJS project initialized
- ✅ Dependencies installed
- ✅ Security services ready
- ✅ Entity definitions ready

### Documentation
- ✅ Implementation plan
- ✅ Security guidelines
- ✅ Database schema
- ✅ API documentation structure

---

## 🎯 Next: Build Authentication Module

### Create Auth Module (30 minutes)

```bash
cd backend

# Generate auth module
npx nest g module auth
npx nest g service auth
npx nest g controller auth

# Generate JWT strategy
npx nest g service auth/strategies/jwt
```

### Implement JWT Authentication

**File: `src/auth/auth.module.ts`**
```typescript
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: '15m', // Access token expires in 15 minutes
        },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [AuthService, JwtStrategy],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
```

**File: `src/auth/auth.service.ts`**
```typescript
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(private jwtService: JwtService) {}

  async validateUser(email: string, password: string): Promise<any> {
    // TODO: Fetch user from database
    // TODO: Verify password with bcrypt
    // For now, return mock user
    return { id: '1', email, role: 'SUPER_ADMIN' };
  }

  async login(user: any) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId || null,
    };

    return {
      access_token: this.jwtService.sign(payload),
      // TODO: Generate refresh token
    };
  }

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
  }

  async comparePasswords(plain: string, hashed: string): Promise<boolean> {
    return bcrypt.compare(plain, hashed);
  }
}
```

---

## 🔍 Verify Everything Works

### Test Encryption Service

```bash
# Create test file
cat > src/security/encryption.test.ts << 'EOF'
import { EncryptionService } from './encryption.service';
import { ConfigService } from '@nestjs/config';

const configService = new ConfigService({
  ENCRYPTION_MASTER_KEY: Buffer.from('test-key-32-bytes-long-exactly!').toString('base64'),
});

const encryptionService = new EncryptionService(configService);

async function test() {
  const tenantId = '123e4567-e89b-12d3-a456-426614174000';
  const plainToken = 'EAABsbCS1234567890';

  console.log('Testing encryption...');
  const encrypted = await encryptionService.encryptToken(tenantId, plainToken);
  console.log('Encrypted:', encrypted.substring(0, 50) + '...');

  console.log('Testing decryption...');
  const decrypted = await encryptionService.decryptToken(tenantId, encrypted);
  console.log('Decrypted:', decrypted);

  console.log('Match:', plainToken === decrypted ? '✅ PASS' : '❌ FAIL');
}

test();
EOF

# Run test
npx ts-node src/security/encryption.test.ts
```

---

## 📚 What's Next?

### Immediate Next Steps (This Week)
1. **Database Module** - Configure TypeORM connection
2. **Migrations** - Run database schema
3. **Super Admin Seed** - Create initial admin user
4. **Auth Endpoints** - Login, register, refresh token
5. **Tenant Module** - CRUD operations with isolation

### This Month
1. **WhatsApp OAuth** - Meta embedded signup
2. **Frontend Setup** - Next.js initialization
3. **Super Admin Dashboard** - Platform management UI
4. **Client Dashboard** - Campaign management UI

### Next Month
1. **Campaign Engine** - Queue system & message sending
2. **Compliance Engine** - Opt-in tracking & quality monitoring
3. **Testing** - Unit, integration, E2E tests
4. **Production Deployment** - Go live!

---

## 🆘 Troubleshooting

### Docker Issues

**PostgreSQL won't start:**
```bash
# Check logs
docker-compose logs postgres

# Restart service
docker-compose restart postgres

# Recreate service
docker-compose down
docker-compose up -d postgres
```

**Redis won't start:**
```bash
# Check logs
docker-compose logs redis

# Restart service
docker-compose restart redis
```

### Backend Issues

**Module not found:**
```bash
# Reinstall dependencies
cd backend
rm -rf node_modules package-lock.json
npm install
```

**TypeScript errors:**
```bash
# Check tsconfig.json
# Ensure "strict": true is set
# Ensure all dependencies have @types packages
```

---

## 📖 Documentation

- **Full Implementation Plan**: `.artifacts/IMPLEMENTATION_PLAN.md`
- **Security Guidelines**: `.artifacts/SECURITY_GUIDELINES.md`
- **Project Status**: `.artifacts/PROJECT_STATUS.md`
- **Database Schema**: `database/init/001_schema.sql`
- **Foundation Summary**: `FOUNDATION_COMPLETE.md`

---

## 🎉 You're Ready!

You now have:
- ✅ Development environment running
- ✅ Backend project initialized
- ✅ Security services ready
- ✅ Clear next steps

**Time to build the authentication module and start bringing Techaasvik to life!** 🚀

---

**Questions?** Review the documentation in `.artifacts/` or check `README.md`

**Let's build something amazing!** 💪
