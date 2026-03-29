import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateCampaignsTable1707591000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(
            new Table({
                name: 'campaigns',
                columns: [
                    {
                        name: 'id',
                        type: 'uuid',
                        isPrimary: true,
                        generationStrategy: 'uuid',
                        default: 'uuid_generate_v4()',
                    },
                    {
                        name: 'tenantId',
                        type: 'varchar',
                        isNullable: false,
                    },
                    {
                        name: 'name',
                        type: 'varchar',
                        isNullable: false,
                    },
                    {
                        name: 'description',
                        type: 'text',
                        isNullable: true,
                    },
                    {
                        name: 'templateId',
                        type: 'varchar',
                        isNullable: false,
                    },
                    {
                        name: 'templateName',
                        type: 'varchar',
                        isNullable: true,
                    },
                    {
                        name: 'segmentId',
                        type: 'varchar',
                        isNullable: true,
                    },
                    {
                        name: 'segmentName',
                        type: 'varchar',
                        isNullable: true,
                    },
                    {
                        name: 'status',
                        type: 'varchar',
                        default: "'draft'",
                        isNullable: false,
                    },
                    {
                        name: 'scheduledAt',
                        type: 'timestamp',
                        isNullable: true,
                    },
                    {
                        name: 'startedAt',
                        type: 'timestamp',
                        isNullable: true,
                    },
                    {
                        name: 'completedAt',
                        type: 'timestamp',
                        isNullable: true,
                    },
                    {
                        name: 'totalRecipients',
                        type: 'int',
                        default: 0,
                    },
                    {
                        name: 'sentCount',
                        type: 'int',
                        default: 0,
                    },
                    {
                        name: 'deliveredCount',
                        type: 'int',
                        default: 0,
                    },
                    {
                        name: 'readCount',
                        type: 'int',
                        default: 0,
                    },
                    {
                        name: 'failedCount',
                        type: 'int',
                        default: 0,
                    },
                    {
                        name: 'variables',
                        type: 'jsonb',
                        isNullable: true,
                    },
                    {
                        name: 'contactIds',
                        type: 'text',
                        isArray: true,
                        isNullable: true,
                    },
                    {
                        name: 'createdAt',
                        type: 'timestamp',
                        default: 'now()',
                    },
                    {
                        name: 'updatedAt',
                        type: 'timestamp',
                        default: 'now()',
                    },
                    {
                        name: 'deletedAt',
                        type: 'timestamp',
                        isNullable: true,
                    },
                ],
            }),
            true,
        );

        // Create indexes
        await queryRunner.createIndex(
            'campaigns',
            new TableIndex({
                name: 'IDX_CAMPAIGNS_TENANT',
                columnNames: ['tenantId'],
            }),
        );

        await queryRunner.createIndex(
            'campaigns',
            new TableIndex({
                name: 'IDX_CAMPAIGNS_STATUS',
                columnNames: ['status'],
            }),
        );

        await queryRunner.createIndex(
            'campaigns',
            new TableIndex({
                name: 'IDX_CAMPAIGNS_SCHEDULED',
                columnNames: ['scheduledAt'],
            }),
        );

        await queryRunner.createIndex(
            'campaigns',
            new TableIndex({
                name: 'IDX_CAMPAIGNS_DELETED',
                columnNames: ['deletedAt'],
            }),
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable('campaigns');
    }
}
