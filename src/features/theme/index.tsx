"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { palettes, isPalette, type Palette } from "./catalog";
type Theme = "light" | "dark";
const ThemeContext = createContext<{ theme: Theme; toggle: () => void; palette: Palette; selectPalette: (palette: Palette) => void }>({ theme: "dark", toggle: () => {}, palette: "tweakcn", selectPalette: () => {} });
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark");
  const [palette, setPalette] = useState<Palette>("tweakcn");
  useEffect(() => { setPalette(isPalette(document.documentElement.dataset.palette) ? document.documentElement.dataset.palette : "tweakcn"); setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light"); }, []);
  function selectPalette(next: Palette) {
    document.documentElement.dataset.palette = next;
    setPalette(next);
    try { localStorage.setItem("microros-palette", next); } catch {}
  }
  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.classList.toggle("dark", next === "dark");
    setTheme(next);
    try { localStorage.setItem("microros-theme", next); } catch { /* Theme still works without storage. */ }
  }
  return <ThemeContext.Provider value={{ theme, toggle, palette, selectPalette }}>{children}</ThemeContext.Provider>;
}
export function useTheme() { return useContext(ThemeContext); }
export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const label = theme === "dark" ? "Switch to light theme" : "Switch to dark theme";
  return <Button variant="outline" size="icon" onClick={toggle} aria-label={label} title={label}>{theme === "dark" ? <Sun /> : <Moon />}</Button>;
}

export function ThemeSelector() {
  const { palette, selectPalette } = useTheme();
  return <select aria-label="Color theme" style={{width:"auto",minWidth:0,maxWidth:176}} className="h-9 w-auto max-w-44 text-xs" value={palette} onChange={event => selectPalette(event.target.value as Palette)}>{palettes.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}</select>;
}
