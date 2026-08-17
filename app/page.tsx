import Link from "next/link";
import Image from "next/image";
import styles from "./page.module.css";
import { RevealGroup } from "@/components/RevealGroup";
import { getArchive, getCurrentPlaylist, getGallery, ArchiveEntry } from "@/lib/content";
import HomeFeaturedClient from "@/components/HomeFeaturedClient";

export default async function Home() {
  const archive = await getArchive();
  const featured: ArchiveEntry | null = archive && archive.length > 0 ? archive[0] : null;
  const others: ArchiveEntry[] = archive && archive.length > 1 ? archive.slice(1) : [];
  const playlist = getCurrentPlaylist();
  const galleryEntries = await getGallery();
  const gallery = galleryEntries && galleryEntries.length > 0 ? galleryEntries[0] : null;

  return (
    <>
      <section className={styles.hero}>
        <h1 className="sr-only">MUAC — arquivo digital pessoal</h1>
        <Image
          src="/images/carpa.png"
          alt=""
          width={1512}
          height={2268}
          priority
          className={styles.koi}
          aria-hidden="true"
        />
        <p className={styles.heroQuote}>
          Isso não é um editorial, é um acervo pessoal no qual decidi
          compartilhar com o mundo.
        </p>
        <div className={styles.heroFoot}>
          <span className="mono-label">role para explorar</span>
          <span className={styles.scrollCue} aria-hidden="true" />
        </div>
      </section>

      <div className={styles.now}>
        <span className={`mono-label ${styles.nowLabel}`}>agora</span>
        <span className={styles.nowText}>
          ouvindo {playlist.title} — <Link href="/radio">ver playlist</Link>
        </span>
      </div>

      <RevealGroup>
        {/* Featured + Carousel (client-side) */}
        <HomeFeaturedClient featured={featured} others={others} playlist={playlist} gallery={gallery} />

        <section className={styles.section} aria-label="Radio | Gallery">
          <div className={`${styles.teasers}`}>
            <Link href="/radio" className={`${styles.teaser} reveal`}>
              <span className={styles.teaserLabel}>
                <span className={styles.teaserDot} aria-hidden="true" />
                Radio
              </span>
              <span className={styles.teaserTitle}>{playlist.title}</span>
              <p className={styles.teaserNote}>{playlist.note}</p>
            </Link>

            {gallery && (
              <Link
                href="/gallery"
                className={`${styles.teaser} reveal`}
              >
                <span className={styles.teaserLabel}>
                  Gallery
                </span>

                <span className={styles.teaserTitle}>
                  {gallery.title}
                </span>

                <p className={styles.teaserNote}>
                  {gallery.note}
                </p>
              </Link>
            )}
          </div>
        </section>
      </RevealGroup>
    </>
  );
}