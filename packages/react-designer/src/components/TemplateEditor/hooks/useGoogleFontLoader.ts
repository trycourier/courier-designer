import { useEffect, useRef } from "react";

const LINK_ID_PREFIX = "courier-google-font-";

/**
 * Injects a <link rel="stylesheet"> into <head> to load a Google Font
 * for the editor preview. Cleans up on unmount or when the URL changes.
 */
export function useGoogleFontLoader(googleFontsUrl: string | undefined) {
  const prevUrlRef = useRef<string | undefined>();

  useEffect(() => {
    if (googleFontsUrl === prevUrlRef.current) return;

    // Remove previous link if URL changed
    if (prevUrlRef.current) {
      const prevId = LINK_ID_PREFIX + encodeURIComponent(prevUrlRef.current);
      document.getElementById(prevId)?.remove();
    }

    prevUrlRef.current = googleFontsUrl;

    if (!googleFontsUrl) return;

    const linkId = LINK_ID_PREFIX + encodeURIComponent(googleFontsUrl);

    // Avoid duplicates if multiple components use the same URL
    if (document.getElementById(linkId)) return;

    const link = document.createElement("link");
    link.id = linkId;
    link.rel = "stylesheet";
    link.href = googleFontsUrl;
    document.head.appendChild(link);

    return () => {
      document.getElementById(linkId)?.remove();
      prevUrlRef.current = undefined;
    };
  }, [googleFontsUrl]);
}
