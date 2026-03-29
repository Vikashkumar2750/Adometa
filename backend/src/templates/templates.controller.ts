import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    Query,
    UseGuards,
    ParseIntPipe,
    ParseUUIDPipe,
    UseInterceptors,
    UploadedFile,
    BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage, memoryStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags, ApiQuery, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { TemplatesService } from './templates.service';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { TenantIsolationGuard } from '../common/guards/tenant-isolation.guard';
import {
    CreateTemplateDto,
    UpdateTemplateDto,
    TemplateResponseDto,
    PaginatedTemplatesResponseDto,
    TemplateStatsDto,
    MediaUploadResponseDto,
} from './dto/template.dto';
import { TemplateStatus } from './entities/template.entity';

// ─── Upload directory ─────────────────────────────────────────────────────────
const UPLOAD_DIR = join(process.cwd(), 'uploads', 'templates');
if (!existsSync(UPLOAD_DIR)) mkdirSync(UPLOAD_DIR, { recursive: true });

const mediaStorage = diskStorage({
    destination: UPLOAD_DIR,
    filename: (_req, file, cb) => {
        const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        cb(null, `${unique}${extname(file.originalname)}`);
    },
});

const ALLOWED_TYPES = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif',
    'video/mp4', 'video/quicktime', 'video/3gpp',
    'application/pdf', 'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
];

@ApiTags('Templates')
@ApiBearerAuth()
@Controller('templates')
@UseGuards(AuthGuard('jwt'), TenantIsolationGuard)
export class TemplatesController {
    constructor(private readonly templatesService: TemplatesService) { }

    // ── Media Upload ──────────────────────────────────────────────────────────

    @Post('upload-media')
    @ApiOperation({ summary: 'Upload media file (image/video/document) for template header' })
    @ApiConsumes('multipart/form-data')
    @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
    @ApiResponse({ status: 201, description: 'Media uploaded', type: MediaUploadResponseDto })
    @UseInterceptors(FileInterceptor('file', {
        storage: mediaStorage,
        limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB overall cap
        fileFilter: (_req, file, cb) => {
            if (ALLOWED_TYPES.includes(file.mimetype)) {
                cb(null, true);
            } else {
                cb(new BadRequestException(`Unsupported file type: ${file.mimetype}`), false);
            }
        },
    }))
    async uploadMedia(
        @TenantId() tenantId: string,
        @UploadedFile() file: Express.Multer.File,
    ): Promise<MediaUploadResponseDto> {
        if (!file) throw new BadRequestException('No file provided');
        return this.templatesService.uploadMedia(tenantId, file);
    }

    // ── CRUD ──────────────────────────────────────────────────────────────────

    @Post()
    @ApiOperation({ summary: 'Create a new template (and optionally submit to Meta)' })
    @ApiResponse({ status: 201, description: 'Template created', type: TemplateResponseDto })
    async create(
        @TenantId() tenantId: string,
        @Body() createDto: CreateTemplateDto
    ): Promise<TemplateResponseDto> {
        return this.templatesService.create(tenantId, createDto);
    }

