"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./gallery.module.css";

type AudioPlayerProps = {
  src: string;
  title?: string;
};

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "00:00";
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  return `${minutes.toString().padStart(2, "0")}:${remainingSeconds
    .toString()
    .padStart(2, "0")}`;
}

export default function AudioPlayer({
  src,
  title,
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handlePlay = () => {
      setIsPlaying(true);
    };

    const handlePause = () => {
      setIsPlaying(false);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener(
      "loadedmetadata",
      handleLoadedMetadata
    );

    audio.addEventListener(
      "timeupdate",
      handleTimeUpdate
    );

    audio.addEventListener(
      "play",
      handlePlay
    );

    audio.addEventListener(
      "pause",
      handlePause
    );

    audio.addEventListener(
      "ended",
      handleEnded
    );

    return () => {
      audio.removeEventListener(
        "loadedmetadata",
        handleLoadedMetadata
      );

      audio.removeEventListener(
        "timeupdate",
        handleTimeUpdate
      );

      audio.removeEventListener(
        "play",
        handlePlay
      );

      audio.removeEventListener(
        "pause",
        handlePause
      );

      audio.removeEventListener(
        "ended",
        handleEnded
      );
    };
  }, []);

  const togglePlay = async () => {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    if (audio.paused) {
      try {
        await audio.play();
      } catch {
        setIsPlaying(false);
      }
    } else {
      audio.pause();
    }
  };

  const handleProgressChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    const nextTime = Number(event.target.value);

    audio.currentTime = nextTime;
    setCurrentTime(nextTime);
  };

  const progress =
    duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className={styles.audioPlayer}>
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
      />

      <div className={styles.audioTop}>
        <div className={styles.audioIcon} aria-hidden="true">
          ♪
        </div>

        <div className={styles.audioTitle}>
          {title || "Áudio"}
        </div>
      </div>

      <div className={styles.audioControls}>
        <button
          type="button"
          className={styles.playButton}
          onClick={togglePlay}
          aria-label={isPlaying ? "Pausar áudio" : "Reproduzir áudio"}
        >
          {isPlaying ? "Ⅱ" : "▶"}
        </button>

        <div className={styles.progressContainer}>
          <input
            type="range"
            min="0"
            max={duration || 0}
            step="0.01"
            value={currentTime}
            onChange={handleProgressChange}
            className={styles.progress}
            style={{
              "--progress": `${progress}%`,
            } as React.CSSProperties}
            aria-label="Progresso do áudio"
          />
        </div>

        <time className={styles.audioTime}>
          {formatTime(currentTime)}
          {" / "}
          {formatTime(duration)}
        </time>
      </div>

      <div
        className={`${styles.audioBars} ${
          isPlaying ? styles.audioBarsPlaying : ""
        }`}
        aria-hidden="true"
      >
        <span />
        <span />
        <span />
        <span />
        <span />
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}