import React from "react";
import Link from "next/link";
import Image from "./ResilientImage";
import type { ArchiveEntry } from "@/lib/content";
import styles from "@/app/archive/[slug]/article.module.css";
export default function ArticleView({
  entry,
  next = null,
}: {
  entry: ArchiveEntry;
  next?: ArchiveEntry | null;
}) {
  const firstImage = entry.body.findIndex((block) => block.type === "image");
  return (
    <article>
      <Link href="/archive" className={styles.back}>
        {"<"} archive
      </Link>

      <header className={styles.hero}>
        <div className={styles.eyebrow}>
          <span className={`mono-label ${styles.number}`}>{entry.number}</span>
        </div>

        <h1 className={styles.title}>{entry.title}</h1>

        <p className={styles.subject}>
          {entry.subject} — {entry.role}
        </p>

        <div className={styles.tags}>
          {entry.tags.map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
      </header>

      <div className={styles.body}>
        {entry.body.map((block, i) => {
          if (block.type === "divider") return <hr key={i} />;
          if (block.type === "paragraph") {
            return (
              <p key={i} className={styles.paragraph}>
                {block.richText.map((item, j) => {
                  let content: React.ReactNode = item.text;

                  if (item.bold) {
                    content = <strong>{content}</strong>;
                  }

                  if (item.italic) {
                    content = <em>{content}</em>;
                  }

                  if (item.underline) {
                    content = <u>{content}</u>;
                  }

                  if (item.strikethrough) {
                    content = <s>{content}</s>;
                  }

                  if (item.code) {
                    content = <code>{content}</code>;
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

                  return <span key={j}>{content}</span>;
                })}
              </p>
            );
          }

          if (block.type === "heading") {
            return (
              <h2 key={i} className={styles.heading}>
                {block.text}
              </h2>
            );
          }

          if (block.type === "quote") {
            return (
              <blockquote key={i} className={styles.quote}>
                &ldquo;
                {block.text}
                &rdquo;
                {block.attribution && (
                  <span className={styles.quoteAttribution}>
                    {block.attribution}
                  </span>
                )}
              </blockquote>
            );
          }

          /*
           * O tamanho visual das imagens segue o layout editorial do MUAC.
           */
          if (block.type === "image") {
            return (
              <figure key={i} className={styles.blockImage}>
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
                  loading={i === firstImage ? "eager" : "lazy"}
                />

                {block.caption && (
                  <figcaption className={styles.caption}>
                    {block.caption}
                  </figcaption>
                )}
              </figure>
            );
          }

          if (block.type === "list") {
            const ListTag = block.ordered ? "ol" : "ul";

            return (
              <ListTag key={i} className={styles.list}>
                {block.items.map((item, j) => (
                  <li key={j}>{item}</li>
                ))}
              </ListTag>
            );
          }

          return null;
        })}
      </div>

      {next && (
        <Link href={`/archive/${next.slug}`} className={styles.next}>
          <span>
            <span className={`mono-label ${styles.nextLabel}`}>a seguir</span>

            <br />

            <span className={styles.nextTitle}>{next.title}</span>
          </span>

          <span aria-hidden="true">{">"}</span>
        </Link>
      )}
    </article>
  );
}
