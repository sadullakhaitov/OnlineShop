import { router } from "expo-router";
import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from "react-native";
import { Field } from "@/components/Field";
import { Backdrop, Button, Glass, TopBar, Txt } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { formatLocalPhone, formatPhone } from "@/lib/format";
import { fill, useT } from "@/lib/i18n";
import { GUTTER } from "@/lib/layout";
import { useShop } from "@/lib/shop";
import { usePalette } from "@/lib/theme";

export default function Login() {
  const c = usePalette();
  const { t, locale } = useT();
  const shop = useShop();
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [digits, setDigits] = useState("");
  const [code, setCode] = useState("");
  const [demoCode, setDemoCode] = useState<string | undefined>();
  const [wait, setWait] = useState(0);
  const [error, setError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const phone = `+998${digits}`;

  useEffect(() => {
    if (wait <= 0) return;
    const timer = setTimeout(() => setWait(wait - 1), 1000);
    return () => clearTimeout(timer);
  }, [wait]);

  async function sendCode() {
    if (digits.length !== 9) return setError(t.login.errors.phone);
    setBusy(true);
    setError(undefined);
    try {
      const result = await api.requestCode(phone, locale);
      setDemoCode(result.demoCode);
      setWait(result.resendAfter);
      setStep("code");
    } catch (e) {
      const body = e instanceof ApiError ? e.body : null;
      if (body?.error === "wait") {
        setWait(Number(body.retryAfter ?? 60));
        setStep("code");
      } else {
        setError(body?.error === "limit" ? t.login.errors.tooMany : body?.error === "sms" ? t.login.errors.sms : body?.error === "phone" ? t.login.errors.phone : t.login.errors.server);
      }
    } finally {
      setBusy(false);
    }
  }

  async function verify(value = code) {
    if (value.length !== 6) return;
    setBusy(true);
    setError(undefined);
    try {
      const result = await api.verifyCode(phone, value);
      shop.signIn(result.token);
      router.back();
    } catch (e) {
      const reason = e instanceof ApiError ? e.body?.error : null;
      setError(reason === "invalid" ? t.login.errors.wrong : reason === "expired" ? t.login.errors.expired : reason === "attempts" ? t.login.errors.tooMany : t.login.errors.server);
      setCode("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ flex: 1 }}>
      <Backdrop />
      <TopBar title={t.login.title} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: GUTTER }}>
          <Glass style={{ padding: 20, gap: 16 }}>
            {step === "phone" ? (
              <>
                <Txt variant="muted">{t.login.phoneText}</Txt>
                <Field
                  label={t.checkout.phone}
                  prefix="+998"
                  value={formatLocalPhone(digits)}
                  onChangeText={(text) => setDigits(text.replace(/\D/g, "").slice(0, 9))}
                  keyboardType="phone-pad"
                  placeholder="90 123 45 67"
                  autoFocus
                  error={error}
                />
                <Button title={t.login.getCode} loading={busy} onPress={sendCode} />
              </>
            ) : (
              <>
                <Txt variant="muted">{fill(t.login.codeText, { phone: formatPhone(phone) })}</Txt>
                {demoCode && (
                  <View style={{ backgroundColor: c.accentSoft, borderRadius: 14, padding: 12 }}>
                    <Txt style={{ color: c.accent, fontWeight: "600" }}>{fill(t.login.demo, { code: demoCode })}</Txt>
                  </View>
                )}
                <Field
                  label={t.login.code}
                  value={code}
                  onChangeText={(text) => {
                    const next = text.replace(/\D/g, "").slice(0, 6);
                    setCode(next);
                    if (next.length === 6) verify(next);
                  }}
                  keyboardType="number-pad"
                  autoComplete="sms-otp"
                  textContentType="oneTimeCode"
                  autoFocus
                  error={error}
                  style={{ letterSpacing: 6 }}
                />
                <Button title={t.login.verify} loading={busy} disabled={code.length !== 6} onPress={() => verify()} />
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Pressable onPress={() => { setStep("phone"); setCode(""); setError(undefined); }} hitSlop={8}>
                    <Txt variant="small">{t.login.change}</Txt>
                  </Pressable>
                  {wait > 0 ? (
                    <Txt variant="small">{fill(t.login.resendIn, { s: wait })}</Txt>
                  ) : (
                    <Pressable onPress={sendCode} hitSlop={8}>
                      <Txt style={{ color: c.accent, fontWeight: "600", fontSize: 13 }}>{t.login.resend}</Txt>
                    </Pressable>
                  )}
                </View>
              </>
            )}
          </Glass>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
