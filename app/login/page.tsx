"use client";

import { Auth } from "@supabase/auth-ui-react";
import { type Theme, ThemeSupa } from "@supabase/auth-ui-shared";
import { useRouter } from "next/navigation";
import { usePostHog } from "posthog-js/react";
import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";

export default function LoginPage() {
  const [supabaseClient] = useState(() => createClient());
  const _router = useRouter();
  const posthog = usePostHog();

  // Track auth state changes
  useEffect(() => {
    const {
      data: { subscription },
    } = supabaseClient.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        posthog.identify(session.user.id, {
          email: session.user.email,
          createdAt: session.user.created_at,
        });

        posthog.capture("user_signed_in", {
          method: "email", // Default assumption, could be enhanced
          userId: session.user.id,
          email: session.user.email,
        });
      } else if (event === "SIGNED_OUT") {
        posthog.capture("user_signed_out");
      } else if (event === "SIGNED_UP" && session?.user) {
        posthog.identify(session.user.id, {
          email: session.user.email,
          createdAt: session.user.created_at,
        });

        posthog.capture("user_signed_up", {
          method: "email", // Default assumption, could be enhanced
          userId: session.user.id,
          email: session.user.email,
        });
      }
    });

    return () => subscription.unsubscribe();
  }, [supabaseClient, posthog]);

  const customTheme: Theme = {
    ...ThemeSupa,
    variables: {
      ...ThemeSupa.variables,
      colors: {
        ...ThemeSupa.variables?.colors,
        brand: "hsl(var(--primary))",
        brandAccent: "hsl(var(--primary-dark, #163f69))",
        brandButtonText: "hsl(var(--primary-foreground))",

        inputBackground: "transparent",
        inputBorder: "hsl(var(--input))",
        inputBorderHover: "hsl(var(--primary))",
        inputBorderFocus: "hsl(var(--primary))",
        inputText: "hsl(var(--foreground))",
        inputLabelText: "hsl(var(--muted-foreground))",
        inputPlaceholder: "hsl(var(--muted-foreground))",

        anchorTextColor: "hsl(var(--primary))",
        anchorTextHoverColor: "hsl(var(--primary-dark, #163f69))",
      },
      radii: {
        ...ThemeSupa.variables?.radii,
        borderRadiusButton: "var(--radius)",
        buttonBorderRadius: "var(--radius)",
        inputBorderRadius: "var(--radius)",
      },
      fonts: {
        ...ThemeSupa.variables?.fonts,
        bodyFontFamily: `"Readex Pro", sans-serif`,
        buttonFontFamily: `"Readex Pro", sans-serif`,
        inputFontFamily: `"Readex Pro", sans-serif`,
        labelFontFamily: `"Readex Pro", sans-serif`,
      },
    },
  };

  return (
    <div
      className="flex min-h-[60vh] items-center justify-center px-4 py-12"
      style={{ backgroundColor: "hsl(var(--background))" }}
    >
      <div
        className="w-full max-w-md rounded-lg p-8 shadow-lg"
        style={{
          backgroundColor: "hsl(var(--card))",
          borderRadius: "var(--radius)",
        }}
      >
        <div className="mb-6 flex flex-col items-center justify-center">
          <h2
            className="text-center font-bold text-2xl"
            style={{ color: "hsl(var(--foreground))" }}
          >
            Instructor Login
          </h2>
        </div>

        <div className="w-full">
          <Auth
            appearance={{
              theme: customTheme,
              style: {
                input: {
                  borderColor: "hsl(var(--input))",
                  borderWidth: "1px",
                  boxShadow: "none",
                },
                button: {
                  border: "none",
                  backgroundColor: "hsl(var(--primary))",
                  color: "hsl(var(--primary-foreground))",
                },
              },
            }}
            localization={{
              variables: {
                magic_link: {
                  email_input_label: "Email",
                  email_input_placeholder: "Your email address",
                  button_label: "Send Magic Link",
                  loading_button_label: "Sending Magic Link...",
                  confirmation_text:
                    "Check your email for a magic link to sign in!",
                },
              },
            }}
            magicLink={true}
            providers={["google"]}
            redirectTo={
              typeof window !== "undefined"
                ? `${window.location.origin}/api/auth/callback`
                : "/api/auth/callback"
            }
            showLinks={false}
            supabaseClient={supabaseClient}
            view="magic_link"
          />
        </div>

        <div className="mt-6 text-center text-gray-500 text-sm">
          <p>This login is for instructors only.</p>
          <p className="mt-1">
            New instructors will need approval before accessing instructor
            features.
          </p>
        </div>
      </div>
    </div>
  );
}
