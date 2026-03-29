import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateContactsTable1771005600000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create contacts table
        await queryRunner.createTable(
            new Table({
                name: 'contacts',
                columns: [
                    {
                        name: 'id',
                        type: 'uuid',
                        isPrimary: true,
                        generationStrategy: 'uuid',
                        default: 'uuid_generate_v4()',
                    },
                    {
                        name: 'tenant_id',
                        type: 'uuid',
                        isNullable: false,
                    },
                    {
                        name: 'phone_number',
                        type: 'varchar',
                        length: '20',
                        isNullable: false,
                    },
                    {
                        name: 'first_name',
                        type: 'varchar',
                        length: '100',
                        isNullable: true,
                    },
                    {
                        name: 'last_name',
                        type: 'varchar',
                        length: '100',
                        isNullable: true,
                    },
                    {
                        name: 'email',
                        type: 'varchar',
                        length: '255',
                        isNullable: true,
                    },
                    {
                        name: 'tags',
                        type: 'text[]',
                        default: "'{}'",
                    },
                    {
                        name: 'custom_fields',
                        type: 'jsonb',
                        isNullable: true,
                    },
                    {
                        name: 'status',
                        type: 'varchar',
                        length: '20',
                        default: "'active'",
                    },
                    {
                        name: 'created_at',
                        type: 'timestamp',
                        default: 'CURRENT_TIMESTAMP',
                    },
                    {
                        name: 'updated_at',
                        type: 'timestamp',
                        default: 'CURRENT_TIMESTAMP',
                    },
                    {
                        name: 'deleted_at',
                        type: 'timestamp',
                        isNullable: true,
                    },
                ],
            }),
            true,
        );

        // Create unique index on tenant_id + phone_number
        await queryRunner.createIndex(
            'contacts',
            new TableIndex({
                name: 'IDX_contacts_tenant_phone',
                columnNames: ['tenant_id', 'phone_number'],
                isUnique: true,
            }),
        );

        // Create index on tenant_id
        await queryRunner.createIndex(
            'contacts',
            new TableIndex({
                name: 'IDX_contacts_tenant_id',
                columnNames: ['tenant_id'],
            }),
        );

        // Create index on status
        await queryRunner.createIndex(
            'contacts',
            new TableIndex({
                name: 'IDX_contacts_status',
                columnNames: ['status'],
            }),
        );

        // Create index on phone_number
        await queryRunner.createIndex(
            'contacts',
            new TableIndex({
                name: 'IDX_contacts_phone_number',
                columnNames: ['phone_number'],
            }),
        );

        // Add foreign key to tenants table
        await queryRunner.createForeignKey(
            'contacts',
            new TableForeignKey({
                name: 'FK_contacts_tenant',
                columnNames: ['tenant_id'],
                referencedTableName: 'tenants',
                referencedColumnNames: ['id'],
                onDelete: 'CASCADE',
            }),
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop foreign key
        await queryRunner.dropForeignKey('contacts', 'FK_contacts_tenant');

        // Drop indexes
        await queryRunner.dropIndex('contacts', 'IDX_contacts_phone_number');
        await queryRunner.dropIndex('contacts', 'IDX_contacts_status');
        await queryRunner.dropIndex('contacts', 'IDX_contacts_tenant_id');
        await queryRunner.dropIndex('contacts', 'IDX_contacts_tenant_phone');

        // Drop table
        await queryRunner.dropTable('contacts');
    }
}
