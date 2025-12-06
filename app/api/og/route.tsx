import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

const BRAND_COLORS = {
  primary: "#2B5A8A",
  primaryDark: "#163f69",
  accent: "#C41E3A",
  text: "#1a202c",
  white: "#ffffff",
  lightGray: "#f8fafc",
  muted: "#64748b",
};

const TITLE_LENGTH_THRESHOLD = 50;

export function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const title = searchParams.get("title") ?? "Taylored Instruction";
  const description =
    searchParams.get("description") ??
    "Professional CPR, BLS & Lifeguard Training";
  const type = searchParams.get("type") ?? "default";

  const logoUrl = new URL("/Logo-Black.png", request.url)
    .toString()
    .replace("/api/og", "");

  const getAccentColor = (pageType: string) => {
    switch (pageType) {
      case "bls":
      case "heartsaver":
      case "aha":
        return BRAND_COLORS.accent;
      case "lifeguarding":
      case "swimming":
        return BRAND_COLORS.primary;
      default:
        return BRAND_COLORS.primary;
    }
  };

  const accentColor = getAccentColor(type);

  return new ImageResponse(
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: BRAND_COLORS.white,
        position: "relative",
      }}
    >
      {/* Top accent bar */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "8px",
          background: `linear-gradient(90deg, ${BRAND_COLORS.primary} 0%, ${accentColor} 50%, ${BRAND_COLORS.primaryDark} 100%)`,
        }}
      />

      {/* Main content area */}
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "flex-start",
          padding: "60px 80px",
          height: "100%",
          gap: "60px",
        }}
      >
        {/* Logo section */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {/* biome-ignore lint/performance/noImgElement: img required for OG image generation */}
          <img
            alt="Taylored Instruction Logo"
            height={220}
            src={logoUrl}
            style={{
              objectFit: "contain",
            }}
            width={220}
          />
        </div>

        {/* Text content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            flex: 1,
            gap: "20px",
          }}
        >
          {/* Title */}
          <div
            style={{
              fontSize: title.length > TITLE_LENGTH_THRESHOLD ? "42px" : "52px",
              fontWeight: 700,
              color: BRAND_COLORS.text,
              lineHeight: 1.2,
              maxWidth: "700px",
              display: "flex",
              flexWrap: "wrap",
            }}
          >
            {title}
          </div>

          {/* Description */}
          <div
            style={{
              fontSize: "26px",
              fontWeight: 400,
              color: BRAND_COLORS.muted,
              lineHeight: 1.4,
              maxWidth: "650px",
              display: "flex",
              flexWrap: "wrap",
            }}
          >
            {description}
          </div>

          {/* Location badges */}
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              gap: "16px",
              marginTop: "10px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                backgroundColor: BRAND_COLORS.lightGray,
                padding: "10px 20px",
                borderRadius: "8px",
                border: `2px solid ${BRAND_COLORS.primary}`,
              }}
            >
              <div
                style={{
                  width: "10px",
                  height: "10px",
                  borderRadius: "50%",
                  backgroundColor: BRAND_COLORS.primary,
                }}
              />
              <span
                style={{
                  fontSize: "18px",
                  fontWeight: 600,
                  color: BRAND_COLORS.primary,
                }}
              >
                Vancouver, WA
              </span>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                backgroundColor: BRAND_COLORS.lightGray,
                padding: "10px 20px",
                borderRadius: "8px",
                border: `2px solid ${BRAND_COLORS.accent}`,
              }}
            >
              <div
                style={{
                  width: "10px",
                  height: "10px",
                  borderRadius: "50%",
                  backgroundColor: BRAND_COLORS.accent,
                }}
              />
              <span
                style={{
                  fontSize: "18px",
                  fontWeight: 600,
                  color: BRAND_COLORS.accent,
                }}
              >
                San Luis Obispo, CA
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom section with website */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "20px 80px",
          backgroundColor: BRAND_COLORS.primaryDark,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "24px",
          }}
        >
          <span
            style={{
              fontSize: "18px",
              fontWeight: 500,
              color: BRAND_COLORS.white,
              opacity: 0.9,
            }}
          >
            American Heart Association
          </span>
          <span
            style={{
              fontSize: "18px",
              color: BRAND_COLORS.white,
              opacity: 0.5,
            }}
          >
            |
          </span>
          <span
            style={{
              fontSize: "18px",
              fontWeight: 500,
              color: BRAND_COLORS.white,
              opacity: 0.9,
            }}
          >
            American Red Cross
          </span>
        </div>
        <span
          style={{
            fontSize: "20px",
            fontWeight: 600,
            color: BRAND_COLORS.white,
          }}
        >
          tayloredinstruction.com
        </span>
      </div>
    </div>,
    {
      width: 1200,
      height: 630,
    }
  );
}
