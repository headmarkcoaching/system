-- CreateEnum
CREATE TYPE "WhatsAppProviderType" AS ENUM ('CONSOLE', 'META', 'TWILIO');

-- CreateEnum
CREATE TYPE "EmailProviderType" AS ENUM ('CONSOLE', 'SMTP');

-- CreateEnum
CREATE TYPE "FileStorageProviderType" AS ENUM ('LOCAL', 'GOOGLE_DRIVE');

-- CreateTable
CREATE TABLE "integration_settings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "whatsappProvider" "WhatsAppProviderType" NOT NULL DEFAULT 'CONSOLE',
    "metaWhatsappToken" TEXT,
    "metaWhatsappPhoneId" TEXT,
    "twilioAccountSid" TEXT,
    "twilioAuthToken" TEXT,
    "twilioWhatsappFrom" TEXT,
    "emailProvider" "EmailProviderType" NOT NULL DEFAULT 'CONSOLE',
    "smtpHost" TEXT,
    "smtpPort" INTEGER,
    "smtpUser" TEXT,
    "smtpPassword" TEXT,
    "smtpFrom" TEXT,
    "googleClientId" TEXT,
    "googleClientSecret" TEXT,
    "googleRefreshToken" TEXT,
    "googleConnectedEmail" TEXT,
    "googleCalendarId" TEXT,
    "googleConnectedAt" TIMESTAMP(3),
    "fileStorageProvider" "FileStorageProviderType" NOT NULL DEFAULT 'LOCAL',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT,

    CONSTRAINT "integration_settings_pkey" PRIMARY KEY ("id")
);
