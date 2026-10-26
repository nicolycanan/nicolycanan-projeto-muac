import ArticleView from "@/components/ArticleView";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import styles from "./article.module.css";
import {
  getArchive,
  getArchiveEntry,
} from "@/lib/content";

type Props = {
  params: Promise<{ slug: string }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: Props): Promise<Metadata> {
  const { slug } = await params;

  try {
    const entry = await getArchiveEntry(slug);

    if (!entry) {
      return {};
    }

    return {
      title: entry.title,
      description: entry.dek,

      openGraph: {
        title: `${entry.title} — MUAC`,
        description: entry.dek,
        images: [entry.cover],
        type: "article",
        publishedTime: entry.date,
      },

      twitter: {
        card: "summary_large_image",
        title: `${entry.title} — MUAC`,
        description: entry.dek,
        images: [entry.cover],
      },
    };
  } catch {
    return {};
  }
}

export default async function ArchiveEntryPage({
  params,
}: Props) {
  const { slug } = await params;

  let entry = null;
  let error: string | null = null;

  try {
    entry = await getArchiveEntry(slug);
  } catch (err) {
    error =
      err instanceof Error
        ? err.message
        : String(err);
  }

  if (error) {
    return (
      <div className={styles.emptyState}>
        <p>
            Não foi possível carregar este artigo agora.
        </p>

        <p>
          Tente novamente em alguns instantes.
        </p>
      </div>
    );
  }

  if (!entry) {
    notFound();
  }

  const all = await getArchive();

  const idx = all.findIndex(
    (e) => e.slug === slug
  );

  const next =
    all.length > 1
      ? all[(idx + 1) % all.length]
      : null;

  return <ArticleView entry={entry} next={next}/>;
}
