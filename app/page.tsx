import Image from "next/image";
import styles from "./page.module.css";
import { RevealGroup } from "@/components/RevealGroup";
import { getArchive, ArchiveEntry } from "@/lib/content";
import HomeFeaturedClient from "@/components/HomeFeaturedClient";

// Mantém a Home sincronizada com o conteúdo publicado do Archive.
// Atualiza o cache a cada 5 minutos.
export const revalidate = 300;

export default async function Home() {
  // Fonte única dos artigos da Home.
  // getArchive() já retorna somente os artigos publicados.
  const archive = await getArchive();

  const articles: ArchiveEntry[] = archive ?? [];

  return (
    <>
      <section className={styles.hero}>
        <h1 className="sr-only">
          MUAC — arquivo digital pessoal
        </h1>

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
          <span className="mono-label">
            role para explorar
          </span>

          <span
            className={styles.scrollCue}
            aria-hidden="true"
          />
        </div>
      </section>

      <RevealGroup>
        {/*
          Os artigos vêm diretamente do getArchive().
          A Home utiliza a mesma fonte de dados do /archive,
          garantindo que apenas artigos publicados sejam exibidos.
        */}
        <HomeFeaturedClient
          articles={articles}
        />
      </RevealGroup>
    </>
  );
}