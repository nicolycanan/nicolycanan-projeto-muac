import type { Metadata } from "next";
import styles from "./about.module.css";

export const metadata: Metadata = {
  title: "About",
  description: "O que é a MUAC neste momento, e sua relação com Nicoly.",
};

export default function AboutPage() {
  return (
    <>
      <header className={styles.header}>
        <h1 className={styles.title}>Sobre a MUAC</h1>
      </header>

      <div className={styles.content}>
        <p className={styles.lead}>
          A MUAC ainda não sabe exatamente o que vai ser. Por enquanto, é o
          lugar onde guardo e comparto aquilo que acho interessante — gente,
          música, histórias que teriam se perdido se ninguém tivesse escrito
          sobre elas.
        </p>

        <p className={styles.p}>
          Não é um portal de notícias, nem uma revista com pauta fechada. É
          mais parecido com um arquivo pessoal que decidi abrir: um caderno
          de descobertas que cresce devagar, sem pressa de estar completo.
        </p>

        <p className={styles.p}>
          Se você chegou até aqui pelo Instagram, essa é a ideia — o feed é
          só a porta. O site é onde as histórias respiram de verdade.
        </p>

        <span className={`mono-label ${styles.building}`}>
          <span className={styles.dot} aria-hidden="true" />
          em construção — isso muda com o tempo
        </span>

        <hr className={styles.divider} />

        <h2 className={styles.name}>quem faz</h2>

        <p className={styles.p}>
          Eu sou a Nicoly. A MUAC nasceu de coisas que eu já fazia sozinha —
          gravar, fotografar, anotar, garimpar — e que em algum momento
          pareceu fazer mais sentido reunir num lugar só. Não é uma vitrine
          sobre mim; é mais um jeito de continuar registrando o que encontro
          pelo caminho, com espaço pra outras pessoas aparecerem também.
        </p>

        <p className={styles.p}>
          Fora da MUAC eu também mexo com vídeo e tenho um canal onde publico
          coisas mais pessoais — com o tempo, ele deve aparecer por aqui
          também, sem se misturar com o resto.
        </p>

        <div className={styles.links}>
          <a href="https://instagram.com" target="_blank" rel="noreferrer noopener">
            instagram
          </a>
          <a href="https://youtube.com" target="_blank" rel="noreferrer noopener">
            youtube
          </a>
        </div>
      </div>
    </>
  );
}
