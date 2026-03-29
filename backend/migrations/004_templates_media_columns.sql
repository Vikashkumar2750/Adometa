-- Migration: Add media/header columns to templates table
-- Date: 2026-02-21
-- Description: Adds headerType, headerMediaHandle, headerMediaUrl,
--              headerMediaFilename, headerMediaMimeType columns that
--              the Template entity requires but were missing from the
--              original 003_templates.sql migration. Also converts
--              buttons from TEXT[] to JSONB.

-- 1. Add headerType enum column (default NONE)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='templates' AND column_name='headerType'
    ) THEN
        ALTER TABLE templates
        ADD COLUMN "headerType" VARCHAR(20) NOT NULL DEFAULT 'NONE';
    END IF;
END $$;

-- 2. Add headerMediaHandle
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='templates' AND column_name='headerMediaHandle'
    ) THEN
        ALTER TABLE templates ADD COLUMN "headerMediaHandle" VARCHAR(255);
    END IF;
END $$;

-- 3. Add headerMediaUrl
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='templates' AND column_name='headerMediaUrl'
    ) THEN
        ALTER TABLE templates ADD COLUMN "headerMediaUrl" VARCHAR(512);
    END IF;
END $$;

-- 4. Add headerMediaFilename
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='templates' AND column_name='headerMediaFilename'
    ) THEN
        ALTER TABLE templates ADD COLUMN "headerMediaFilename" VARCHAR(255);
    END IF;
END $$;

-- 5. Add headerMediaMimeType
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='templates' AND column_name='headerMediaMimeType'
    ) THEN
        ALTER TABLE templates ADD COLUMN "headerMediaMimeType" VARCHAR(100);
    END IF;
END $$;

-- 6. Make headerText nullable (was NOT NULL in original migration but entity has nullable: true)
DO $$
BEGIN
    ALTER TABLE templates ALTER COLUMN "headerText" DROP NOT NULL;
EXCEPTION WHEN others THEN NULL;
END $$;

-- 7. Convert buttons from TEXT[] to JSONB (safe cast via temp column)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='templates' AND column_name='buttons'
        AND data_type = 'ARRAY'
    ) THEN
        -- Add temp column
        ALTER TABLE templates ADD COLUMN IF NOT EXISTS "buttons_jsonb" JSONB;
        -- Migrate data (TEXT[] -> JSONB array of strings)
        UPDATE templates SET "buttons_jsonb" = to_jsonb(buttons) WHERE buttons IS NOT NULL;
        -- Drop old column
        ALTER TABLE templates DROP COLUMN buttons;
        -- Rename new column
        ALTER TABLE templates RENAME COLUMN "buttons_jsonb" TO buttons;
    END IF;
END $$;

-- 8. Ensure buttons is JSONB if not already
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='templates' AND column_name='buttons'
        AND data_type != 'jsonb'
    ) THEN
        ALTER TABLE templates ALTER COLUMN buttons TYPE JSONB USING buttons::JSONB;
    END IF;
END $$;
