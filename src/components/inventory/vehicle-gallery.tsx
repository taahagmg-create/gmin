"use client";

import Image from "next/image";
import { useState } from "react";
import type { VehicleImage } from "@/lib/inventory/types";

/**
 * Vehicle photo gallery — main image plus a selectable thumbnail strip.
 *
 * This is the permanent vehicle media experience, not a placeholder: Esteem has
 * no 360° photo sets, so the §5 spin viewer has no source material. Kept as its
 * own component anyway, so a real viewer could replace it in place with the same
 * props if 360 capture is ever added at photography time.
 *
 * Only the selected full-size image is eager; the rest load lazily, so a
 * 27-photo listing doesn't cost 27 full-size downloads up front.
 */
export function VehicleGallery({ images, title }: { images: VehicleImage[]; title: string }) {
  const [index, setIndex] = useState(0);

  if (images.length === 0) {
    return (
      <div className="flex aspect-[4/3] items-center justify-center rounded-2xl border border-dashed border-ink-line bg-ink-soft text-sm text-neutral-600">
        No photos for this vehicle yet
      </div>
    );
  }

  const active = images[Math.min(index, images.length - 1)];

  const step = (delta: number) =>
    setIndex((i) => (i + delta + images.length) % images.length);

  return (
    <div
      role="group"
      aria-label={`${title} photos`}
      onKeyDown={(e) => {
        // Arrow keys move between photos once focus is anywhere in the gallery.
        // Now that this is the primary way to look at a vehicle rather than a
        // stand-in for a spin viewer, it should not be mouse-only.
        if (e.key === "ArrowRight") {
          e.preventDefault();
          step(1);
        } else if (e.key === "ArrowLeft") {
          e.preventDefault();
          step(-1);
        }
      }}
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-ink-line bg-ink-soft">
        {/* The LCP element on this page — fetched eagerly at the right size. */}
        <Image
          src={active.full}
          alt={`${title} — photo ${index + 1} of ${images.length}`}
          fill
          priority
          sizes="(min-width: 1024px) 60vw, 100vw"
          className="object-cover"
        />
      </div>

      {images.length > 1 && (
        <ul className="mt-3 grid grid-cols-5 gap-2 sm:grid-cols-6">
          {images.map((img, i) => (
            <li key={img.full}>
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Show photo ${i + 1}`}
                aria-current={i === index}
                className={`block w-full overflow-hidden rounded-lg border transition ${
                  i === index
                    ? "border-accent"
                    : "border-ink-line opacity-70 hover:opacity-100"
                }`}
              >
                <span className="relative block aspect-[4/3] w-full">
                  <Image
                    src={img.thumb ?? img.full}
                    alt=""
                    fill
                    sizes="120px"
                    className="object-cover"
                  />
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
