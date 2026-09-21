import { PageHeader } from "@/components/shared/page-header";
import * as templateService from "@/lib/services/message-templates";
import { TemplateRow } from "./template-row";

export default async function MessageTemplatesPage() {
  const templates = await templateService.listTemplates();

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader title="Message Templates" description="The wording used for every automated WhatsApp message and email. Edit the text, turn WhatsApp off, or leave the email fields blank to skip email for that rule — no code changes needed." />
      <div className="space-y-3">
        {templates.map((t) => (
          <TemplateRow
            key={t.key}
            templateKey={t.key}
            name={t.name}
            body={t.body}
            isActive={t.isActive}
            emailSubject={t.emailSubject}
            emailBody={t.emailBody}
            metaTemplateName={t.metaTemplateName}
            metaTemplateLanguage={t.metaTemplateLanguage}
          />
        ))}
      </div>
    </div>
  );
}
