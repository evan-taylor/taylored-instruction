import { render } from "@react-email/render";
import type { ReactElement } from "react";
import { BUSINESS } from "@/lib/business";
import { attributeEmail } from "@/shared/email-attribution";

/** Renders a customer email with UTM-tagged links in both its parts. */
export async function attributedEmail(element: ReactElement, campaign: string) {
  const [html, text] = await Promise.all([
    render(element),
    render(element, { plainText: true }),
  ]);
  return attributeEmail({ html, text }, { campaign }, BUSINESS.url);
}
