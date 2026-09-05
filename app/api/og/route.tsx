import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

const BRAND_COLORS = {
  accent: "#C41E3A",
  lightGray: "#f8fafc",
  muted: "#64748b",
  primary: "#2B5A8A",
  primaryDark: "#163f69",
  text: "#1a202c",
  white: "#ffffff",
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
        backgroundColor: BRAND_COLORS.white,
        display: "flex",
        flexDirection: "column",
        height: "100%",
        position: "relative",
        width: "100%",
      }}
    >
      {/* Top accent bar */}
      <div
        style={{
          background: `linear-gradient(90deg, ${BRAND_COLORS.primary} 0%, ${accentColor} 50%, ${BRAND_COLORS.primaryDark} 100%)`,
          height: "8px",
          left: 0,
          position: "absolute",
          right: 0,
          top: 0,
        }}
      />

      {/* Main content area */}
      <div
        style={{
          alignItems: "center",
          display: "flex",
          flexDirection: "row",
          gap: "60px",
          height: "100%",
          justifyContent: "flex-start",
          padding: "60px 80px",
        }}
      >
        {/* Logo section */}
        <div
          style={{
            alignItems: "center",
            display: "flex",
            flexDirection: "column",
            flexShrink: 0,
            justifyContent: "center",
          }}
        >
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
            flex: 1,
            flexDirection: "column",
            gap: "20px",
            justifyContent: "center",
          }}
        >
          {/* Title */}
          <div
            style={{
              color: BRAND_COLORS.text,
              display: "flex",
              flexWrap: "wrap",
              fontSize: title.length > TITLE_LENGTH_THRESHOLD ? "42px" : "52px",
              fontWeight: 700,
              lineHeight: 1.2,
              maxWidth: "700px",
            }}
          >
            {title}
          </div>

          {/* Description */}
          <div
            style={{
              color: BRAND_COLORS.muted,
              display: "flex",
              flexWrap: "wrap",
              fontSize: "26px",
              fontWeight: 400,
              lineHeight: 1.4,
              maxWidth: "650px",
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
                alignItems: "center",
                backgroundColor: BRAND_COLORS.lightGray,
                border: `2px solid ${BRAND_COLORS.primary}`,
                borderRadius: "8px",
                display: "flex",
                gap: "8px",
                padding: "10px 20px",
              }}
            >
              <div
                style={{
                  backgroundColor: BRAND_COLORS.primary,
                  borderRadius: "50%",
                  height: "10px",
                  width: "10px",
                }}
              />
              <span
                style={{
                  color: BRAND_COLORS.primary,
                  fontSize: "18px",
                  fontWeight: 600,
                }}
              >
                Vancouver, WA
              </span>
            </div>
            <div
              style={{
                alignItems: "center",
                backgroundColor: BRAND_COLORS.lightGray,
                border: `2px solid ${BRAND_COLORS.accent}`,
                borderRadius: "8px",
                display: "flex",
                gap: "8px",
                padding: "10px 20px",
              }}
            >
              <div
                style={{
                  backgroundColor: BRAND_COLORS.accent,
                  borderRadius: "50%",
                  height: "10px",
                  width: "10px",
                }}
              />
              <span
                style={{
                  color: BRAND_COLORS.accent,
                  fontSize: "18px",
                  fontWeight: 600,
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
          alignItems: "center",
          backgroundColor: BRAND_COLORS.primaryDark,
          bottom: 0,
          display: "flex",
          justifyContent: "space-between",
          left: 0,
          padding: "20px 80px",
          position: "absolute",
          right: 0,
        }}
      >
        <div
          style={{
            alignItems: "center",
            display: "flex",
            gap: "24px",
          }}
        >
          <span
            style={{
              color: BRAND_COLORS.white,
              fontSize: "18px",
              fontWeight: 500,
              opacity: 0.9,
            }}
          >
            American Heart Association
          </span>
          <span
            style={{
              color: BRAND_COLORS.white,
              fontSize: "18px",
              opacity: 0.5,
            }}
          >
            |
          </span>
          <span
            style={{
              color: BRAND_COLORS.white,
              fontSize: "18px",
              fontWeight: 500,
              opacity: 0.9,
            }}
          >
            American Red Cross
          </span>
        </div>
        <span
          style={{
            color: BRAND_COLORS.white,
            fontSize: "20px",
            fontWeight: 600,
          }}
        >
          tayloredinstruction.com
        </span>
      </div>
    </div>,
    {
      height: 630,
      width: 1200,
    }
  );
}
