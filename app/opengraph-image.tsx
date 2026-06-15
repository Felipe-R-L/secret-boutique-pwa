import { ImageResponse } from "next/og";

// Imagem social padrão (WhatsApp, Facebook, LinkedIn e fallback do Twitter).
// Gerada pelo next/og — sem asset binário e sem dependência do domínio.
export const runtime = "edge";
export const alt = "The Secret Boutique — Bem-estar sexual e autocuidado";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background:
            "linear-gradient(135deg, #f7e9ee 0%, #fbf9f8 45%, #e9efe7 100%)",
          fontFamily: "sans-serif",
          padding: "64px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            padding: "10px 26px",
            borderRadius: "9999px",
            background: "rgba(81, 38, 64, 0.08)",
            color: "#512640",
            fontSize: "26px",
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          Boutique íntima · Pitangueiras/SP
        </div>

        <div
          style={{
            marginTop: "40px",
            fontSize: "92px",
            fontWeight: 700,
            color: "#2e2a26",
            letterSpacing: "-0.02em",
            textAlign: "center",
            lineHeight: 1.05,
          }}
        >
          The Secret Boutique
        </div>

        <div
          style={{
            marginTop: "28px",
            maxWidth: "820px",
            fontSize: "36px",
            color: "#6b5a5e",
            textAlign: "center",
            lineHeight: 1.3,
          }}
        >
          Bem-estar sexual e autocuidado com retirada 100% anônima
        </div>

        <div
          style={{
            position: "absolute",
            bottom: "56px",
            display: "flex",
            alignItems: "center",
            gap: "14px",
            fontSize: "28px",
            fontWeight: 600,
            color: "#512640",
          }}
        >
          Compra discreta · Pagamento via PIX · +18
        </div>
      </div>
    ),
    { ...size },
  );
}
