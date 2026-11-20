import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import { OG_IMAGE_SIZE } from "@/lib/utils";

const NAVY = "#123A61";
const RED = "#B9221D";
const EYEBROW = "#A9C3DE";
const FOOTNOTE = "#C9D7E6";
const DEFAULT_TITLE = "Professional CPR, BLS & Lifeguard Training";
const MAX_TITLE_LENGTH = 120;
const MAX_EYEBROW_LENGTH = 48;
const RING_RADIUS = 300;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const asset = (file: string) =>
  readFile(join(process.cwd(), "assets/og", file));

const [regular, medium, semibold, lockup] = await Promise.all([
  asset("ReadexPro-400.ttf"),
  asset("ReadexPro-500.ttf"),
  asset("ReadexPro-600.ttf"),
  asset("lockup-light.png"),
]);
const lockupSrc = `data:image/png;base64,${lockup.toString("base64")}`;

const arc = (degrees: number) => (RING_CIRCUMFERENCE * degrees) / 360;

const titleSize = (title: string) => {
  if (title.length <= 30) {
    return 84;
  }
  if (title.length <= 50) {
    return 68;
  }
  if (title.length <= 75) {
    return 58;
  }
  return 46;
};

export function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const title = (searchParams.get("title")?.trim() || DEFAULT_TITLE).slice(
    0,
    MAX_TITLE_LENGTH
  );
  const eyebrow = searchParams
    .get("eyebrow")
    ?.trim()
    .slice(0, MAX_EYEBROW_LENGTH);

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        backgroundColor: NAVY,
        fontFamily: "Readex Pro",
      }}
    >
      <svg
        height={760}
        style={{ position: "absolute", right: -330, top: -65 }}
        viewBox="0 0 760 760"
        width={760}
      >
        <title>Lifebuoy</title>
        <circle
          cx={380}
          cy={380}
          fill="none"
          r={RING_RADIUS}
          stroke="#FFFFFF"
          strokeDasharray={`${arc(38)} ${arc(52)}`}
          strokeDashoffset={-arc(26)}
          strokeWidth={118}
        />
        <circle
          cx={380}
          cy={380}
          fill="none"
          r={RING_RADIUS}
          stroke={RED}
          strokeDasharray={`${arc(48)} ${arc(42)}`}
          strokeDashoffset={arc(24)}
          strokeWidth={118}
        />
      </svg>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: 780,
          height: "100%",
          padding: "72px 80px",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 26,
            fontWeight: 500,
            color: EYEBROW,
            textTransform: "uppercase",
            letterSpacing: "0.12em",
          }}
        >
          {eyebrow}
        </div>
        <div
          style={{
            display: "block",
            fontSize: titleSize(title),
            fontWeight: 600,
            color: "#FFFFFF",
            lineHeight: 1.05,
            letterSpacing: "-0.025em",
            lineClamp: 4,
          }}
        >
          {title}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          {/* biome-ignore lint/performance/noImgElement: ImageResponse renders plain img elements */}
          <img
            alt="Taylored Instruction"
            height={48}
            src={lockupSrc}
            width={219}
          />
          <div
            style={{
              width: 1,
              height: 32,
              backgroundColor: "rgba(255, 255, 255, 0.24)",
            }}
          />
          <div
            style={{
              display: "flex",
              flexShrink: 0,
              fontSize: 21,
              color: FOOTNOTE,
            }}
          >
            Vancouver WA · San Luis Obispo CA
          </div>
        </div>
      </div>
    </div>,
    {
      ...OG_IMAGE_SIZE,
      fonts: [
        { name: "Readex Pro", data: regular, weight: 400 },
        { name: "Readex Pro", data: medium, weight: 500 },
        { name: "Readex Pro", data: semibold, weight: 600 },
      ],
      headers: {
        "Cache-Control":
          "public, max-age=86400, s-maxage=31536000, stale-while-revalidate=604800",
      },
    }
  );
}
