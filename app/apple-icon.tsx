import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Apple touch icon — the current "88" brand mark.
export default function AppleIcon() {
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
          fontSize: 96,
          fontWeight: 800,
          letterSpacing: 2,
          fontFamily: "monospace"
        }}
      >
        88
      </div>
    ),
    { ...size }
  );
}
