-- Zoom connection for live classes (secrets are stored encrypted by the app).
ALTER TABLE "integration_settings" ADD COLUMN "zoomAccountId" TEXT;
ALTER TABLE "integration_settings" ADD COLUMN "zoomClientId" TEXT;
ALTER TABLE "integration_settings" ADD COLUMN "zoomClientSecret" TEXT;
ALTER TABLE "integration_settings" ADD COLUMN "zoomWebhookSecret" TEXT;
ALTER TABLE "integration_settings" ADD COLUMN "zoomHostEmail" TEXT;
ALTER TABLE "integration_settings" ADD COLUMN "zoomConnectedAt" TIMESTAMP(3);
