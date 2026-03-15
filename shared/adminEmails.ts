export const ADMIN_EMAILS: readonly string[] = [
  "admin@tayloredinstruction.com",
  "evan@tayloredinstruction.com",
];

export const isAdminEmail = (email: string | null | undefined): boolean =>
  !!email && ADMIN_EMAILS.includes(email);
