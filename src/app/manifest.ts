import type { MetadataRoute } from "next";
import { asset } from "@/lib/paths";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "NORTE",
    short_name: "NORTE",
    description: "Direção para uma vida com propósito.",
    lang: "pt-BR",
    start_url: asset("/"),
    scope: asset("/"),
    display: "standalone",
    orientation: "portrait",
    background_color: "#0e2a45",
    theme_color: "#0e2a45",
    icons: [
      { src: asset("/icon.svg"), sizes: "any", type: "image/svg+xml" },
      { src: asset("/icon-192.png"), sizes: "192x192", type: "image/png" },
      { src: asset("/icon-512.png"), sizes: "512x512", type: "image/png" },
      { src: asset("/icon-maskable-512.png"), sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
