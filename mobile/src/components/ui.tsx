import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { useId, type ReactNode } from "react";
import Svg, { Circle, Defs, RadialGradient, Stop } from "react-native-svg";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type PressableProps,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { artUrl } from "@/lib/api";
import { useT } from "@/lib/i18n";
import { radius, usePalette } from "@/lib/theme";

/** The warm glow behind every screen, like the website's background. */
export function Backdrop() {
  const c = usePalette();
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient colors={[c.bg, c.bgDeep]} style={StyleSheet.absoluteFill} />
      <Blob color={c.blobs[0]} style={{ top: -160, left: -140, width: 460, height: 460 }} />
      <Blob color={c.blobs[1]} style={{ top: 160, right: -180, width: 420, height: 420 }} />
      <Blob color={c.blobs[2]} style={{ bottom: -140, left: 0, width: 420, height: 420 }} />
    </View>
  );
}

/** A soft glow that fades to nothing at its edge. */
function Blob({ color, style }: { color: string; style: ViewStyle }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  return (
    <Svg style={[{ position: "absolute" }, style]} viewBox="0 0 100 100">
      <Defs>
        <RadialGradient id={id} cx="50" cy="50" r="50" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor={color} stopOpacity={1} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle cx="50" cy="50" r="50" fill={`url(#${id})`} />
    </Svg>
  );
}

/** A frosted glass panel: real blur on iOS and the web, a translucent panel on Android. */
export function Glass({
  children,
  style,
  strong,
  radius: r = radius.card,
}: {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  strong?: boolean;
  radius?: number;
}) {
  const c = usePalette();
  return (
    <View
      style={[
        {
          borderRadius: r,
          borderWidth: StyleSheet.hairlineWidth * 2,
          borderColor: c.glassBorder,
          overflow: "hidden",
          shadowColor: c.shadow,
          shadowOpacity: 1,
          shadowRadius: 24,
          shadowOffset: { width: 0, height: 10 },
          // The frosted layers sit behind the content, also on the web where
          // positioned layers would otherwise cover icons.
          zIndex: 0,
        },
        style,
      ]}
    >
      {Platform.OS !== "android" && (
        <BlurView intensity={strong ? 60 : 40} tint={c.dark ? "dark" : "light"} style={[StyleSheet.absoluteFill, { zIndex: -1 }]} />
      )}
      <View
        style={[
          StyleSheet.absoluteFill,
          { zIndex: -1, backgroundColor: Platform.OS === "android" ? c.glassStrong : strong ? c.glassStrong : c.glass },
        ]}
      />
      {children}
    </View>
  );
}

