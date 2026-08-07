import { useEffect, useState } from "react";

const QUERY = "(max-width: 820px)";

function readIsMobile() {
  return window.matchMedia(QUERY).matches;
}

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(readIsMobile);

  useEffect(() => {
    const mql = window.matchMedia(QUERY);
    const onChange = () => setIsMobile(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isMobile;
}
