"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import styles from "./Header.module.css";

const NAV = [
  { href: "/", label: "Home", index: "00" },
  { href: "/archive", label: "Archive", index: "01" },
  { href: "/radio", label: "Radio", index: "02" },
  { href: "/gallery", label: "Gallery", index: "03" },
  { href: "/about", label: "About", index: "04" },
];

export function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const prevPathname = useRef(pathname);

  // Close the menu when navigation actually happens (i.e. the route
  // changed), not on every render — keeps this a real sync with the
  // router rather than an unconditional setState-in-effect.
  useEffect(() => {
    if (prevPathname.current !== pathname) {
      prevPathname.current = pathname;
      setOpen(false);
    }
  }, [pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <header className={styles.header} data-scrolled={scrolled}>
        <div className={styles.left}>
          <button
            className={styles.burger}
            data-open={open}
            aria-expanded={open}
            aria-controls="site-menu"
            aria-label={open ? "Fechar menu" : "Abrir menu"}
            onClick={() => setOpen((v) => !v)}
          >
            <span />
            <span />
          </button>
        </div>
        <Link href="/" className={styles.logo} aria-label="MUAC — página inicial">
          Muac
        </Link>
      </header>

      <div
        id="site-menu"
        className={styles.overlay}
        data-open={open}
        role="dialog"
        aria-modal="true"
        aria-label="Menu principal"
        inert={!open}
      >
        <div className={styles.overlayTop}>
          <span className={styles.logo}>Muac</span>
          <button className={styles.burger} data-open={open} aria-label="Fechar menu" onClick={() => setOpen(false)}>
            <span />
            <span />
          </button>
        </div>

        <nav>
          <ul className={styles.navList}>
            {NAV.map((item) => (
              <li className={styles.navItem} key={item.href}>
                <Link href={item.href} className={styles.navLink}>
                  <span className={styles.navIndex}>{item.index}</span>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className={styles.overlayFoot}>
          <span>arquivo pessoal, em construção</span>
          <a href="https://instagram.com" target="_blank" rel="noreferrer noopener">
            instagram ↗
          </a>
        </div>
      </div>
    </>
  );
}
