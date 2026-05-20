export const ADMIN_EMAILS: readonly string[] = [
  "admin@tayloredinstruction.com",
  "evan@tayloredinstruction.com",
  "mike@northvalleysolutions.co",
];

export const isAdminEmail = (email: string | null | undefined): boolean =>
  !!email && ADMIN_EMAILS.includes(email);
