"use client";

import * as React from "react";
import { toast } from "sonner";
import { CheckCircle2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDate } from "@/lib/utils";
import {
  updateWhatsAppSettingsAction,
  updateEmailSettingsAction,
  updateGoogleClientCredentialsAction,
  disconnectGoogleAction,
  updateFileStorageProviderAction,
} from "./actions";

interface DisplaySettings {
  whatsappProvider: "CONSOLE" | "META" | "TWILIO";
  metaWhatsappToken: string | null;
  metaWhatsappPhoneId: string | null;
  twilioAccountSid: string | null;
  twilioAuthToken: string | null;
  twilioWhatsappFrom: string | null;
  emailProvider: "CONSOLE" | "SMTP";
  smtpHost: string | null;
  smtpPort: number | null;
  smtpUser: string | null;
  smtpPassword: string | null;
  smtpFrom: string | null;
  googleClientId: string | null;
  googleClientSecretSet: boolean;
  googleConnectedEmail: string | null;
  googleConnectedAt: Date | null;
  googleCalendarId: string | null;
  fileStorageProvider: "LOCAL" | "GOOGLE_DRIVE";
}

export function IntegrationsForm({
  settings,
  googleStatus,
  googleError,
  googleRedirectUri,
}: {
  settings: DisplaySettings;
  googleStatus?: string;
  googleError?: string;
  googleRedirectUri: string;
}) {
  React.useEffect(() => {
    if (googleStatus === "connected") toast.success("Google account connected");
    if (googleError) toast.error(decodeURIComponent(googleError));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      <WhatsAppCard settings={settings} />
      <EmailCard settings={settings} />
      <GoogleCard settings={settings} redirectUri={googleRedirectUri} />
      <FileStorageCard settings={settings} />
    </div>
  );
}

function SecretHint({ isSet }: { isSet: boolean }) {
  if (!isSet) return null;
  return (
    <span className="ml-2 inline-flex items-center gap-1 text-xs text-success">
      <CheckCircle2 className="h-3 w-3" /> saved — leave blank to keep
    </span>
  );
}

function WhatsAppCard({ settings }: { settings: DisplaySettings }) {
  const [provider, setProvider] = React.useState(settings.whatsappProvider);
  const [metaToken, setMetaToken] = React.useState("");
  const [metaPhoneId, setMetaPhoneId] = React.useState(settings.metaWhatsappPhoneId ?? "");
  const [twilioSid, setTwilioSid] = React.useState(settings.twilioAccountSid ?? "");
  const [twilioToken, setTwilioToken] = React.useState("");
  const [twilioFrom, setTwilioFrom] = React.useState(settings.twilioWhatsappFrom ?? "");
  const [pending, setPending] = React.useState(false);

  async function handleSave() {
    setPending(true);
    try {
      const result = await updateWhatsAppSettingsAction({
        whatsappProvider: provider,
        metaWhatsappToken: metaToken,
        metaWhatsappPhoneId: metaPhoneId,
        twilioAccountSid: twilioSid,
        twilioAuthToken: twilioToken,
        twilioWhatsappFrom: twilioFrom,
      });
      if (result?.error) toast.error(result.error);
      else {
        toast.success("WhatsApp settings saved");
        setMetaToken("");
        setTwilioToken("");
      }
    } catch {
      toast.error("Could not save WhatsApp settings.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">WhatsApp</CardTitle>
        <CardDescription>Where class reminders, payment reminders, and other automated messages get sent.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label>Provider</Label>
          <Select value={provider} onValueChange={(v) => setProvider(v as typeof provider)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="CONSOLE">Off (log only, no real messages)</SelectItem>
              <SelectItem value="META">Meta WhatsApp Cloud API</SelectItem>
              <SelectItem value="TWILIO">Twilio</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {provider === "META" && (
          <>
            <div className="space-y-1.5">
              <Label>
                Access Token <SecretHint isSet={Boolean(settings.metaWhatsappToken)} />
              </Label>
              <Input type="password" value={metaToken} onChange={(e) => setMetaToken(e.target.value)} placeholder="From Meta for Developers → WhatsApp → API Setup" />
            </div>
            <div className="space-y-1.5">
              <Label>Phone Number ID</Label>
              <Input value={metaPhoneId} onChange={(e) => setMetaPhoneId(e.target.value)} />
            </div>
          </>
        )}

        {provider === "TWILIO" && (
          <>
            <div className="space-y-1.5">
              <Label>Account SID</Label>
              <Input value={twilioSid} onChange={(e) => setTwilioSid(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>
                Auth Token <SecretHint isSet={Boolean(settings.twilioAuthToken)} />
              </Label>
              <Input type="password" value={twilioToken} onChange={(e) => setTwilioToken(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>WhatsApp From Number</Label>
              <Input value={twilioFrom} onChange={(e) => setTwilioFrom(e.target.value)} placeholder="+1415..." />
            </div>
          </>
        )}

        <Button onClick={handleSave} disabled={pending}>
          {pending ? "Saving…" : "Save WhatsApp Settings"}
        </Button>
      </CardContent>
    </Card>
  );
}

function EmailCard({ settings }: { settings: DisplaySettings }) {
  const [provider, setProvider] = React.useState(settings.emailProvider);
  const [host, setHost] = React.useState(settings.smtpHost ?? "");
  const [port, setPort] = React.useState(settings.smtpPort ? String(settings.smtpPort) : "587");
  const [user, setUser] = React.useState(settings.smtpUser ?? "");
  const [password, setPassword] = React.useState("");
  const [from, setFrom] = React.useState(settings.smtpFrom ?? "");
  const [pending, setPending] = React.useState(false);

  async function handleSave() {
    setPending(true);
    try {
      const result = await updateEmailSettingsAction({
        emailProvider: provider,
        smtpHost: host,
        smtpPort: port,
        smtpUser: user,
        smtpPassword: password,
        smtpFrom: from,
      });
      if (result?.error) toast.error(result.error);
      else {
        toast.success("Email settings saved");
        setPassword("");
      }
    } catch {
      toast.error("Could not save email settings.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Email</CardTitle>
        <CardDescription>Where weekly reports, reminders, and alerts get emailed from.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label>Provider</Label>
          <Select value={provider} onValueChange={(v) => setProvider(v as typeof provider)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="CONSOLE">Off (log only, no real emails)</SelectItem>
              <SelectItem value="SMTP">SMTP (Gmail, Outlook, or any mailbox)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {provider === "SMTP" && (
          <>
            <div className="space-y-1.5">
              <Label>SMTP Host</Label>
              <Input value={host} onChange={(e) => setHost(e.target.value)} placeholder="smtp.gmail.com" />
            </div>
            <div className="space-y-1.5">
              <Label>Port</Label>
              <Input type="number" value={port} onChange={(e) => setPort(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Username (usually your email address)</Label>
              <Input value={user} onChange={(e) => setUser(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>
                Password <SecretHint isSet={Boolean(settings.smtpPassword)} />
              </Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Gmail needs an App Password, not your normal password" />
            </div>
            <div className="space-y-1.5">
              <Label>From Address</Label>
              <Input value={from} onChange={(e) => setFrom(e.target.value)} placeholder="Defaults to the username above" />
            </div>
          </>
        )}

        <Button onClick={handleSave} disabled={pending}>
          {pending ? "Saving…" : "Save Email Settings"}
        </Button>
      </CardContent>
    </Card>
  );
}

function GoogleCard({ settings, redirectUri }: { settings: DisplaySettings; redirectUri: string }) {
  const [clientId, setClientId] = React.useState(settings.googleClientId ?? "");
  const [clientSecret, setClientSecret] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [disconnecting, setDisconnecting] = React.useState(false);

  async function handleSaveClient() {
    setPending(true);
    try {
      const result = await updateGoogleClientCredentialsAction({ googleClientId: clientId, googleClientSecret: clientSecret });
      if (result?.error) toast.error(result.error);
      else {
        toast.success("Google Client ID/Secret saved — you can connect your account now");
        setClientSecret("");
      }
    } catch {
      toast.error("Could not save Google client credentials.");
    } finally {
      setPending(false);
    }
  }

  async function handleDisconnect() {
    setDisconnecting(true);
    try {
      await disconnectGoogleAction();
      toast.success("Google account disconnected");
    } catch {
      toast.error("Could not disconnect.");
    } finally {
      setDisconnecting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Google (Meet + Drive)</CardTitle>
        <CardDescription>One Google account powers both auto-created Google Meet links for live classes and Google Drive file storage.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 rounded-md border border-border p-3">
          {settings.googleConnectedEmail ? (
            <>
              <Badge variant="success">Connected</Badge>
              <span className="text-sm">
                {settings.googleConnectedEmail}
                {settings.googleConnectedAt && <span className="text-muted-foreground"> · since {formatDate(settings.googleConnectedAt)}</span>}
              </span>
            </>
          ) : (
            <>
              <Badge variant="outline">Not connected</Badge>
              <span className="text-sm text-muted-foreground">No Google account connected yet</span>
            </>
          )}
        </div>

        <div className="space-y-1.5">
          <Label>Client ID</Label>
          <Input value={clientId} onChange={(e) => setClientId(e.target.value)} placeholder="From Google Cloud Console → Credentials" />
        </div>
        <div className="space-y-1.5">
          <Label>
            Client Secret <SecretHint isSet={settings.googleClientSecretSet} />
          </Label>
          <Input type="password" value={clientSecret} onChange={(e) => setClientSecret(e.target.value)} />
        </div>
        <p className="text-xs text-muted-foreground">
          One-time setup in{" "}
          <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
            Google Cloud Console
          </a>
          : enable the Calendar API and Drive API, create an OAuth Client ID (Web application), and add this exact redirect URI —{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-[11px]">{redirectUri}</code>.
        </p>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={handleSaveClient} disabled={pending}>
            {pending ? "Saving…" : "Save Client ID/Secret"}
          </Button>
          <Button asChild>
            <a href="/api/integrations/google/connect">
              {settings.googleConnectedEmail ? "Reconnect Google Account" : "Connect Google Account"} <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
            </a>
          </Button>
          {settings.googleConnectedEmail && (
            <Button variant="destructive" onClick={handleDisconnect} disabled={disconnecting}>
              {disconnecting ? "Disconnecting…" : "Disconnect"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function FileStorageCard({ settings }: { settings: DisplaySettings }) {
  const [provider, setProvider] = React.useState(settings.fileStorageProvider);
  const [pending, setPending] = React.useState(false);

  async function handleSave() {
    setPending(true);
    try {
      const result = await updateFileStorageProviderAction({ fileStorageProvider: provider });
      if (result?.error) toast.error(result.error);
      else toast.success("File storage settings saved");
    } catch {
      toast.error("Could not save file storage settings.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">File Storage</CardTitle>
        <CardDescription>Where uploaded homework, receipts, and study material get stored. Files already uploaded keep working no matter which provider is active.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label>Provider</Label>
          <Select value={provider} onValueChange={(v) => setProvider(v as typeof provider)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="LOCAL">Local disk (default)</SelectItem>
              <SelectItem value="GOOGLE_DRIVE">Google Drive</SelectItem>
            </SelectContent>
          </Select>
          {provider === "GOOGLE_DRIVE" && !settings.googleConnectedEmail && (
            <p className="text-xs text-destructive">Connect a Google account above first — new uploads will fail until then.</p>
          )}
        </div>
        <Button onClick={handleSave} disabled={pending}>
          {pending ? "Saving…" : "Save File Storage Settings"}
        </Button>
      </CardContent>
    </Card>
  );
}
