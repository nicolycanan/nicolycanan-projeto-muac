import type { Metadata } from "next";
import styles from "./radio.module.css";
import { getPlaylists } from "@/lib/content";

export const metadata: Metadata = {
  title: "Radio",
  description: "Playlists e curadoria musical da MUAC.",
};

export default function RadioPage() {
  const playlists = getPlaylists();

  return (
    <>
      <header className={styles.header}>
           <h1 className={styles.title}>
          Radio
        </h1>

        <p className={styles.intro}>
          Não é um player embutido. É a curadoria da MUAC — atualizada sem
          aviso, guardada como registro depois que passa.
        </p>
      </header>

      <section className={styles.playlists}>
        {playlists.map((playlist) => (
          <article
            key={playlist.slug}
            className={styles.playlist}
          >
            <div className={styles.current}>
              <div>
                <span
                  className={`mono-label ${styles.liveTag}`}
                >
                  <span
                    className={styles.liveDot}
                    aria-hidden="true"
                  />

                  {playlist.current
                    ? "playlist favorita"
                    : "playlist"}
                </span>

                <h2 className={styles.currentTitle}>
                  {playlist.title}
                </h2>

                <p className={styles.currentNote}>
                  {playlist.note}
                </p>

                {playlist.spotifyId && (
                  <div className={styles.spotifyEmbed}>
                    <iframe
                      src={`https://open.spotify.com/embed/playlist/${playlist.spotifyId}?utm_source=generator&theme=0`}
                      width="100%"
                      height="465"
                      frameBorder="0"
                      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                      loading="lazy"
                      title={`Playlist ${playlist.title} no Spotify`}
                    />
                  </div>
                )}

                {!playlist.spotifyId &&
                  playlist.tracks.length > 0 && (
                    <ol className={styles.tracklist}>
                      {playlist.tracks.map(
                        (track, i) => (
                          <li
                            key={`${track.title}-${track.artist}-${i}`}
                            className={styles.track}
                          >
                            <span
                              className={
                                styles.trackIndex
                              }
                            >
                              {String(i + 1).padStart(
                                2,
                                "0"
                              )}
                            </span>

                            <span>
                              {track.title}{" "}
                              <span
                                className={
                                  styles.trackArtist
                                }
                              >
                                — {track.artist}
                              </span>
                            </span>
                          </li>
                        )
                      )}
                    </ol>
                  )}
              </div>
            </div>
          </article>
        ))}
      </section>
    </>
  );
}