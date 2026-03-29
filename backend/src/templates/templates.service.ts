import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { Template, TemplateStatus, HeaderType } from './entities/template.entity';
import { TemplateRepository } from './repositories/template.repository';
import {
    CreateTemplateDto,
    UpdateTemplateDto,
    TemplateResponseDto,
    PaginatedTemplatesResponseDto,
    TemplateStatsDto,
    MediaUploadResponseDto,
} from './dto/template.dto';
import { WhatsAppOAuthService } from '../whatsapp/whatsapp-oauth.service';
import axios from 'axios';
import * as path from 'path';
import * as fs from 'fs';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const FormData = require('form-data');

@Injectable()
export class TemplatesService {
    private readonly logger = new Logger(TemplatesService.name);
    private readonly META_GRAPH_API = 'https://graph.facebook.com/v18.0';

    constructor(
        private templateRepository: TemplateRepository,
        private readonly oauthService: WhatsAppOAuthService,
    ) { }

    // ─────────────────────────────────────────────────────────────────────────
    // MEDIA UPLOAD
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Upload media file to Meta and return a handle for use in template headers.
     * Falls back to a local-served preview URL if no WABA is connected.
     */
    async uploadMedia(
        tenantId: string,
        file: Express.Multer.File,
    ): Promise<MediaUploadResponseDto> {
        const headerType = this.detectHeaderType(file.mimetype);

        // Validate file type
        if (headerType === HeaderType.NONE) {
            throw new BadRequestException(
                `Unsupported media type: ${file.mimetype}. Allowed: image/jpeg, image/png, image/webp, video/mp4, application/pdf, application/msword, application/vnd.openxmlformats-officedocument.wordprocessingml.document`
            );
        }

        // Validate file size limits (Meta limits)
        const MAX_SIZES: Record<HeaderType, number> = {
            [HeaderType.IMAGE]: 5 * 1024 * 1024,     // 5 MB
            [HeaderType.VIDEO]: 16 * 1024 * 1024,    // 16 MB
            [HeaderType.DOCUMENT]: 100 * 1024 * 1024, // 100 MB
            [HeaderType.TEXT]: Infinity,
            [HeaderType.NONE]: 0,
        };
        if (file.size > MAX_SIZES[headerType]) {
            throw new BadRequestException(
                `File too large. ${headerType} max size: ${MAX_SIZES[headerType] / 1024 / 1024} MB`
            );
        }

        // Static served URL — backend exposes /uploads static folder
        const previewUrl = `/uploads/templates/${file.filename}`;
        let handle = file.filename; // default handle = filename (used if Meta not connected)

        // Try to upload to Meta for a real handle
        try {
            const config = await this.oauthService.getWabaConfig(tenantId);
            if (config) {
                const accessToken = await this.oauthService.getDecryptedToken(tenantId);
                handle = await this.uploadToMeta(file, config.phone_number_id, accessToken);
                this.logger.log(`Media uploaded to Meta for tenant ${tenantId}, handle: ${handle}`);
            } else {
                this.logger.warn(`No WABA config — media stored locally only for tenant ${tenantId}`);
            }
        } catch (err) {
            this.logger.warn(`Meta media upload failed, using local handle: ${err.message}`);
        }

        return {
            handle,
            previewUrl,
            filename: file.originalname,
            mimeType: file.mimetype,
            size: file.size,
            headerType,
        };
    }

