import type { MetadataRoute } from "next";

// ponytail: fixed hex derived from --brand oklch(0.6 0.21 27.6).
// Manifest wants sRGB hex; revisit if brand is re-themed at runtime.
const BRAND_HEX = "#b04d20";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Unipar",
    short_name: "Unipar",
    description: "Painel de Controle Unipar",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: BRAND_HEX,
    orientation: "portrait-primary",
    lang: "pt-BR",
    scope: "/",
    categories: ["business", "productivity", "communication"],
    icons: [
      {
        src: "/logo.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/logo.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/logo.png",
        sizes: "any",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
