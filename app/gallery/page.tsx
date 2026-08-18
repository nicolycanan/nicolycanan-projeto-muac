import type { Metadata } from "next";
import { getGallery } from "@/lib/content";
import styles from "./gallery.module.css";

export const metadata: Metadata = {
  title: "Gallery",
  description: "Galeria de imagens, vídeos e áudios da MUAC e do acervo pessoal.",
};

export default async function GalleryPage() {
  const entries = await getGallery();

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1>Gallery</h1>
      </header>

      <section className={styles.gallery}>
        {entries.length === 0 ? (
          <div className={styles.empty} aria-live="polite">
            Ainda não pensei em nada bom o suficiente pra colocar aqui.
          </div>
        ) : (
          entries.map((entry) => (
            <article key={entry.id} className={styles.item}>
              <div className={styles.imageWrapper}>
                {entry.mediaType === "video" ? (
                  <video
                    className={styles.media}
                    src={entry.image}
                    controls
                    preload="metadata"
                    playsInline
                    aria-label={entry.title}
                  >
                    Seu navegador não suporta reprodução de vídeo.
                  </video>
                ) : entry.mediaType === "audio" ? (
                  <div className={styles.audioWrapper}>
                    <audio
                      className={styles.audio}
                      src={entry.image}
                      controls
                      preload="metadata"
                    >
                      Seu navegador não suporta reprodução de áudio.
                    </audio>
                  </div>
                ) : (
                  <img
                    className={styles.media}
                    src={entry.image}
                    alt={entry.note || entry.title}
                    loading="lazy"
                  />
                )}
              </div>

              <div className={styles.meta}>
                <h2>{entry.title}</h2>

                {entry.note && <p>{entry.note}</p>}

                {entry.date && <time>{entry.date}</time>}
              </div>
            </article>
          ))
        )}
      </section>
    </main>
  );
}