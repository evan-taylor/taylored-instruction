'use client'

import { createClient } from "@/utils/supabase/client";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa, type Theme } from "@supabase/auth-ui-shared";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const [supabaseClient] = useState(() => createClient());
  const router = useRouter();

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
      className="flex items-center justify-center px-4 py-12 min-h-[60vh]"
      style={{ backgroundColor: "hsl(var(--background))" }}
    >
      <div
        className="max-w-md w-full p-8 rounded-lg shadow-lg"
        style={{
          backgroundColor: "hsl(var(--card))",
          borderRadius: "var(--radius)",
        }}
      >
        <div className="flex flex-col items-center justify-center mb-6">
          <h2
            className="text-2xl font-bold text-center"
            style={{ color: "hsl(var(--foreground))" }}
          >
            Instructor Login
          </h2>
        </div>

        <div className="w-full">
          <Auth
            supabaseClient={supabaseClient}
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
            providers={["google"]}
            view="magic_link"
            showLinks={false}
            magicLink={true}
            redirectTo={
              typeof window !== "undefined"
                ? `${window.location.origin}/api/auth/callback`
                : "/api/auth/callback"
            }
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
          />
        </div>

        <div className="mt-6 text-center text-sm text-gray-500">
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