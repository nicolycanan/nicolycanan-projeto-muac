import Link from "next/link";
import styles from "./Footer.module.css";

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className={styles.footer}>
      <div className={styles.row}>
        <span className={styles.mark}>até a próxima descoberta.</span>
        <nav className={styles.links}>
          <Link href="/archive">Archive</Link>
          <Link href="/radio">Radio</Link>
          <Link href="/gallery">Gallery</Link>
          <Link href="/about">About</Link>
        </nav>
      </div>
      <div className={styles.bottom}>
        <span>MUAC — acervo pessoal no qual decidi compartilhar com o mundo, {year}.</span>
        <span>criado por Nica Canan</span>
      </div>
    </footer>
  );
}
