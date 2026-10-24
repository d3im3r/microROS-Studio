import { LanguageProvider } from "@/features/language";
import { palettes } from "@/features/theme/catalog";
import { ThemeProvider } from "@/features/theme";
import type { Metadata } from "next";
import "@xyflow/react/dist/style.css";
import "./globals.css";
export const metadata: Metadata = { title: "microROS Studio", description: "Build micro-ROS programs and generate firmware for ESP32 boards.", icons: { icon: [{ url: "/icons/studio-chip-yellow.svg", type: "image/svg+xml" }], apple: [{ url: "/brand/d3im3r/apple-touch-icon.png", sizes: "180x180", type: "image/png" }] } };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{ __html: `(function(){try{var p=localStorage.getItem('microros-palette');document.documentElement.dataset.palette=${JSON.stringify(palettes.map(p => p.id))}.includes(p)?p:'tweakcn';var t=localStorage.getItem('microros-theme');document.documentElement.classList.toggle('dark',t==='dark'||(t!=='light'&&window.matchMedia('(prefers-color-scheme: dark)').matches));}catch(e){document.documentElement.classList.add('dark');}})();` }} /></head><body><LanguageProvider><ThemeProvider>{children}</ThemeProvider></LanguageProvider></body></html>;
}
