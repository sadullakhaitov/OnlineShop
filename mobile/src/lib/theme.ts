import { useColorScheme } from "react-native";
import { useSettings } from "./settings";

/** The website's colours, so the app and the site look like one shop. */
const light = {
  dark: false,
  bg: "#f3eee8",
  bgDeep: "#e9e1d7",
  text: "#16130f",
  muted: "#6e665d",
  faint: "#a39a8f",
  accent: "#b07c3f",
  accentSoft: "rgba(176, 124, 63, 0.14)",
  btn: "#16130f",
  btnText: "#ffffff",
  hairline: "rgba(22, 19, 15, 0.08)",
  danger: "#cf3a41",
  success: "#1f9d61",
  glass: "rgba(255, 255, 255, 0.55)",
  glassStrong: "rgba(255, 255, 255, 0.78)",
  glassBorder: "rgba(255, 255, 255, 0.8)",
  shadow: "rgba(88, 66, 40, 0.16)",
  tile: ["rgba(255,255,255,0.9)", "rgba(240,232,222,0.6)"] as const,
  blobs: ["rgba(226, 190, 150, 0.55)", "rgba(255, 255, 255, 0.9)", "rgba(200, 180, 215, 0.3)"] as const,
};

export type Palette = Omit<typeof light, "tile" | "blobs"> & {
  tile: readonly [string, string];
  blobs: readonly [string, string, string];
};

const dark: Palette = {
  dark: true,
  bg: "#0b0b0d",
  bgDeep: "#050506",
  text: "#f5f2ed",
  muted: "#a09a92",
  faint: "#6b665f",
  accent: "#dcae6e",
  accentSoft: "rgba(220, 174, 110, 0.16)",
  btn: "#f5f2ed",
  btnText: "#121110",
  hairline: "rgba(255, 255, 255, 0.08)",
  danger: "#ff7b7f",
  success: "#4fd397",
  glass: "rgba(255, 255, 255, 0.06)",
  glassStrong: "rgba(30, 29, 32, 0.78)",
  glassBorder: "rgba(255, 255, 255, 0.11)",
  shadow: "rgba(0, 0, 0, 0.55)",
  tile: ["rgba(255,255,255,0.09)", "rgba(255,255,255,0.025)"] as const,
  blobs: ["rgba(190, 130, 60, 0.26)", "rgba(70, 90, 160, 0.2)", "rgba(140, 80, 160, 0.16)"] as const,
};

export function usePalette(): Palette {
  const system = useColorScheme();
  const { theme } = useSettings();
  const isDark = theme === "system" ? system === "dark" : theme === "dark";
  return isDark ? dark : light;
}

export const radius = { card: 24, tile: 20, pill: 999, field: 16 };
