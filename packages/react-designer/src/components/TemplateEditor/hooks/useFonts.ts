import { useAtomValue } from "jotai";
import { useEffect, useState } from "react";
import { apiUrlAtom, tokenAtom } from "../../Providers/store";
import type { FontEntry } from "@/types/font.types";

const GET_FONTS_QUERY = `
  query GetFonts {
    fonts {
      name
      fontFamily
      sourceType
      googleFontsUrl
      previewUrl
    }
  }
`;

export function useFonts() {
  const apiUrl = useAtomValue(apiUrlAtom);
  const token = useAtomValue(tokenAtom);
  const [fonts, setFonts] = useState<FontEntry[]>([]);

  useEffect(() => {
    if (!apiUrl || !token) return;

    let cancelled = false;

    (async () => {
      try {
        const response = await fetch(apiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            "x-courier-client-key": `Bearer ${token}`,
          },
          body: JSON.stringify({ query: GET_FONTS_QUERY }),
        });

        if (!response.ok || cancelled) return;

        const json = await response.json();
        if (!cancelled && json.data?.fonts) {
          setFonts(json.data.fonts);
        }
      } catch {
        // Font loading is best-effort; editor works without it
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [apiUrl, token]);

  return { fonts };
}
