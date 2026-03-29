import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Segment } from './entities/segment.entity';
import { SegmentRepository } from './repositories/segment.repository';
import { SegmentsService } from './segments.service';
import { SegmentsController } from './segments.controller';

@Module({
    imports: [TypeOrmModule.forFeature([Segment])],
    controllers: [SegmentsController],
    providers: [SegmentsService, SegmentRepository],
    exports: [SegmentsService, SegmentRepository],
})
export class SegmentsModule { }
