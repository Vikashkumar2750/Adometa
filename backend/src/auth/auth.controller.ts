import {
    Controller, Post, Body, UnauthorizedException, HttpCode, HttpStatus,
    Get, Patch, UseGuards, Request, BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { TenantsService } from '../tenants/tenants.service';
import { CreateTenantDto } from '../tenants/dto/create-tenant.dto';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
    constructor(
        private authService: AuthService,
        private tenantsService: TenantsService,
    ) { }

    @Post('login')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Login user and get JWT access token' })
    @ApiResponse({ status: 200, description: 'Successful login' })
    @ApiResponse({ status: 401, description: 'Unauthorized - invalid credentials' })
    @ApiBody({ type: LoginDto })
    async login(@Body() loginDto: LoginDto) {
        const user = await this.authService.validateUser(loginDto.email, loginDto.password);
        if (!user) throw new UnauthorizedException('Invalid credentials');
        return this.authService.login(user);
    }

    @Get('me')
    @UseGuards(AuthGuard('jwt'))
    @ApiOperation({ summary: 'Get current user profile from token' })
    async getMe(@Request() req: any) {
        return req.user;
    }

    @Patch('profile')
    @UseGuards(AuthGuard('jwt'))
    @ApiOperation({ summary: 'Update profile name' })
    async updateProfile(
        @Request() req: any,
        @Body() body: { name: string },
    ) {
        if (!body.name?.trim()) throw new BadRequestException('Name is required');
        return this.authService.updateProfile(req.user.sub, req.user.role, body.name.trim());
    }

    @Post('change-password')
    @UseGuards(AuthGuard('jwt'))
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Change password' })
    async changePassword(
        @Request() req: any,
        @Body() body: { currentPassword: string; newPassword: string },
    ) {
        if (!body.currentPassword || !body.newPassword) {
            throw new BadRequestException('currentPassword and newPassword are required');
        }
        if (body.newPassword.length < 8) {
            throw new BadRequestException('New password must be at least 8 characters');
        }
        return this.authService.changePassword(req.user.sub, req.user.role, body.currentPassword, body.newPassword);
    }

    /**
     * Public self-registration — creates a new tenant + admin user.
     * No auth required. Returns a JWT so the user is immediately logged in.
     */
    @Post('register')
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Public self-registration — create a new tenant account' })
    async register(@Body() dto: CreateTenantDto) {
        const tenant = await this.tenantsService.create(dto);
        const user = await this.authService.validateUser(dto.owner_email, dto.password);
        if (!user) throw new UnauthorizedException('Account created but login failed — please log in manually');
        return this.authService.login(user);
    }

    @Post('forgot-password')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Request password reset — sends email with reset link' })
    async forgotPassword(@Body() body: { email: string }) {
        if (!body.email) throw new BadRequestException('Email is required');
        return this.authService.forgotPassword(body.email.toLowerCase().trim());
    }

    @Post('reset-password')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Reset password using token from email' })
    async resetPassword(@Body() body: { token: string; newPassword: string }) {
        return this.authService.resetPassword(body.token, body.newPassword);
    }
}
