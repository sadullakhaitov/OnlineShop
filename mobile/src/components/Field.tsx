import { Text, TextInput, View, type TextInputProps } from "react-native";
import { radius, usePalette } from "@/lib/theme";

export function Field({ label, error, prefix, ...props }: TextInputProps & { label: string; error?: string; prefix?: string }) {
  const c = usePalette();
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ color: c.muted, fontSize: 13, paddingLeft: 4 }}>{label}</Text>
      <View
        style={{
          flexDirection: "row",
          alignItems: props.multiline ? "flex-start" : "center",
          borderRadius: radius.field,
          borderWidth: 1,
          borderColor: error ? c.danger : c.hairline,
          backgroundColor: c.glassStrong,
          paddingHorizontal: 14,
          minHeight: 50,
        }}
      >
        {prefix ? <Text style={{ color: c.text, fontSize: 16, marginRight: 6 }}>{prefix}</Text> : null}
        <TextInput
          placeholderTextColor={c.faint}
          accessibilityLabel={label}
          {...props}
          style={[{ flex: 1, fontSize: 16, color: c.text, paddingVertical: 12 }, props.multiline && { minHeight: 80, textAlignVertical: "top" }]}
        />
      </View>
      {error ? <Text style={{ color: c.danger, fontSize: 13, paddingLeft: 4 }}>{error}</Text> : null}
    </View>
  );
}
