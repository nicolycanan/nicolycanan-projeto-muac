import type { Metadata } from "next";
import Image from "next/image";
import styles from "./video.module.css";
import { getVideos } from "@/lib/content";

export const metadata: Metadata = {
  title: "Video",
  description: "Conteúdo audiovisual da MUAC e do canal da Nicoly.",
};

export default function VideoPage() {
  const videos = getVideos();

  return (
    <>
      <header className={styles.header}>
        <h1 className={styles.title}>Video</h1>
        <p className={styles.intro}>
          Vídeos da MUAC e do canal pessoal da Nicoly, reunidos aqui sem que
          um apague o outro.
        </p>
      </header>

      <div className={styles.grid}>
        {videos.map((v) => (
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
