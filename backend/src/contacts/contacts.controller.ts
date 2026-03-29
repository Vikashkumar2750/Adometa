import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    Query,
    ParseIntPipe,
    DefaultValuePipe,
    UploadedFile,
    UseInterceptors,
    UseGuards,
    Res,
    Req,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiConsumes, ApiBearerAuth } from '@nestjs/swagger';
import type { Response, Request } from 'express';
import { ContactsService } from './contacts.service';
import {
    CreateContactDto,
    UpdateContactDto,
    ContactResponseDto,
    PaginatedContactsResponseDto,
    BulkImportResponseDto,
} from './dto/contact.dto';

/**
 * Contacts Controller
 * 
 * Handles all contact-related HTTP requests
 */
@ApiTags('Contacts')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('contacts')
export class ContactsController {
    constructor(private readonly contactsService: ContactsService) { }

    @Post()
    @ApiOperation({ summary: 'Create a new contact' })
    @ApiResponse({ status: 201, description: 'Contact created successfully', type: ContactResponseDto })
    @ApiResponse({ status: 409, description: 'Contact already exists' })
    async create(
        @Req() req: any,
        @Body() createContactDto: CreateContactDto,
    ): Promise<ContactResponseDto> {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            throw new Error('Tenant ID is required. Only tenant users can create contacts.');
        }
        return this.contactsService.create(tenantId, createContactDto);
    }

    @Get()
    @ApiOperation({ summary: 'Get all contacts (paginated)' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiQuery({ name: 'search', required: false, type: String })
    @ApiQuery({ name: 'tags', required: false, type: [String] })
    @ApiQuery({ name: 'status', required: false, enum: ['active', 'blocked', 'unsubscribed'] })
    @ApiResponse({ status: 200, description: 'Contacts retrieved successfully', type: PaginatedContactsResponseDto })
    async findAll(
        @Req() req: any,
        @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
        @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
        @Query('search') search?: string,
        @Query('tags') tags?: string | string[],
        @Query('status') status?: string,
    ): Promise<PaginatedContactsResponseDto> {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            throw new Error('Tenant ID is required. Only tenant users can access contacts.');
        }
        const tagsArray = tags ? (Array.isArray(tags) ? tags : [tags]) : undefined;
        return this.contactsService.findAll(tenantId, page, limit, search, tagsArray, status);
    }

    @Get('statistics')
    @ApiOperation({ summary: 'Get contact statistics' })
    @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
    async getStatistics(@Req() req: any) {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            throw new Error('Tenant ID is required.');
        }
        return this.contactsService.getStatistics(tenantId);
    }

    @Get('tags')
    @ApiOperation({ summary: 'Get all tags' })
    @ApiResponse({ status: 200, description: 'Tags retrieved successfully', type: [String] })
    async getAllTags(@Req() req: any): Promise<string[]> {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            throw new Error('Tenant ID is required.');
        }
        return this.contactsService.getAllTags(tenantId);
    }

    @Post('import')
    @ApiOperation({ summary: 'Bulk import contacts from CSV' })
    @ApiConsumes('multipart/form-data')
    @ApiResponse({ status: 201, description: 'Import completed', type: BulkImportResponseDto })
    @UseInterceptors(FileInterceptor('file'))
    async bulkImport(
        @Req() req: any,
        @UploadedFile() file: Express.Multer.File,
    ): Promise<BulkImportResponseDto> {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            throw new Error('Tenant ID is required.');
        }
        const csvData = file.buffer.toString('utf-8');
        return this.contactsService.bulkImport(tenantId, csvData);
    }

    @Get('export')
    @ApiOperation({ summary: 'Export contacts to CSV' })
    @ApiResponse({ status: 200, description: 'Export successful' })
    async exportToCsv(@Req() req: any, @Res() res: Response) {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            throw new Error('Tenant ID is required.');
        }
        const csv = await this.contactsService.exportToCsv(tenantId);

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=contacts.csv');
        res.send(csv);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get contact by ID' })
    @ApiResponse({ status: 200, description: 'Contact retrieved successfully', type: ContactResponseDto })
    @ApiResponse({ status: 404, description: 'Contact not found' })
    async findOne(
        @Req() req: any,
        @Param('id') id: string,
    ): Promise<ContactResponseDto> {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            throw new Error('Tenant ID is required.');
        }
        return this.contactsService.findOne(tenantId, id);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update contact' })
    @ApiResponse({ status: 200, description: 'Contact updated successfully', type: ContactResponseDto })
    @ApiResponse({ status: 404, description: 'Contact not found' })
    async update(
        @Req() req: any,
        @Param('id') id: string,
        @Body() updateContactDto: UpdateContactDto,
    ): Promise<ContactResponseDto> {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            throw new Error('Tenant ID is required.');
        }
        return this.contactsService.update(tenantId, id, updateContactDto);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete contact' })
    @ApiResponse({ status: 200, description: 'Contact deleted successfully' })
    @ApiResponse({ status: 404, description: 'Contact not found' })
    async remove(
        @Req() req: any,
        @Param('id') id: string,
    ): Promise<{ message: string }> {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            throw new Error('Tenant ID is required.');
        }
        await this.contactsService.remove(tenantId, id);
        return { message: 'Contact deleted successfully' };
    }
}
