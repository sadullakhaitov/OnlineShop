import { Minus, Plus } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";
import { MAX_QUANTITY } from "@/lib/shop";
import { usePalette } from "@/lib/theme";

export function Quantity({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  const c = usePalette();
  const button = (label: string, next: number, icon: React.ReactNode, disabled?: boolean) => (
    <Pressable
      accessibilityLabel={label}
      disabled={disabled}
      onPress={() => onChange(next)}
      hitSlop={6}
      style={{ width: 32, height: 32, alignItems: "center", justifyContent: "center", opacity: disabled ? 0.35 : 1 }}
    >
      {icon}
    </Pressable>
  );
  return (
    <View style={{ flexDirection: "row", alignItems: "center", borderRadius: 999, borderWidth: 1, borderColor: c.hairline, backgroundColor: c.glass }}>
      {button("−", value - 1, <Minus size={16} color={c.text} />)}
      <Text style={{ minWidth: 22, textAlign: "center", color: c.text, fontWeight: "600" }}>{value}</Text>
      {button("+", value + 1, <Plus size={16} color={c.text} />, value >= MAX_QUANTITY)}
    </View>
  );
}
