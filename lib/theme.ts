export type DiaryTheme = {
  backgroundColor: `#${string}`;
  textColor: `#${string}`;
};

function hashStringToUint32(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = (h % 360) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r1 = 0,
    g1 = 0,
    b1 = 0;
  if (hp >= 0 && hp < 1) [r1, g1, b1] = [c, x, 0];
  else if (hp >= 1 && hp < 2) [r1, g1, b1] = [x, c, 0];
  else if (hp >= 2 && hp < 3) [r1, g1, b1] = [0, c, x];
  else if (hp >= 3 && hp < 4) [r1, g1, b1] = [0, x, c];
  else if (hp >= 4 && hp < 5) [r1, g1, b1] = [x, 0, c];
  else [r1, g1, b1] = [c, 0, x];
  const m = l - c / 2;
  return {
    r: Math.round((r1 + m) * 255),
    g: Math.round((g1 + m) * 255),
    b: Math.round((b1 + m) * 255),
  };
}

function rgbToHex({ r, g, b }: { r: number; g: number; b: number }): `#${string}` {
  const to2 = (n: number) => n.toString(16).padStart(2, "0");
  return `#${to2(r)}${to2(g)}${to2(b)}` as const;
}

function srgbToLinear(c: number): number {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

function relativeLuminance(rgb: { r: number; g: number; b: number }): number {
  const R = srgbToLinear(rgb.r);
  const G = srgbToLinear(rgb.g);
  const B = srgbToLinear(rgb.b);
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

function contrastRatio(l1: number, l2: number): number {
  const [a, b] = l1 >= l2 ? [l1, l2] : [l2, l1];
  return (a + 0.05) / (b + 0.05);
}

function parseHex(hex: string): { r: number; g: number; b: number } {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return { r: 0, g: 0, b: 0 };
  const v = m[1];
  return {
    r: parseInt(v.slice(0, 2), 16),
    g: parseInt(v.slice(2, 4), 16),
    b: parseInt(v.slice(4, 6), 16),
  };
}

function bestTextColor(bgRgb: { r: number; g: number; b: number }): `#${string}` {
  const Lbg = relativeLuminance(bgRgb);
  const cWhite = contrastRatio(1, Lbg);
  const cBlack = contrastRatio(0, Lbg);
  return cWhite >= cBlack ? ("#ffffff" as const) : ("#000000" as const);
}

export function generateDiaryTheme(dateKey: string): DiaryTheme {
  const seed = hashStringToUint32(dateKey);
  const hue = seed % 360;
  const sat = 0.62;
  let l = 0.42 + ((seed >>> 8) % 20) / 100; // 0.42..0.61
  let bg = hslToRgb(hue, sat, l);
  let text = bestTextColor(bg);
  const target = 4.5;

  for (let i = 0; i < 30; i++) {
    const Lbg = relativeLuminance(bg);
    const Lt = text === "#ffffff" ? 1 : 0;
    const cr = contrastRatio(Lt, Lbg);
    if (cr >= target) break;
    l = text === "#ffffff" ? Math.max(0, l - 0.03) : Math.min(1, l + 0.03);
    bg = hslToRgb(hue, sat, l);
    text = bestTextColor(bg);
  }

  return {
    backgroundColor: rgbToHex(bg),
    textColor: text,
  };
}

export function isValidDateKey(dateKey: string): boolean {
  if (!/^\d{8}$/.test(dateKey)) return false;
  const y = Number(dateKey.slice(0, 4));
  const m = Number(dateKey.slice(4, 6));
  const d = Number(dateKey.slice(6, 8));
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  );
}

export function dateInputToDateKey(value: string): string {
  const [y, m, d] = value.split("-");
  return `${y}${m}${d}`;
}

export function dateKeyToDateInput(dateKey: string): string {
  return `${dateKey.slice(0, 4)}-${dateKey.slice(4, 6)}-${dateKey.slice(6, 8)}`;
}

export function clampTitle(title: string): string {
  return title.trim().slice(0, 100);
}

export function clampContent(content: string): string {
  return content.slice(0, 10000);
}

export function normalizeLineEndings(s: string): string {
  return s.replaceAll("\r\n", "\n");
}

export function sanitizeField(s: string): string {
  return normalizeLineEndings(s);
}

export function parseHexToRgb(hex: `#${string}`): { r: number; g: number; b: number } {
  return parseHex(hex);
}

