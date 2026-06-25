import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { docPages, getDoc, adjacentDocs } from "@/lib/docs";
import { DocsChrome } from "@/components/docs/docs-chrome";

const nav = docPages.map((d) => ({ slug: d.slug, title: d.title, group: d.group, description: d.description }));

export function generateStaticParams() {
  return [{ slug: [] }, ...docPages.map((d) => ({ slug: [d.slug] }))];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const doc = getDoc(slug?.[0] ?? "quickstart");
  return { title: doc ? `${doc.title} · Docs` : "Docs", description: doc?.description };
}

export default async function DocPage({ params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await params;
  const key = slug?.[0] ?? "quickstart";
  const doc = getDoc(key);
  if (!doc) notFound();
  const { prev, next } = adjacentDocs(doc.slug);

  return (
    <DocsChrome pages={nav} headings={doc.headings}>
      <article>
        <div className="eyebrow mb-2">{doc.group}</div>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-hi">{doc.title}</h1>
        <doc.Body />

        <div className="mt-14 grid grid-cols-2 gap-4 border-t border-hairline pt-6">
          <div>
            {prev && (
              <Link
                href={`/docs/${prev.slug}`}
                className="group flex flex-col gap-1 rounded-card border border-hairline p-4 hover:border-steel/40"
              >
                <span className="flex items-center gap-1 text-xs text-low">
                  <ArrowLeft className="size-3" /> Previous
                </span>
                <span className="text-sm font-medium text-hi">{prev.title}</span>
              </Link>
            )}
          </div>
          <div>
            {next && (
              <Link
                href={`/docs/${next.slug}`}
                className="group flex flex-col items-end gap-1 rounded-card border border-hairline p-4 text-right hover:border-steel/40"
              >
                <span className="flex items-center gap-1 text-xs text-low">
                  Next <ArrowRight className="size-3" />
                </span>
                <span className="text-sm font-medium text-hi">{next.title}</span>
              </Link>
            )}
          </div>
        </div>
      </article>
    </DocsChrome>
  );
}
