// spec/site/index.md, "Each policy has its own public address"
import documents from "@repo/deployment/alpha-legal.json" with { type: "json" };
import { Mark } from "@repo/ui";
import type { ReactNode } from "react";
import { privacyPath, termsPath } from "../gen/site.ts";

export const policyPages = [
  { path: termsPath, document: documents.terms },
  { path: privacyPath, document: documents.privacy },
];

type PolicyPage = (typeof policyPages)[number];

export function policyAt(pathname: string): PolicyPage | undefined {
  return policyPages.find(({ path }) => path === pathname || `${path}/` === pathname);
}

function policyParagraph(paragraph: string): ReactNode[] {
  const fragments: ReactNode[] = [];
  let from = 0;
  for (const match of paragraph.matchAll(/https:\/\/[^\s<>)]+?(?=[.,;!?]?(?:\s|\)|$))/g)) {
    const [url] = match;
    const offset = match.index;
    fragments.push(paragraph.slice(from, offset), <a className="break-all text-primary underline underline-offset-4" href={url} key={offset}>{url}</a>);
    from = offset + url.length;
  }
  fragments.push(paragraph.slice(from));
  return fragments;
}

export function LegalPage({ page }: { readonly page: PolicyPage }) {
  const { title, revision, sections } = page.document;
  return (
    <div className="mx-auto max-w-180 px-5 py-12 sm:px-8 sm:py-16">
      <header className="mb-10">
        <a href="/" className="inline-flex items-center gap-2.5 text-xl font-semibold tracking-tight">
          <Mark aria-hidden className="text-alpha" />
          Alpha
        </a>
      </header>
      <main>
        <article aria-labelledby="policy-title">
          <h1 id="policy-title" className="text-balance text-title font-semibold tracking-tight">{title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">Effective date <time dateTime={revision}>{revision}</time></p>
          {sections.map(({ title: heading, paragraphs }) => (
            <section className="mt-8 grid gap-3" key={heading}>
              <h2 className="text-lg font-semibold">{heading}</h2>
              {paragraphs.map((paragraph) => <p className="text-prose" key={paragraph}>{policyParagraph(paragraph)}</p>)}
            </section>
          ))}
        </article>
      </main>
      <footer className="mt-10 border-t border-border pt-5">
        {policyPages.filter(({ path }) => path !== page.path).map(({ path, document }) => (
          <a className="text-muted-foreground hover:text-primary" href={path} key={path}>{document.title}</a>
        ))}
      </footer>
    </div>
  );
}
