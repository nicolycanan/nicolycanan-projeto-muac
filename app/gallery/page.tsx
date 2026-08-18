import type { Metadata } from "next";
import { getGallery } from "@/lib/content";
import styles from "./gallery.module.css";

export const metadata: Metadata = {
  title: "Gallery",
  description: "Galeria de imagens da MUAC e do acervo pessoal.",
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
            <span className="MainText">reservado para as minhas memórias</span>
          </div>
        ) : (
          entries.map((entry) => (
            <article key={entry.id} className={styles.item}>
              <div className={styles.imageWrapper}>
                {entry.media && entry.media.mediaType === "image" ? (
                  <img src={entry.media.url} alt={entry.note || entry.title} />
                ) : entry.media && entry.media.mediaType === "video" ? (
                  <video controls preload="metadata">
                    <source src={entry.media.url} />
                    Your browser does not support the video tag.
                  </video>
                ) : entry.media && entry.media.mediaType === "audio" ? (
                  <audio controls preload="metadata">
                    <source src={entry.media.url} />
                    Your browser does not support the audio element.
                  </audio>
                ) : entry.image ? (
                  <img src={entry.image} alt={entry.note || entry.title} />
                ) : null}
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
