import type { Metadata } from "next";
import styles from "./about.module.css";

export const metadata: Metadata = {
  title: "About",
};

export default function AboutPage() {
  return (
    <>
      <header className={styles.header}>
        <h1 className={styles.title}>About</h1>
      </header>

      <main className={styles.content}>
        <section className={styles.sectionMuac}>
          <h2 className={styles.subtitle}>Muac</h2>

          <p>
            A Muac ainda não sabe exatamente o que vai ser. Por enquanto, é o
            lugar onde guardo e compartilho aquilo que acho interessante.
            Gente, música, histórias que teriam se perdido se ninguém
            tivesse contado sobre elas.
          </p>

          <p>
            Isso não é um editorial, nem uma revista com pauta fechada,
            é quase um acervo pessoal que decidi abrir: um caderno
            de descobertas que cresce devagar, sem pressa de estar completo.
          </p>

          <p>
            Se você chegou até aqui de alguma forma, essa é só uma porta.
            Porque a vida real é onde as histórias acontecem de verdade.
          </p>

             <div className={styles.links}>
            <a
              href="https://instagram.com/muaclife"
              target="_blank"
              rel="noreferrer noopener"
            >
              instagram
            </a>
          </div>

          <span className={`mono-label ${styles.building}`}>
            <span className={styles.dot} aria-hidden="true" />
            em construção — sem data para finalizar
          </span>
       
        </section>

        <section className={styles.sectionAuthor}>
          <h2 className={styles.subtitle}>quem faz</h2>

          <p>
            A Muac é muito mais do que um acervo pessoal, exclusivo meu.
            Ela nasce de todas as histórias e lembranças com pessoas queridas,
            nasce de tudo o que eu queria registrar pra me lembrar de que sou
            muito amada, mesmo quando eu esqueça disso.
          </p>

          <p>
            Eu sou a Nicoly e em algum momento pareceu fazer mais sentido 
            reunir num lugar só. Não é uma vitrine sobre mim, é mais um jeito
            de continuar registrando o que encontro pelo caminho,
            com espaço pra misturar todas as pessoas aparecerem nessas histórias também.
          </p>

          <div className={styles.links}>
            <a
              href="https://instagram.com/nica_canan"
              target="_blank"
              rel="noreferrer noopener"
            >
              instagram
            </a>

            <a
              href="https://www.youtube.com/@nica_canan"
              target="_blank"
              rel="noreferrer noopener"
            >
              youtube
            </a>
          </div>
        </section>
      </main>
    </>
  );
}