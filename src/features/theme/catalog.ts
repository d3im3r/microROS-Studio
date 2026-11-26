export const palettes = [
  { id: "d3im3r", label: "d3im3r" },
  { id: "tweakcn", label: "invincible theme" },
  { id: "default", label: "Default" },
  { id: "clean-slate", label: "Clean Slate" },
] as const;
export type Palette = typeof palettes[number]["id"];
export function isPalette(value: unknown): value is Palette { return palettes.some(p => p.id === value); }
