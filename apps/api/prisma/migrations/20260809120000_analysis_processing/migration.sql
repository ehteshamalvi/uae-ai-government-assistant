-- AlterEnum
DO $$ BEGIN
  ALTER TYPE "AnalysisStatus" ADD VALUE 'PROCESSING';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
