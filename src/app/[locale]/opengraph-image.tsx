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
          background: "linear-gradient(135deg, #f8f1e6 0%, #efe4d4 55%, #e2be96 100%)",
          color: "#16130f",
        }}
      >
        <div style={{ display: "flex", fontSize: 96, fontWeight: 700, letterSpacing: -3 }}>
          <span>multi</span>
          <span style={{ color: "#a8743c" }}>media</span>
        </div>
        <div style={{ marginTop: 24, fontSize: 52, fontWeight: 600 }}>{title}</div>
        <div style={{ marginTop: 12, fontSize: 36, color: "#6b6258" }}>{note}</div>
      </div>
    ),
    size,
  );
}
