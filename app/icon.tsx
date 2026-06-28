import { ImageResponse } from "next/og";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

// Favicon — the current "88" brand mark (ink tile, mono digits).
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0b0e14",
          color: "#ffffff",
          fontSize: 34,
          fontWeight: 800,
          letterSpacing: 1,
          fontFamily: "monospace",
          borderRadius: 14
        }}
      >
        88
      </div>
    ),
    { ...size }
  );
}
