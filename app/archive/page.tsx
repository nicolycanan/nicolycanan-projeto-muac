import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import styles from "./archive.module.css";
import { getArchive, ArchiveEntry } from "@/lib/content";

export const revalidate = 300;

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
            Problema na configuração do
            Notion CMS:{" "}
            <strong>{error}</strong>
          </p>

          <p>
            Verifique as variáveis de ambiente
            do servidor (NOTION_TOKEN e
            NOTION_DATABASE_ID). O token deve
            permanecer apenas no servidor.
          </p>
        </div>
      ) : entries.length === 0 ? (
        <div className={styles.emptyState}>
          <p>
            <span className="MainText">se está vazio, está estranho...</span>
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