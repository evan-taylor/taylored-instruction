import {
  ADMIN_EMAILS as SHARED_ADMIN_EMAILS,
  isAdminEmail as sharedIsAdminEmail,
} from "@/shared/adminEmails";

export const ADMIN_EMAILS = SHARED_ADMIN_EMAILS;

export const isAdminEmail = (email: string | null | undefined): boolean =>
  sharedIsAdminEmail(email);
