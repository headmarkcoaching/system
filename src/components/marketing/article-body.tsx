import * as React from "react";
import Link from "next/link";
import { Lightbulb } from "lucide-react";

/**
 * Renders an article's plain-text body. Supported, one per line or block:
 *   ## Heading        ### Smaller heading
 *   - bullet          1. numbered step
 *   > a tip, shown as a highlighted note
 *   **bold**          [link text](/page or https://...)
 * Everything else is a paragraph. The text is only ever placed into React elements (never as raw HTML), so
 * nothing an editor types can inject markup or scripts.
 */

const LINK_OR_BOLD = /(\*\*[^*]+\*\*|\[[^\]]+\]\([^)\s]+\))/g;

function Inline({ text }: { text: string }) {
  const parts = text.split(LINK_OR_BOLD).filter((p) => p !== "");
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**") && part.length > 4) return <strong key={i} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>;
        const link = part.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);
        if (link) {
          const [, label, href] = link;
          if (href.startsWith("/") && !href.startsWith("//")) return <Link key={i} href={href} className="font-semibold text-primary underline underline-offset-2">{label}</Link>;
          if (/^https:\/\//i.test(href)) return <a key={i} href={href} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary underline underline-offset-2">{label}</a>;
          return <React.Fragment key={i}>{label}</React.Fragment>;
        }
        return <React.Fragment key={i}>{part}</React.Fragment>;
      })}
    </>
  );
}

export function ArticleBody({ body }: { body: string }) {
  const blocks = body.replace(/\r\n/g, "\n").trim().split(/\n{2,}/);
  return (
    <div className="space-y-5 text-base leading-relaxed text-foreground/85">
      {blocks.map((block, i) => {
        const lines = block.split("\n").map((l) => l.trimEnd());
        const first = lines[0];

        if (first.startsWith("## ")) return <h2 key={i} className="pt-4 font-display text-2xl font-bold text-foreground">{first.slice(3)}</h2>;
        if (first.startsWith("### ")) return <h3 key={i} className="pt-2 font-display text-xl font-bold text-foreground">{first.slice(4)}</h3>;

        if (lines.every((l) => l.startsWith("- "))) {
          return (
            <ul key={i} className="list-disc space-y-2 pl-6 marker:text-primary">
              {lines.map((l, j) => (
                <li key={j}><Inline text={l.slice(2)} /></li>
              ))}
            </ul>
          );
        }
        if (lines.every((l) => /^\d+\.\s/.test(l))) {
          return (
            <ol key={i} className="list-decimal space-y-2 pl-6 marker:font-semibold marker:text-primary">
              {lines.map((l, j) => (
                <li key={j}><Inline text={l.replace(/^\d+\.\s/, "")} /></li>
              ))}
            </ol>
          );
        }
        if (lines.every((l) => l.startsWith("> "))) {
          return (
            <aside key={i} className="flex gap-3 rounded-xl border border-cta/25 bg-cta-wash p-4 text-sm text-foreground/85">
              <Lightbulb aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-cta" />
              <p><Inline text={lines.map((l) => l.slice(2)).join(" ")} /></p>
            </aside>
          );
        }
        return <p key={i}><Inline text={lines.join(" ")} /></p>;
      })}
    </div>
  );
}
