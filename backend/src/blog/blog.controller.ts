import {
    Controller, Get, Post, Patch, Delete, Body, Param,
    Query, UseGuards, ParseIntPipe, HttpCode, HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { BlogService } from './blog.service';
import { BlogPost, BlogStatus } from './entities/blog-post.entity';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Blog')
@Controller('blog')
export class BlogController {
    constructor(private readonly blogService: BlogService) { }

    // ── Public endpoints ──────────────────────────────────────────

    @Get('public')
    @ApiOperation({ summary: 'List published blog posts (public)' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiQuery({ name: 'category', required: false })
    async listPublished(
        @Query('page', new ParseIntPipe({ optional: true })) page?: number,
        @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
        @Query('category') category?: string,
    ) {
        return this.blogService.findPublished(page, limit, category);
    }

    @Get('public/categories')
    @ApiOperation({ summary: 'Get all blog categories (public)' })
    async getCategories() {
        return this.blogService.getCategories();
    }

    @Get('public/:slug')
    @ApiOperation({ summary: 'Get a published blog post by slug (public)' })
    async getBySlug(@Param('slug') slug: string) {
        return this.blogService.findBySlug(slug);
    }

    // ── Admin endpoints ───────────────────────────────────────────

    @Post()
    @ApiBearerAuth()
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Roles('SUPER_ADMIN')
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Create blog post (SUPER_ADMIN)' })
    async create(@Body() dto: Partial<BlogPost>) {
        return this.blogService.create(dto);
    }

    @Get()
    @ApiBearerAuth()
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Roles('SUPER_ADMIN')
    @ApiOperation({ summary: 'List all blog posts incl. drafts (SUPER_ADMIN)' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiQuery({ name: 'status', required: false })
    @ApiQuery({ name: 'search', required: false })
    async findAll(
        @Query('page', new ParseIntPipe({ optional: true })) page?: number,
        @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
        @Query('status') status?: string,
        @Query('search') search?: string,
    ) {
        return this.blogService.findAll(page, limit, status as BlogStatus, search);
    }

    @Get(':id')
    @ApiBearerAuth()
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Roles('SUPER_ADMIN')
    @ApiOperation({ summary: 'Get blog post by ID (SUPER_ADMIN)' })
    async findOne(@Param('id') id: string) {
        return this.blogService.findById(id);
    }

    @Patch(':id')
    @ApiBearerAuth()
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Roles('SUPER_ADMIN')
    @ApiOperation({ summary: 'Update blog post (SUPER_ADMIN)' })
    async update(@Param('id') id: string, @Body() dto: Partial<BlogPost>) {
        return this.blogService.update(id, dto);
    }

    @Delete(':id')
    @ApiBearerAuth()
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Roles('SUPER_ADMIN')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Delete blog post (SUPER_ADMIN)' })
    async remove(@Param('id') id: string) {
        await this.blogService.remove(id);
    }
}