    /**
     * Upload file buffer to Meta Graph API and return the media handle.
     * Uses /{phone-number-id}/media endpoint.
     */
    private async uploadToMeta(
        file: Express.Multer.File,
        phoneNumberId: string,
        accessToken: string,
    ): Promise<string> {
        const formData = new FormData();
        formData.append('messaging_product', 'whatsapp');
        formData.append('type', file.mimetype);
        formData.append('file', file.buffer || fs.readFileSync(file.path), {
            filename: file.originalname,
            contentType: file.mimetype,
        });

        const response = await axios.post(
            `${this.META_GRAPH_API}/${phoneNumberId}/media`,
            formData,
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    ...formData.getHeaders(),
                },
            }
        );

        // Meta returns { id: "media_id" } — this id is the handle
        return response.data.id as string;
    }

    /**
     * Detect HeaderType from mime type
     */
    private detectHeaderType(mimetype: string): HeaderType {
        if (['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'].includes(mimetype)) return HeaderType.IMAGE;
        if (['video/mp4', 'video/quicktime', 'video/3gpp'].includes(mimetype)) return HeaderType.VIDEO;
        if ([
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'text/plain',
        ].includes(mimetype)) return HeaderType.DOCUMENT;
        return HeaderType.NONE;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TEMPLATE CRUD
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Create a new template and optionally submit to Meta
     */
    async create(tenantId: string, createDto: CreateTemplateDto): Promise<TemplateResponseDto> {
        const template = this.templateRepository.create({
            tenantId,
            name: createDto.name,
            description: createDto.description,
            category: createDto.category,
            language: createDto.language,
            headerType: createDto.headerType ?? HeaderType.NONE,
            headerText: createDto.headerText,
            headerMediaHandle: createDto.headerMediaHandle,
            headerMediaUrl: createDto.headerMediaUrl,
            headerMediaFilename: createDto.headerMediaFilename,
            headerMediaMimeType: createDto.headerMediaMimeType,
            bodyText: createDto.bodyText,
            footerText: createDto.footerText,
            buttons: createDto.buttons || [],
            variables: createDto.variables,
            status: TemplateStatus.DRAFT,
        });

        const saved = await this.templateRepository.save(template);

        if (createDto.submitToMeta) {
            try {
                const submitted = await this.submitToMetaApi(saved, tenantId);
                return this.toResponseDto(submitted);
            } catch (err) {
                this.logger.warn(`Auto-submit to Meta failed for template ${saved.id}: ${err.message}`);
                return this.toResponseDto(saved);
            }
        }

        return this.toResponseDto(saved);
    }

    /**
     * Get paginated list of templates
     */
    async findAll(
        tenantId: string,
        page: number = 1,
        limit: number = 10,
        search?: string,
        status?: TemplateStatus,
    ): Promise<PaginatedTemplatesResponseDto> {
        const [templates, total] = await this.templateRepository.findByTenant(
            tenantId, page, limit, search, status,
        );
        return {
            data: templates.map((t) => this.toResponseDto(t)),
            total, page, limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    /**
     * Super Admin: get all templates across all tenants
     */
    async findAllForAdmin(
        page: number = 1,
        limit: number = 20,
        search?: string,
        status?: TemplateStatus,
        tenantId?: string,
        category?: string,
    ): Promise<PaginatedTemplatesResponseDto> {
        const [templates, total] = await this.templateRepository.findAllForAdmin(
            page, limit, search, status, tenantId, category,
        );
        return {
            data: templates.map((t) => this.toResponseDto(t)),
            total, page, limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    /**
     * Super Admin: platform-wide template stats
     */
    async getAdminStats() {
        return this.templateRepository.getAdminStats();
    }

    /** Super Admin: find any template by ID, no tenant filter */
    async findOneForAdmin(id: string): Promise<TemplateResponseDto> {
        const template = await this.templateRepository.findOne({ where: { id } });
        if (!template) throw new NotFoundException(`Template ${id} not found`);
        return this.toResponseDto(template);
    }

    async findOne(id: string, tenantId: string): Promise<TemplateResponseDto> {

        const template = await this.templateRepository.findByIdAndTenant(id, tenantId);
        if (!template) throw new NotFoundException(`Template ${id} not found`);
        return this.toResponseDto(template);
    }

    async update(id: string, tenantId: string, updateDto: UpdateTemplateDto): Promise<TemplateResponseDto> {
        const template = await this.templateRepository.findByIdAndTenant(id, tenantId);
        if (!template) throw new NotFoundException(`Template ${id} not found`);
        if (template.status !== TemplateStatus.DRAFT) throw new BadRequestException('Can only update draft templates');
        Object.assign(template, updateDto);
        const updated = await this.templateRepository.save(template);
        return this.toResponseDto(updated);
    }

    async remove(id: string, tenantId: string): Promise<void> {
        const template = await this.templateRepository.findByIdAndTenant(id, tenantId);
        if (!template) throw new NotFoundException(`Template ${id} not found`);
        if (![TemplateStatus.DRAFT, TemplateStatus.REJECTED].includes(template.status)) {
            throw new BadRequestException('Can only delete draft or rejected templates');
        }
        await this.templateRepository.softDelete(id);
    }

    async submit(id: string, tenantId: string): Promise<TemplateResponseDto> {
        const template = await this.templateRepository.findByIdAndTenant(id, tenantId);
        if (!template) throw new NotFoundException(`Template ${id} not found`);
        if (template.status !== TemplateStatus.DRAFT) throw new BadRequestException('Can only submit draft templates');
        return this.toResponseDto(await this.submitToMetaApi(template, tenantId));
    }

    /**
     * Sync approval status from Meta
     */
    async syncMetaStatus(id: string, tenantId: string): Promise<TemplateResponseDto> {
        const template = await this.templateRepository.findByIdAndTenant(id, tenantId);
        if (!template) throw new NotFoundException(`Template ${id} not found`);
        if (!template.metaTemplateId) throw new BadRequestException('Template not submitted to Meta yet');

        const config = await this.oauthService.getWabaConfig(tenantId);
        if (!config) throw new BadRequestException('WhatsApp account not connected');

        const accessToken = await this.oauthService.getDecryptedToken(tenantId);

        const response = await axios.get(
            `${this.META_GRAPH_API}/${template.metaTemplateId}`,
            {
                headers: { Authorization: `Bearer ${accessToken}` },
                params: { fields: 'id,name,status,rejected_reason' },
            }
        );

        const metaStatus: string = response.data.status;
        template.metaStatus = metaStatus;

        if (metaStatus === 'APPROVED') {
            template.status = TemplateStatus.APPROVED;
            template.approvedAt = new Date();
        } else if (metaStatus === 'REJECTED') {
            template.status = TemplateStatus.REJECTED;
            template.rejectionReason = response.data.rejected_reason || 'Rejected by Meta';
        } else {
            template.status = TemplateStatus.PENDING;
        }

        const updated = await this.templateRepository.save(template);
        this.logger.log(`Synced Meta status for template ${id}: ${metaStatus}`);
        return this.toResponseDto(updated);
    }

    async getStatistics(tenantId: string): Promise<TemplateStatsDto> {
        return this.templateRepository.getStatsByTenant(tenantId);
    }

    async getApproved(tenantId: string): Promise<TemplateResponseDto[]> {
        const templates = await this.templateRepository.findApprovedByTenant(tenantId);
        return templates.map((t) => this.toResponseDto(t));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PRIVATE HELPERS
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Build Meta API components array from template fields.
     * See: https://developers.facebook.com/docs/whatsapp/business-management-api/message-templates
     */
    private buildMetaComponents(template: Template): any[] {
        const components: any[] = [];

        // HEADER
        if (template.headerType && template.headerType !== HeaderType.NONE) {
            if (template.headerType === HeaderType.TEXT && template.headerText) {
                components.push({
                    type: 'HEADER',
                    format: 'TEXT',
                    text: template.headerText,
                });
            } else if ([HeaderType.IMAGE, HeaderType.VIDEO, HeaderType.DOCUMENT].includes(template.headerType)) {
                const headerComp: any = {
                    type: 'HEADER',
                    format: template.headerType, // 'IMAGE' | 'VIDEO' | 'DOCUMENT'
                };

                // Provide example media handle — required by Meta for approval
                if (template.headerMediaHandle) {
                    // If this is a Meta media ID (numeric string), use it directly
                    headerComp.example = {
                        header_handle: [template.headerMediaHandle],
                    };
                } else if (template.headerMediaUrl) {
                    // Fallback: provide a public example URL (Meta accepts during submission)
                    headerComp.example = {
                        header_handle: [template.headerMediaUrl],
                    };
                }

                components.push(headerComp);
            }
        }

        // BODY (required)
        const bodyComp: any = { type: 'BODY', text: template.bodyText };

        // Extract variable count from body text ({{1}}, {{2}}, ...)
        const varMatches = template.bodyText.match(/\{\{(\d+)\}\}/g) || [];
        if (varMatches.length > 0) {
            bodyComp.example = {
                body_text: [varMatches.map((_, i) => `sample_value_${i + 1}`)],
            };
        }
        components.push(bodyComp);

        // FOOTER
        if (template.footerText) {
            components.push({ type: 'FOOTER', text: template.footerText });
        }

        // BUTTONS
        if (template.buttons && template.buttons.length > 0) {
            const metaButtons = template.buttons
                .map((btn) => {
                    if (btn.type === 'QUICK_REPLY') return { type: 'QUICK_REPLY', text: btn.text };
                    if (btn.type === 'URL') {
                        const b: any = { type: 'URL', text: btn.text, url: btn.url };
                        if (btn.example) b.example = btn.example;
                        return b;
                    }
                    if (btn.type === 'PHONE_NUMBER') return { type: 'PHONE_NUMBER', text: btn.text, phone_number: btn.phone_number };
                    return null;
                })
                .filter(Boolean);

            if (metaButtons.length) components.push({ type: 'BUTTONS', buttons: metaButtons });
        }

        return components;
    }

    /**
     * Submit template to Meta Graph API
     */
    private async submitToMetaApi(template: Template, tenantId: string): Promise<Template> {
        const config = await this.oauthService.getWabaConfig(tenantId);

        if (!config) {
            // No WABA connected — mark pending locally
            this.logger.warn(`No WABA config for tenant ${tenantId} — marking template pending locally`);
            template.status = TemplateStatus.PENDING;
            template.submittedAt = new Date();
            template.metaStatus = 'PENDING_LOCAL';
            return this.templateRepository.save(template);
        }

        const accessToken = await this.oauthService.getDecryptedToken(tenantId);
        const wabaId = config.waba_id;

        const components = this.buildMetaComponents(template);
        const metaName = template.name.toLowerCase().replace(/[^a-z0-9_]/g, '_');

        this.logger.log(`Submitting template "${metaName}" to Meta WABA ${wabaId}, components: ${JSON.stringify(components)}`);

        const response = await axios.post(
            `${this.META_GRAPH_API}/${wabaId}/message_templates`,
            {
                name: metaName,
                category: template.category,
                language: template.language,
                components,
            },
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        template.metaTemplateId = response.data.id;
        template.metaStatus = response.data.status || 'PENDING';
        template.status = TemplateStatus.PENDING;
        template.submittedAt = new Date();

        this.logger.log(`Template ${template.id} submitted, Meta ID: ${response.data.id}`);
        return this.templateRepository.save(template);
    }

    private toResponseDto(template: Template): TemplateResponseDto {
        return {
            id: template.id,
            name: template.name,
            description: template.description,
            category: template.category,
            language: template.language,
            status: template.status,
            headerType: template.headerType,
            headerText: template.headerText,
            headerMediaHandle: template.headerMediaHandle,
            headerMediaUrl: template.headerMediaUrl,
            headerMediaFilename: template.headerMediaFilename,
            headerMediaMimeType: template.headerMediaMimeType,
            bodyText: template.bodyText,
            footerText: template.footerText,
            buttons: template.buttons as any,
            variables: template.variables,
            metaTemplateId: template.metaTemplateId,
            metaStatus: template.metaStatus,
            rejectionReason: template.rejectionReason,
            submittedAt: template.submittedAt,
            approvedAt: template.approvedAt,
            createdAt: template.createdAt,
            updatedAt: template.updatedAt,
        };
    }
}
