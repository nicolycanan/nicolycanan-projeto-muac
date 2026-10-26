import type { Metadata } from "next";
import Link from "next/link";
import Image from "@/components/ResilientImage";
import styles from "./archive.module.css";
import { getArchive, ArchiveEntry } from "@/lib/content";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Archive",
  description:
    "Pessoas, artistas e histórias da cena, reunidas pela MUAC.",
};

export default async function ArchivePage() {
  let entries: ArchiveEntry[] = [];
  let error: string | null = null;

  try {
    entries = await getArchive();
  } catch (err) {
    error =
      err instanceof Error
        ? err.message
        : String(err);
  }

  return (
    <>
      <header className={styles.header}>
        <h1 className={styles.title}>
          Archive
        </h1>

        <p className={styles.intro}>
          Textos que não cabem em um tweet.
        </p>
      </header>

      {error ? (
        <div className={styles.emptyState}>
          <p>
            Não foi possível carregar os artigos agora.
          </p>

          <p>
            Tente novamente em alguns instantes.
          </p>
        </div>
      ) : entries.length === 0 ? (
        <div className={styles.emptyState}>
          <p>
           se está vazio, está estranho..
          </p>

          <p>
            Novos textos aparecem por aqui em breve.
          </p>
        </div>
      ) : (
        <ul className={styles.list}>
          {entries.map((entry) => (
            <li key={entry.slug}>
              <Link
                href={`/archive/${entry.slug}`}
                className={styles.row}
              >
                <span
                  className={
                    styles.rowNumber
                  }
                >
                  {entry.number}
                </span>

                <span
                  className={
                    styles.rowThumb
                  }
                >
                  <Image
                    src={entry.cover}
                    alt=""
                    fill
                    sizes="120px"
                  />
                </span>

                <span
                  className={
                    styles.rowBody
                  }
                >
                  <span
                    className={
                      styles.rowTitle
                    }
                  >
                    {entry.title}
                  </span>

                  <span
                    className={
                      styles.rowMeta
                    }
                  >
                    <span>
                      {entry.subject}
                    </span>

                    <span>
                      {entry.role}
                    </span>
                  </span>

                  <span
                    className={
                      styles.rowDek
                    }
                  >
                    {entry.dek}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
