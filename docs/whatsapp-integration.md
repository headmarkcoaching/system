# WhatsApp Integration

`src/lib/whatsapp/provider.ts` defines a small `WhatsAppProvider` interface (`send(to, body)`); nothing else in the app depends on which provider is active. Select one with `WHATSAPP_PROVIDER`.

- **`console`** (default) — logs the message and records it in `WhatsAppMessage` as `SENT`. No real delivery, but every part of the pipeline (templates, queueing, status tracking, the Communication Center UI) is fully exercised. This is what runs out of the box, since the project has no real WhatsApp Business API credentials.
- **`meta`** — Meta WhatsApp Cloud API (`META_WHATSAPP_TOKEN`, `META_WHATSAPP_PHONE_ID`).
- **`twilio`** — Twilio's WhatsApp API (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM`).

Both real providers are written and ready — they just need real credentials in `.env`; neither has been exercised live (only the console path has, since no credentials exist in this environment).

## Message templates

Wording lives in `MessageTemplate` rows (Settings → Message Templates), editable from the UI with `{{variable}}` placeholders — no redeploy needed to change what a message says. 11 named templates cover lead welcome, announcements, and every automation rule that has a parent/counselor-facing message.

## Delivery status

`WhatsAppMessage.status` tracks `QUEUED` → `SENT` → `DELIVERED` → `READ`, or `FAILED` with a `failedReason`. The Communication Center (`/admin/communication`) shows live Sent/Delivered/Failed/Pending counts; `/admin/command-center` and `/admin/system-health` (Phase 3E/3F) roll these up into the academy-wide health view.

## Notification preferences

`/settings/notifications` (every role) — per-user WhatsApp/Email/SMS toggles for non-critical notifications. `PAYMENT_REMINDER`, `PERFORMANCE_ALERT`, and `ATTENDANCE_ALERT` are hardcoded critical and bypass the preference.
