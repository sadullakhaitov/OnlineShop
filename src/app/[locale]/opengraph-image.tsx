import { ImageResponse } from "next/og";

export const alt = "Multimedia";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const lines: Record<string, [string, string]> = {
  uz: ["Maishiy texnika", "Buxoro bo'ylab yetkazib berish"],
  ru: ["Бытовая техника", "Доставка по Бухаре"],
};

/** The picture shown when a shop link is shared in Telegram or elsewhere. */
export default async function Image({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const [title, note] = lines[locale] ?? lines.uz;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "linear-gradient(135deg, #ffffff 0%, #f4f4f5 60%, #fde2e3 100%)",
          color: "#111113",
        }}
      >
        <div style={{ display: "flex", fontSize: 96, fontWeight: 800, fontStyle: "italic", letterSpacing: -2 }}>
          <span style={{ color: "#e10a14" }}>MULTI</span>
          <span>MEDIA</span>
        </div>
        <div style={{ marginTop: 24, fontSize: 52, fontWeight: 600 }}>{title}</div>
        <div style={{ marginTop: 12, fontSize: 36, color: "#5f5f66" }}>{note}</div>
      </div>
    ),
    size,
  );
}
