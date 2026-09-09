import { useEffect, useRef, useState } from "react";

/**
 * Monaco needs an explicit theme name, so resolve the host's dark mode by
 * looking for a `.dark` ancestor rather than a media query.
 */
export const useIsDarkMode = () => {
  const [isDark, setIsDark] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkDarkMode = () => {
      if (containerRef.current) {
        const hasDarkClass = containerRef.current.closest(".dark") !== null;
        setIsDark(hasDarkClass);
      }
    };

    checkDarkMode();

    // Observe for class changes on parent elements
    const observer = new MutationObserver(checkDarkMode);
    if (containerRef.current?.parentElement) {
      observer.observe(document.body, {
        attributes: true,
        attributeFilter: ["class"],
        subtree: true,
      });
    }

    return () => observer.disconnect();
  }, []);

  return { isDark, containerRef };
};
