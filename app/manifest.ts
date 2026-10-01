import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Pannon Transfer Naptár",
    short_name: "PT Naptár",
    description: "Pannon Transfer diszpécseri naptár Outlook-stílusban",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0f6cbd",
    lang: "hu",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