export function ProductImage({
  art,
  image,
  size,
  style,
}: {
  art: string;
  /** The product photo; the drawing of `art` is shown when there is none. */
  image?: string | null;
  size?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const c = usePalette();
  return (
    <LinearGradient
      colors={[...c.tile]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[{ borderRadius: radius.tile, alignItems: "center", justifyContent: "center" }, size ? { width: size, height: size } : null, style]}
    >
      <Image source={image || artUrl(art)} style={{ width: image ? "86%" : "78%", aspectRatio: 1 }} contentFit="contain" transition={250} />
    </LinearGradient>
  );
}

type ButtonProps = PressableProps & {
  title: string;
  variant?: "primary" | "secondary" | "accent";
  loading?: boolean;
  icon?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function Button({ title, variant = "primary", loading, icon, style, disabled, ...rest }: ButtonProps) {
  const c = usePalette();
  const bg = variant === "primary" ? c.btn : variant === "accent" ? c.accent : "transparent";
  const fg = variant === "primary" ? c.btnText : variant === "accent" ? "#ffffff" : c.text;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg, opacity: disabled ? 0.45 : pressed ? 0.8 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
        variant === "secondary" && { borderWidth: 1, borderColor: c.hairline, backgroundColor: c.glass },
        style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon}
          <Text style={[styles.buttonText, { color: fg }]}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

export function Chip({ label, active, onPress }: { label: string; active?: boolean; onPress?: () => void }) {
  const c = usePalette();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={({ pressed }) => [
        styles.chip,
        { backgroundColor: active ? c.btn : c.glass, borderColor: active ? c.btn : c.hairline, opacity: pressed ? 0.8 : 1 },
      ]}
    >
      <Text style={{ color: active ? c.btnText : c.text, fontSize: 14, fontWeight: "500" }}>{label}</Text>
    </Pressable>
  );
}

export function Txt({
  children,
  style,
  variant = "body",
  numberOfLines,
}: {
  children: ReactNode;
  style?: StyleProp<TextStyle>;
  variant?: "title" | "h2" | "body" | "muted" | "small" | "faint";
  numberOfLines?: number;
}) {
  const c = usePalette();
  const v: TextStyle = (
    {
    title: { fontSize: 30, fontWeight: "700", letterSpacing: -0.6, color: c.text },
    h2: { fontSize: 20, fontWeight: "600", letterSpacing: -0.3, color: c.text },
    body: { fontSize: 15, color: c.text },
    muted: { fontSize: 15, color: c.muted, lineHeight: 21 },
    small: { fontSize: 13, color: c.muted },
    faint: { fontSize: 12, color: c.faint },
  } satisfies Record<string, TextStyle>
  )[variant];
  return (
    <Text style={[v, style]} numberOfLines={numberOfLines}>
      {children}
    </Text>
  );
}

/** The bar on top of pushed screens: a glass back button and the title. */
export function TopBar({ title, right }: { title?: string; right?: ReactNode }) {
  const insets = useSafeAreaInsets();
  const { t } = useT();
  const c = usePalette();
  return (
    <View style={[styles.topBar, { paddingTop: insets.top + 6 }]}>
      <Pressable
        accessibilityLabel={t.common.back}
        onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
        hitSlop={8}
      >
        <Glass radius={999} style={styles.round}>
          <ChevronLeft color={c.text} size={22} strokeWidth={2} />
        </Glass>
      </Pressable>
      <Text numberOfLines={1} style={{ flex: 1, textAlign: "center", fontSize: 17, fontWeight: "600", color: c.text }}>
        {title}
      </Text>
      <View style={{ minWidth: 42, alignItems: "flex-end" }}>{right}</View>
    </View>
  );
}

export function RoundButton({ children, onPress, label }: { children: ReactNode; onPress: () => void; label: string }) {
  return (
    <Pressable accessibilityLabel={label} accessibilityRole="button" onPress={onPress} hitSlop={8}>
      <Glass radius={999} style={styles.round}>
        {children}
      </Glass>
    </Pressable>
  );
}

export function Empty({ icon, title, text, action }: { icon: ReactNode; title: string; text?: string; action?: ReactNode }) {
  const c = usePalette();
  return (
    <Glass style={{ padding: 28, alignItems: "center", gap: 10 }}>
      <View style={[styles.round, { width: 64, height: 64, backgroundColor: c.accentSoft }]}>{icon}</View>
      <Txt variant="h2" style={{ textAlign: "center", marginTop: 4 }}>
        {title}
      </Txt>
      {text ? <Txt variant="muted" style={{ textAlign: "center" }}>{text}</Txt> : null}
      {action ? <View style={{ marginTop: 8, alignSelf: "stretch" }}>{action}</View> : null}
    </Glass>
  );
}

export function LoadError({ onRetry }: { onRetry: () => void }) {
  const { t } = useT();
  return (
    <Glass style={{ padding: 24, gap: 14, alignItems: "center" }}>
      <Txt variant="muted" style={{ textAlign: "center" }}>
        {t.common.loadError}
      </Txt>
      <Button title={t.common.retry} variant="secondary" onPress={onRetry} />
    </Glass>
  );
}

export function Loading() {
  const c = usePalette();
  return (
    <View style={{ paddingVertical: 60, alignItems: "center" }}>
      <ActivityIndicator color={c.accent} />
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 52,
    borderRadius: radius.pill,
    paddingHorizontal: 22,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  buttonText: { fontSize: 16, fontWeight: "600", letterSpacing: -0.2 },
  chip: { height: 38, paddingHorizontal: 16, borderRadius: radius.pill, borderWidth: 1, justifyContent: "center" },
  topBar: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingBottom: 8 },
  round: { width: 42, height: 42, alignItems: "center", justifyContent: "center", borderRadius: 999 },
});
