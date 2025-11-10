-- Debug: Periksa apakah table Daily_Note ada
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'Daily_Note';

-- Jika tidak ada, buat table
CREATE TABLE IF NOT EXISTS "Daily_Note" (
    "id" SERIAL PRIMARY KEY,
    "user_id" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "isPeriod" BOOLEAN NOT NULL,
    "flowLevel" TEXT,
    "gejala" TEXT NOT NULL DEFAULT '[]',
    "mood" TEXT NOT NULL,
    "levelEnergy" TEXT NOT NULL,
    "cerita" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Daily_Note_user_id_date_key" UNIQUE ("user_id", "date")
);

-- Periksa struktur table
\d "Daily_Note";