import { useEffect } from "react";
import { applyTokens, loadStoredTokens } from "@/lib/theme-tokens";

export function ThemeLoader() {
  useEffect(() => {
    applyTokens(loadStoredTokens());
  }, []);
  return null;
}
