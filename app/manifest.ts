import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Suitly — شقق مفروشة",
    short_name: "Suitly",
    start_url: "/ar",
    display: "standalone",
    background_color: "#F8F9FB",
    theme_color: "#223352",
    lang: "ar",
    dir: "rtl",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
