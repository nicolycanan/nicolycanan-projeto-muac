import type { Metadata } from "next";
import Image from "next/image";
import styles from "./gallery.module.css";
import { getGallery } from "@/lib/content";

export const metadata: Metadata = {
  title: "Gallery",
  description: "Conteúdo audiovisual da MUAC e do canal da Nicoly.",
};

export default function GalleryPage() {
  const gallery = getGallery();

  return (
    <>
      <header className={styles.header}>
        <h1 className={styles.title}>Gallery</h1>
        <p className={styles.intro}>
          Vídeos da MUAC e do canal pessoal da Nicoly, reunidos aqui sem que
          um apague o outro.
        </p>
      </header>

      <div className={styles.grid}>
        {gallery.map((v) => (
          <article key={v.slug} className={styles.card}>
            <div className={styles.media}>
              <Image src={v.cover} alt="" fill sizes="(min-width: 720px) 45vw, 90vw" />
              <span className={styles.play} aria-hidden="true">
                ▶ assistir
              </span>
            </div>
            <div className={styles.body}>
              <span className={styles.source}>{v.source === "muac" ? "MUAC" : "canal da Nicoly"}</span>
              <h2 className={styles.cardTitle}>{v.title}</h2>
              <p className={styles.note}>{v.note}</p>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
