-- CreateTable
CREATE TABLE IF NOT EXISTS "Profile" (
    "id" SERIAL NOT NULL,
    "authUserId" TEXT NOT NULL,
    "displayName" TEXT,
    "githubUsername" TEXT,
    "bio" TEXT,
    "learningGoals" TEXT,
    "passwordSetAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Profile_authUserId_key" ON "Profile"("authUserId");
