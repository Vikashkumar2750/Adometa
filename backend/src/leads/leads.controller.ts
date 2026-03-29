import {
    Controller, Post, Get, Patch, Body, Param, Query,
    UseGuards, Res, HttpCode, HttpStatus, ParseIntPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import type { Response } from 'express';
import { LeadsService } from './leads.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Leads')
@Controller('leads')
export class LeadsController {
    constructor(private readonly leadsService: LeadsService) { }

    /** Public: Contact form submission */
    @Post()
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Submit contact/lead form (public)' })
    async create(@Body() dto: CreateLeadDto) {
        return this.leadsService.create(dto);
    }

    /** Super admin: list all leads */
    @Get()
    @ApiBearerAuth()
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Roles('SUPER_ADMIN')
    @ApiOperation({ summary: 'List all leads (SUPER_ADMIN)' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiQuery({ name: 'status', required: false })
    async findAll(
        @Query('page', new ParseIntPipe({ optional: true })) page?: number,
        @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
        @Query('status') status?: string,
    ) {
        return this.leadsService.findAll(page, limit, status);
    }

    /** Super admin: download leads as CSV */
    @Get('export/csv')
    @ApiBearerAuth()
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Roles('SUPER_ADMIN')
    @ApiOperation({ summary: 'Export all leads as CSV (SUPER_ADMIN)' })
    async exportCsv(@Res() res: Response) {
        const csv = await this.leadsService.exportCsv();
        const filename = `leads_${new Date().toISOString().slice(0, 10)}.csv`;
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(csv);
    }

    /** Super admin: update lead status */
    @Patch(':id/status')
    @ApiBearerAuth()
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Roles('SUPER_ADMIN')
    @ApiOperation({ summary: 'Update lead status (SUPER_ADMIN)' })
    async updateStatus(
        @Param('id') id: string,
        @Body() body: { status: string; notes?: string },
    ) {
        return this.leadsService.updateStatus(id, body.status, body.notes);
    }
}
