"use client";

import React from "react";
import Link from "next/link";
import type { ArchiveEntry } from "@/lib/content";
import Carousel from "./Carousel";

import styles from "@/app/page.module.css";

type Props = {
  articles: ArchiveEntry[];
};

export default function HomeFeaturedClient({
  articles,
}: Props) {
  return (
    <section
      className={styles.section}
      aria-labelledby="featured-heading"
    >
      <div className={styles.sectionHead}>
        <h2
          id="featured-heading"
          className={styles.sectionTitle}
        >
          Do Archive
        </h2>

        <Link
          href="/archive"
          className={styles.sectionLink}
        >
          ver tudo →
        </Link>
      </div>

      {articles.length === 0 ? (
        <div
          className={`${styles.sectionEmpty} reveal`}
          aria-live="polite"
        >
          <p>Sem artigos publicados.</p>
        </div>
      ) : (
        <Carousel items={articles} />
      )}
    </section>
  );
}