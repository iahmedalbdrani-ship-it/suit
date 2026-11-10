import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Suitly — شقق مفروشة",
    short_name: "Suitly",
    start_url: "/ar",
    display: "standalone",
    background_color: "#FBF8F3",
    theme_color: "#173B3B",
    lang: "ar",
    dir: "rtl",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
