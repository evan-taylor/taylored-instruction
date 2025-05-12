'use client'

import { useEffect } from 'react'

declare global {
  interface Window {
    MNI?: {
      Widgets?: {
        Member: new (id: string, options: any) => {
          create: () => void
        }
      }
    }
  }
}

export const ChamberBadge = () => {
  const badgeId = "mni-membership-638813734234709448"

  useEffect(() => {
    const scriptId = 'chamber-member-script'
    
    const existingScript = document.getElementById(scriptId);
    if (existingScript) {
      if (window.MNI && window.MNI.Widgets && window.MNI.Widgets.Member) {
        try {
          new window.MNI.Widgets.Member(badgeId, {
            member: 27745, 
            styleTemplate:"#@id{text-align:center;position:relative}#@id .mn-widget-member-name{font-weight:700}#@id .mn-widget-member-logo{max-width:100%}"
          }).create();
        } catch (error) {
          console.error("[ChamberBadge] Error creating Chamber widget (existing script):", error);
        }
      } else {
        // Script exists but MNI not ready (might happen briefly)
      }
      return; 
    }

    const script = document.createElement('script')
    script.id = scriptId
    script.src = "https://vancouverusa.chambermaster.com/Content/Script/Member.js"
    script.type = "text/javascript"
    script.async = true

    script.onload = () => {
      if (window.MNI && window.MNI.Widgets && window.MNI.Widgets.Member) {
        try {
          new window.MNI.Widgets.Member(badgeId, {
            member: 27745, 
            styleTemplate:"#@id{text-align:center;position:relative}#@id .mn-widget-member-name{font-weight:700}#@id .mn-widget-member-logo{max-width:100%}"
          }).create();
        } catch (error) {
          console.error("[ChamberBadge] Error creating Chamber widget after load:", error);
        }
      } else {
        console.error("[ChamberBadge] Chamber widget script loaded, but MNI object not found.")
      }
    }
    
    script.onerror = () => {
      console.error("[ChamberBadge] Failed to load the Chamber widget script.") 
    }

    document.body.appendChild(script)

    return () => {
      const widgetContainer = document.getElementById(badgeId);
      if (widgetContainer) {
        widgetContainer.innerHTML = ''; 
      }
    }
  }, [badgeId]) 

  return <div id={badgeId}></div>
} 