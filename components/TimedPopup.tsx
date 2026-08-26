"use client";

import { useEffect, useState } from "react";
import styles from "./TimedPopup.module.css";

const POPUP_END_DATE = new Date("2026-08-28T20:00:00-03:00");

export function TimedPopup() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);

    const now = new Date();

    if (now < POPUP_END_DATE) {
      setIsOpen(true);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const checkExpiration = () => {
      if (new Date() >= POPUP_END_DATE) {
        setIsOpen(false);
      }
    };

    const interval = window.setInterval(checkExpiration, 1000);

    return () => window.clearInterval(interval);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  if (!isMounted || !isOpen) {
    return null;
  }

  return (
    <div
      className={styles.overlay}
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          setIsOpen(false);
        }
      }}
    >
      <section
        className={styles.popup}
        role="dialog"
        aria-modal="true"
        aria-labelledby="muac-popup-title"
        aria-describedby="muac-popup-description"
      >
        <div className={styles.topLine}>
          <span className={styles.label}>MUAC / 001</span>

          <button
            type="button"
            className={styles.close}
            onClick={() => setIsOpen(false)}
            aria-label="Fechar aviso"
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>

        <div className={styles.content}>
          <span className={`${styles.kicker} hand`}>um recado</span>

          <p id="muac-popup-description" className={styles.description}>
            Se você está vendo esse recado, parabéns!
            Você é tão curioso quanto eu, fique á vontade.
          </p>

          <p className={styles.note}>
            explore o acervo enquanto ele acontece.
          </p>
        </div>

        <div className={styles.footer}>
          <span className={styles.date}>
           28.08.26 — 20:00
          </span>

          <button
            type="button"
            className={styles.action}
            onClick={() => setIsOpen(false)}
          >
            explorar no acervo
            <span aria-hidden="true">↗</span>
          </button>
        </div>
      </section>
    </div>
  );
}