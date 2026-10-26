"use client";

import Image, { type ImageProps } from "next/image";
import { useState } from "react";

// An old cached error or an unavailable transformation must not hide a valid
// original. Reset implicitly when src changes, without an effect or reload.
export default function ResilientImage({
  src,
  alt,
  onError,
  unoptimized,
  ...props
}: ImageProps) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const useOriginal = typeof src === "string" && failedSource === src;

  return (
    <Image
      {...props}
      src={src}
      alt={alt}
      unoptimized={unoptimized || useOriginal}
      onError={(event) => {
        if (typeof src === "string" && src.startsWith("/")) {
          setFailedSource(src);
        }
        onError?.(event);
      }}
    />
  );
}
