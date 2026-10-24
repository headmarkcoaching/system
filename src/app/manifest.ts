import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Head Mark Coaching",
    short_name: "Head Mark",
    description: "Live group classes, student accountability, and parent visibility for Class 8 through 2nd Year.",
    // A stable identity for the installed app, so it stays the same app if start_url ever changes.
    id: "/",
    lang: "en",
    dir: "ltr",
    // The installed app is for people who already have an account, so it opens at sign-in (or straight to
    // their dashboard if signed in) rather than the public website at "/".
    start_url: "/login",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#2861bd",
    categories: ["education"],
    prefer_related_applications: false,
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
