"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    instgrm?: { Embeds: { process: () => void } };
  }
}

export default function InstagramEmbedGrid({ urls }: { urls: string[] }) {
  useEffect(() => {
    const existing = document.getElementById("instagram-embed-script");
    if (existing) {
      window.instgrm?.Embeds.process();
      return;
    }
    const script = document.createElement("script");
    script.id = "instagram-embed-script";
    script.src = "https://www.instagram.com/embed.js";
    script.async = true;
    script.onload = () => window.instgrm?.Embeds.process();
    document.body.appendChild(script);
  }, [urls]);

  return (
    <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
      {urls.map((url) => (
        <blockquote
          key={url}
          className="instagram-media"
          data-instgrm-permalink={url}
          data-instgrm-version="14"
          style={{
            background: "#FFF",
            border: 0,
            borderRadius: 12,
            margin: "0 auto",
            maxWidth: 540,
            minWidth: 300,
            width: "100%",
          }}
        />
      ))}
    </div>
  );
}
