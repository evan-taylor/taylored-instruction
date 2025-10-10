"use client";

import { useEffect } from "react";

declare global {
  type Window = {
    MNI?: {
      Widgets?: {
        Member: new (
          id: string,
          options: unknown
        ) => {
          create: () => void;
        };
      };
    };
  };
}

export const ChamberBadge = () => {
  const badgeId = "mni-membership-638813734234709448";

  useEffect(() => {
    const scriptId = "chamber-member-script";

    const existingScript = document.getElementById(scriptId);
    if (existingScript) {
      if (window.MNI?.Widgets?.Member) {
        try {
          new window.MNI.Widgets.Member(badgeId, {
            member: 27_745,
            styleTemplate:
              "#@id{text-align:center;position:relative}#@id .mn-widget-member-name{font-weight:700}#@id .mn-widget-member-logo{max-width:100%}",
          }).create();
        } catch (_error) {
          // Widget creation failed - silently continue
        }
      } else {
        // Script exists but MNI not ready (might happen briefly)
      }
      return;
    }

    const script = document.createElement("script");
    script.id = scriptId;
    script.src =
      "https://vancouverusa.chambermaster.com/Content/Script/Member.js";
    script.type = "text/javascript";
    script.async = true;

    script.onload = () => {
      if (window.MNI?.Widgets?.Member) {
        try {
          new window.MNI.Widgets.Member(badgeId, {
            member: 27_745,
            styleTemplate:
              "#@id{text-align:center;position:relative}#@id .mn-widget-member-name{font-weight:700}#@id .mn-widget-member-logo{max-width:100%}",
          }).create();
        } catch (_error) {
          // Widget creation failed - silently continue
        }
      } else {
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
