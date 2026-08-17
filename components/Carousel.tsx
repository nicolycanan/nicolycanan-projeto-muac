// components/Carousel.tsx
"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import Image from "next/image";
import styles from "./Carousel.module.css";
import Link from "next/link";
import type { ArchiveEntry } from "@/lib/content";

type Props = {
  items: ArchiveEntry[];
};

const VISIBLE = 3; // número de itens visíveis em desktop; CSS ajusta em mobile

export default function Carousel({ items }: Props) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [itemWidth, setItemWidth] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartX = useRef(0);
  const dragLastTranslate = useRef(0);
  const [translate, setTranslate] = useState(0);
  const [logicalIndex, setLogicalIndex] = useState(0); // index within original items

  // If no items, render a small placeholder
  if (!items || items.length === 0) {
    return <div className={styles.empty}>Nenhum outro artigo</div>;
  }

  // Prepare looped array: [items, items, items] — we'll keep viewport centered on middle copy
  const n = items.length;
  const loopItems = [...items, ...items, ...items];

  // Calculate item width based on viewport
  useEffect(() => {
    function calc() {
      if (!viewportRef.current) return;
      const vw = viewportRef.current.clientWidth;
      const w = vw / VISIBLE;
      setItemWidth(w);
    }
    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, []);

  // Initialize position to the start of the middle copy
  useEffect(() => {
    if (itemWidth === 0) return;
    const startIndex = n; // middle copy
    const px = -startIndex * itemWidth;
    // set without transition
    setTranslate(px);
    dragLastTranslate.current = px;
    setLogicalIndex(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemWidth, n]);

  // Utility: convert logical index (0..n-1) to absolute index in loopItems centered at middle copy
  const logicalToAbsolute = useCallback(
    (li: number) => {
      // center at middle copy start (index = n) + li
      return n + (li % n + n) % n;
    },
    [n]
  );

  // Move to logical index (with animation)
  const moveToLogical = useCallback(
    (targetLogical: number) => {
      if (itemWidth === 0) return;
      const abs = logicalToAbsolute(targetLogical);
      const px = -abs * itemWidth;
      setTranslate(px);
      dragLastTranslate.current = px;
      setLogicalIndex(((targetLogical % n) + n) % n);
    },
    [itemWidth, logicalToAbsolute, n]
  );

  // Next / Prev handlers
  const next = () => moveToLogical(logicalIndex + 1);
  const prev = () => moveToLogical(logicalIndex - 1);

  // Pointer drag handlers
  function onPointerDown(e: React.PointerEvent) {
    setIsDragging(true);
    dragStartX.current = e.clientX;
    (e.target as Element).setPointerCapture?.(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!isDragging) return;
    const dx = e.clientX - dragStartX.current;
    const nextTranslate = dragLastTranslate.current + dx;
    setTranslate(nextTranslate);
  }

  function onPointerUp(e: React.PointerEvent) {
    if (!isDragging) return;
    setIsDragging(false);
    const dx = e.clientX - dragStartX.current;
    const final = dragLastTranslate.current + dx;
    // determine nearest item
    const rawIndex = Math.round(-final / itemWidth);
    // clamp into middle copy range [n .. 2n-1] then map back to logical
    let absIndex = rawIndex;
    // normalize into [0 .. 3n-1]
    absIndex = ((absIndex % (3 * n)) + 3 * n) % (3 * n);
    // if near edges, jump to equivalent in middle copy to maintain infinite feel
    if (absIndex < n) absIndex += n;
    if (absIndex >= 2 * n) absIndex -= n;
    const targetLogical = (absIndex - n + n) % n;
    moveToLogical(targetLogical);
  }

  // When translate state changes, update dragLastTranslate after transition ends (so drag resumes correctly)
  useEffect(() => {
    // if trackRef not present, just set
    if (!trackRef.current) {
      dragLastTranslate.current = translate;
      return;
    }
    const node = trackRef.current;
    // apply transform via style (we render inline below)
    // After transition (300ms), ensure we are still within the middle copy range; if not, snap silently
    const handleTransitionEnd = () => {
      // compute absolute index from translate
      if (itemWidth === 0) return;
      const abs = Math.round(-translate / itemWidth);
      let absNorm = ((abs % (3 * n)) + 3 * n) % (3 * n);
      // snap into middle copy
      if (absNorm < n) absNorm += n;
      if (absNorm >= 2 * n) absNorm -= n;
      const px = -absNorm * itemWidth;
      dragLastTranslate.current = px;
      // if px differs from current translate, apply without transition
      if (Math.abs(px - translate) > 0.5) {
        setTranslate(px);
      }
    };

    node.addEventListener("transitionend", handleTransitionEnd);
    return () => node.removeEventListener("transitionend", handleTransitionEnd);
  }, [translate, itemWidth, n]);

  // keyboard support
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [logicalIndex]); // logicalIndex used to keep handlers stable

  // render
  const transitionStyle = isDragging ? { transition: "none" } : { transition: "transform 300ms ease" };

  return (
    <div className={styles.carousel} aria-roledescription="carousel">
      <button className={styles.nav} onClick={prev} aria-label="anterior">‹</button>

      <div
        className={styles.viewport}
        ref={viewportRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => setIsDragging(false)}
        role="region"
        aria-label="Carrossel de artigos"
      >
        <div
          className={styles.track}
          ref={trackRef}
          style={{
            width: `${(loopItems.length * 100) / VISIBLE}%`,
            transform: `translateX(${translate}px)`,
            ...transitionStyle,
          }}
        >
          {loopItems.map((it, idx) => (
            <div
              key={`${it.slug}-${idx}`}
              className={styles.card}
              style={{ width: `${100 / loopItems.length}%` }}
            >
              <Link href={`/archive/${it.slug}`} className={styles.cardLink}>
                <div className={styles.cardMedia}>
                  <Image src={it.cover} alt={it.title} fill sizes="(min-width: 860px) 25vw, 70vw" />
                </div>
                <div className={styles.cardBody}>
                  <div className={styles.cardKicker}>
                    {it.subject} {it.role ? `— ${it.role}` : ""}
                  </div>
                  <div className={styles.cardTitle}>{it.title}</div>
                </div>
              </Link>
            </div>
          ))}
        </div>
      </div>

      <button className={styles.nav} onClick={next} aria-label="próximo">›</button>
    </div>
  );
}