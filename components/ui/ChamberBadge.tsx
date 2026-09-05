"use client";

import { useEffect } from "react";

interface ChamberBadgeWidget {
  create: () => void;
}

type ChamberWindow = typeof globalThis.window & {
  MNI?: {
    Widgets?: {
      Member: new (id: string, options: unknown) => ChamberBadgeWidget;
    };
  };
};

const getChamberWindow = (): ChamberWindow => window as ChamberWindow;

export const ChamberBadge = () => {
  const badgeId = "mni-membership-638813734234709448";

  useEffect(() => {
    const scriptId = "chamber-member-script";

    const createMemberWidget = (): boolean => {
      const chamberWindow = getChamberWindow();
      const MemberWidget = chamberWindow.MNI?.Widgets?.Member;
      if (!MemberWidget) {
        return false;
      }

      try {
        new MemberWidget(badgeId, {
          member: 27_745,
          styleTemplate:
            "#@id{text-align:center;position:relative}#@id .mn-widget-member-name{font-weight:700}#@id .mn-widget-member-logo{max-width:100%}",
        }).create();
        return true;
      } catch {
        return false;
      }
    };

    const existingScript = document.getElementById(scriptId);
    if (existingScript) {
      createMemberWidget();
      return;
    }

    const script = document.createElement("script");
    script.id = scriptId;
    script.src =
      "https://vancouverusa.chambermaster.com/Content/Script/Member.js";
    script.type = "text/javascript";
    script.async = true;

    script.onload = () => {
      if (!createMemberWidget()) {
        // MNI not ready after script load
      }
    };

    script.onerror = () => {
      // Script load failed - silently fail
    };

    document.body.appendChild(script);

    return () => {
      const widgetContainer = document.getElementById(badgeId);
      if (widgetContainer) {
        widgetContainer.innerHTML = "";
      }
    };
  }, []);

  return <div id={badgeId} />;
};
