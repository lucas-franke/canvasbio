import { cn } from "cn";

import {
  IMAGE_FORMATS,
  portraitSrcSet,
  portraitUrl,
  type PortraitKind,
  type PortraitThumb,
} from "~/lib/content/images";

interface PortraitProps {
  slug: string;
  /** Thumb data; with `lqip` a blurred preview is shown while loading, else the dominant color. */
  image: PortraitThumb & { lqip?: string };
  kind?: PortraitKind;
  /** Alternative text; pass "" for decorative use (the element is then hidden from assistive tech). */
  alt: string;
  /** `sizes` attribute, e.g. "(min-width: 768px) 240px, 33vw". */
  sizes: string;
  className?: string;
  loading?: "lazy" | "eager";
}

/**
 * Responsive portrait (AVIF/WebP) with a blurred placeholder until the image has loaded.
 */
export function Portrait({
  slug,
  image,
  kind = "sq",
  alt,
  sizes,
  className,
  loading = "lazy",
}: PortraitProps) {
  const width = kind === "sq" ? 320 : 640;
  const height = kind === "sq" ? 320 : Math.round((640 * image.height) / image.width);

  return (
    <picture>
      {IMAGE_FORMATS.map((format) => (
        <source
          key={format}
          type={`image/${format}`}
          srcSet={portraitSrcSet(slug, kind, format, image.hash)}
          sizes={sizes}
        />
      ))}
      <img
        src={portraitUrl(slug, kind, width, "webp", image.hash)}
        alt={alt}
        aria-hidden={alt === "" ? true : undefined}
        width={width}
        height={height}
        loading={loading}
        decoding="async"
        draggable={false}
        className={cn("bg-cover bg-center", className)}
        style={{
          backgroundColor: image.color,
          backgroundImage: image.lqip ? `url("${image.lqip}")` : undefined,
        }}
      />
    </picture>
  );
}