    @Get()
    @ApiOperation({ summary: 'Get all templates (paginated)' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiQuery({ name: 'search', required: false, type: String })
    @ApiQuery({ name: 'status', required: false, enum: TemplateStatus })
    @ApiResponse({ status: 200, description: 'Templates list', type: PaginatedTemplatesResponseDto })
    async findAll(
        @TenantId() tenantId: string,
        @Query('page', new ParseIntPipe({ optional: true })) page?: number,
        @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
        @Query('search') search?: string,
        @Query('status') status?: TemplateStatus,
    ): Promise<PaginatedTemplatesResponseDto> {
        return this.templatesService.findAll(tenantId, page, limit, search, status);
    }

    @Get('statistics')
    @ApiOperation({ summary: 'Get template statistics' })
    @ApiResponse({ status: 200, type: TemplateStatsDto })
    async getStatistics(@TenantId() tenantId: string): Promise<TemplateStatsDto> {
        return this.templatesService.getStatistics(tenantId);
    }

    @Get('approved')
    @ApiOperation({ summary: 'Get approved templates for campaign use' })
    @ApiResponse({ status: 200, type: [TemplateResponseDto] })
    async getApproved(@TenantId() tenantId: string): Promise<TemplateResponseDto[]> {
        return this.templatesService.getApproved(tenantId);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get template by ID' })
    @ApiResponse({ status: 200, type: TemplateResponseDto })
    async findOne(
        @Param('id', ParseUUIDPipe) id: string,
        @TenantId() tenantId: string
    ): Promise<TemplateResponseDto> {
        return this.templatesService.findOne(id, tenantId);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update draft template' })
    @ApiResponse({ status: 200, type: TemplateResponseDto })
    async update(
        @Param('id', ParseUUIDPipe) id: string,
        @TenantId() tenantId: string,
        @Body() updateDto: UpdateTemplateDto
    ): Promise<TemplateResponseDto> {
        return this.templatesService.update(id, tenantId, updateDto);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete draft/rejected template' })
    async remove(
        @Param('id', ParseUUIDPipe) id: string,
        @TenantId() tenantId: string
    ): Promise<{ message: string }> {
        await this.templatesService.remove(id, tenantId);
        return { message: 'Template deleted successfully' };
    }

    @Post(':id/submit')
    @ApiOperation({ summary: 'Submit draft template to Meta for approval' })
    @ApiResponse({ status: 200, type: TemplateResponseDto })
    async submit(
        @Param('id', ParseUUIDPipe) id: string,
        @TenantId() tenantId: string
    ): Promise<TemplateResponseDto> {
        return this.templatesService.submit(id, tenantId);
    }

    @Get(':id/sync-status')
    @ApiOperation({ summary: 'Pull live approval status from Meta' })
    @ApiResponse({ status: 200, type: TemplateResponseDto })
    async syncStatus(
        @Param('id', ParseUUIDPipe) id: string,
        @TenantId() tenantId: string
    ): Promise<TemplateResponseDto> {
        return this.templatesService.syncMetaStatus(id, tenantId);
    }
}

// ─── Super Admin Templates Controller ──────────────────────────────────────────
// Separate controller at /api/admin/templates — no TenantIsolationGuard.
// SUPER_ADMIN can view all templates across all tenants.

@ApiTags('Admin - Templates')
@ApiBearerAuth()
@Controller('admin/templates')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('SUPER_ADMIN')
export class AdminTemplatesController {
    constructor(private readonly templatesService: TemplatesService) { }

    @Get('stats')
    @ApiOperation({ summary: '[Super Admin] Platform-wide template statistics' })
    async getAdminStats() {
        return this.templatesService.getAdminStats();
    }

    @Get()
    @ApiOperation({ summary: '[Super Admin] All templates across all tenants' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiQuery({ name: 'search', required: false, type: String })
    @ApiQuery({ name: 'status', required: false, enum: TemplateStatus })
    @ApiQuery({ name: 'tenantId', required: false, type: String })
    @ApiQuery({ name: 'category', required: false, type: String })
    async findAll(
        @Query('page', new ParseIntPipe({ optional: true })) page?: number,
        @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
        @Query('search') search?: string,
        @Query('status') status?: TemplateStatus,
        @Query('tenantId') tenantId?: string,
        @Query('category') category?: string,
    ): Promise<PaginatedTemplatesResponseDto> {
        return this.templatesService.findAllForAdmin(page, limit, search, status, tenantId, category);
    }

    @Get(':id')
    @ApiOperation({ summary: '[Super Admin] Get a single template by ID (any tenant)' })
    @ApiResponse({ status: 200, type: TemplateResponseDto })
    async findOne(
        @Param('id', ParseUUIDPipe) id: string,
    ): Promise<TemplateResponseDto> {
        return this.templatesService.findOneForAdmin(id);
    }
}
