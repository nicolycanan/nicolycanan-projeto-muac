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
            Ainda não há imagens por aqui.
          </div>
        ) : (
          entries.map((entry) => (
            <article key={entry.id} className={styles.item}>
              <div className={styles.imageWrapper}>
                <img src={entry.image} alt={entry.note || entry.title} />
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
