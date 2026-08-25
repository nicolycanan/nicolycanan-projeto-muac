import type { Metadata } from "next";
import React from "react";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import styles from "./article.module.css";
import {
  getArchive,
  getArchiveEntry,
} from "@/lib/content";

type Props = {
  params: Promise<{ slug: string }>;
};

export const revalidate = 300;

export async function generateStaticParams() {
  try {
    const entries = await getArchive();

    return entries.map((entry) => ({
      slug: entry.slug,
    }));
  } catch {
    return [];
  }
}

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
          Problema na configuração do
          Notion CMS:{" "}
          <strong>{error}</strong>
        </p>

        <p>
          Verifique as variáveis de
          ambiente do servidor
          (NOTION_TOKEN e
          NOTION_DATABASE_ID).
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

  return (
    <article>
      <Link
        href="/archive"
        className={styles.back}
      >
        {"<"} archive
      </Link>

      <header className={styles.hero}>
        <div className={styles.eyebrow}>
          <span
            className={`mono-label ${styles.number}`}
          >
            {entry.number}
          </span>
        </div>

        <h1 className={styles.title}>
          {entry.title}
        </h1>

        <p className={styles.subject}>
          {entry.subject} — {entry.role}
        </p>

        <div className={styles.tags}>
          {entry.tags.map((tag) => (
            <span key={tag}>
              {tag}
            </span>
          ))}
        </div>
      </header>

      <div className={styles.body}>
        {entry.body.map((block, i) => {
          if (block.type === "paragraph") {
            return (
              <p
                key={i}
                className={styles.paragraph}
              >
                {block.richText.map(
                  (item, j) => {
                    let content: React.ReactNode =
                      item.text;

                    if (item.bold) {
                      content = (
                        <strong>{content}</strong>
                      );
                    }

                    if (item.italic) {
                      content = (
                        <em>{content}</em>
                      );
                    }

                    if (item.underline) {
                      content = (
                        <u>{content}</u>
                      );
                    }

                    if (item.strikethrough) {
                      content = (
                        <s>{content}</s>
                      );
                    }

                    if (item.code) {
                      content = (
                        <code>{content}</code>
                      );
                    }

                    if (item.href) {
                      content = (
                        <a
                          href={item.href}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {content}
                        </a>
                      );
                    }

                    return (
                      <span key={j}>
                        {content}
                      </span>
                    );
                  }
                )}
              </p>
            );

          }

          if (block.type === "heading") {
            return (
              <h2
                key={i}
                className={styles.heading}
              >
                {block.text}
              </h2>
            );
          }

          if (block.type === "quote") {
            return (
              <blockquote
                key={i}
                className={styles.quote}
              >
                &ldquo;
                {block.text}
                &rdquo;

                {block.attribution && (
                  <span
                    className={
                      styles.quoteAttribution
                    }
                  >
                    {block.attribution}
                  </span>
                )}
              </blockquote>
            );
          }

          /*
           * Imagens vindas do Notion.
           *
           * O Notion API fornece a URL do arquivo,
           * mas não preserva o tamanho visual definido
           * no editor do Notion.
           *
           * Portanto, o tamanho visual é controlado
           * pelo CSS do MUAC.
           */
          if (block.type === "image") {
            return (
              <figure
                key={i}
                className={styles.blockImage}
              >
                <Image
                  src={block.src}
                  alt={block.alt || ""}
                  width={1200}
                  height={800}
                  sizes="(max-width: 768px) 100vw, 900px"
                  style={{
                    width: "100%",
                    height: "auto",
                  }}
                  loading={i === 0 ? "eager" : "lazy"}
                />

                {block.caption && (
                  <figcaption
                    className={styles.caption}
                  >
                    {block.caption}
                  </figcaption>
                )}
              </figure>
            );
          }

          if (block.type === "list") {
            const ListTag =
              block.ordered ? "ol" : "ul";

            return (
              <ListTag
                key={i}
                className={styles.list}
              >
                {block.items.map(
                  (item, j) => (
                    <li key={j}>
                      {item}
                    </li>
                  )
                )}
              </ListTag>
            );
          }

          return null;
        })}
      </div>

      {next && (
        <Link
          href={`/archive/${next.slug}`}
          className={styles.next}
        >
          <span>
            <span
              className={`mono-label ${styles.nextLabel}`}
            >
              a seguir
            </span>

            <br />

            <span
              className={styles.nextTitle}
            >
              {next.title}
            </span>
          </span>

          <span aria-hidden="true">
            {">"}
          </span>
        </Link>
      )}
    </article>
  );
}