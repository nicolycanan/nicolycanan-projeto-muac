// components/HomeFeaturedClient.tsx
"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import type { ArchiveEntry } from "@/lib/content";
import Carousel from "./Carousel";
// Recomendo criar um CSS module específico para este componente:
// import styles from "./HomeFeaturedClient.module.css";
// Se preferir usar o module da página, mantenha a linha abaixo (já estava no seu projeto).
import styles from "@/app/page.module.css";

type Props = {
  featured: ArchiveEntry | null;
  others: ArchiveEntry[];
  playlist: any;
  gallery: any;
};

export default function HomeFeaturedClient({ featured, others, playlist, gallery: video }: Props) {
  return (
    <>
      <section className={styles.section} aria-labelledby="featured-heading">
        <div className={styles.sectionHead}>
          <h2 id="featured-heading" className={styles.sectionTitle}>
            Do Archive
          </h2>
          <Link href="/archive" className={styles.sectionLink}>
            ver tudo →
          </Link>
        </div>

        {featured ? (
          <Link href={`/archive/${featured.slug}`} className={`${styles.featured} reveal`}>
            <div className={styles.featuredMedia}>
              <span className={styles.featuredNumber}>{featured.number}</span>
              <Image
                src={featured.cover}
                alt={featured.title || "Capa do artigo"}
                fill
                sizes="(min-width: 860px) 40vw, 90vw"
              />
            </div>
            <div className={styles.featuredBody}>
              <span className={styles.featuredKicker}>
                {featured.subject} {featured.role ? `— ${featured.role}` : ""}
              </span>
              <h3 className={styles.featuredTitle}>{featured.title}</h3>
              {featured.dek && <p className={styles.featuredDek}>{featured.dek}</p>}
              <span className={styles.featuredMeta}>
                {featured.tags && featured.tags.length > 0 ? featured.tags.join(" · ") : ""}
              </span>
            </div>
          </Link>
        ) : (
          <div className={`${styles.sectionEmpty} reveal`} aria-live="polite">
            <p>Sem artigos publicados.</p>
          </div>
        )}
      </section>

      <section className={styles.section} aria-label="Outros artigos">
        <div style={{ marginTop: 24 }}>
          <h3 className={styles.sectionTitle}>Outros artigos</h3>
          {others && others.length > 0 ? (
            <Carousel items={others} />
          ) : (
            <p className={styles.emptyNote}>Nenhum outro artigo disponível.</p>
          )}
        </div>
      </section>
    </>
  );
}