"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import styles from "./Carousel.module.css";
import type { ArchiveEntry } from "@/lib/content";

type Props = {
  items: ArchiveEntry[];
};

export default function Carousel({ items }: Props) {
  if (!items || items.length === 0) {
    return (
      <div className={styles.empty}>
        Nenhum outro artigo
      </div>
    );
  }

  return (
    <div
      className={styles.carousel}
      aria-roledescription="carousel"
    >
      <button
        type="button"
        className={styles.nav}
        aria-label="anterior"
      >
        ‹
      </button>

      <div
        className={styles.viewport}
        role="region"
        aria-label="Carrossel de artigos"
      >
        <div className={styles.track}>
          {items.map((article) => (
            <div
              key={article.slug}
              className={styles.card}
            >
              <Link
                href={`/archive/${article.slug}`}
                className={styles.cardLink}
              >
                <div className={styles.cardMedia}>
                  <Image
                    src={article.cover}
                    alt={
                      article.title ||
                      "Capa do artigo"
                    }
                    fill
                    sizes="
                      (min-width: 1024px) 20vw,
                      (min-width: 640px) 50vw,
                      100vw
                    "
                  />
                </div>

                <div className={styles.cardBody}>
                  <div className={styles.cardKicker}>
                    {article.subject}

                    {article.role
                      ? ` — ${article.role}`
                      : ""}
                  </div>

                  <div className={styles.cardTitle}>
                    {article.title}
                  </div>
                </div>
              </Link>
            </div>
          ))}
        </div>
      </div>

      <button
        type="button"
        className={styles.nav}
        aria-label="próximo"
      >
        ›
      </button>
    </div>
  );
}