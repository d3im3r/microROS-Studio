export const palettes = [
  { id: "default", label: "Default" },
  { id: "tweakcn", label: "invincible theme" },
  { id: "clean-slate", label: "Clean Slate" },
] as const;
export type Palette = typeof palettes[number]["id"];
export function isPalette(value: unknown): value is Palette { return palettes.some(p => p.id === value); }
