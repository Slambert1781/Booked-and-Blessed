import type { MetadataRoute } from "next";

// Lets phones install the app to the home screen and open it full screen.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Booked and Blessed",
    short_name: "Booked",
    description: "See what a gig really pays once travel is counted.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#fafaf9",
    theme_color: "#4338ca",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
