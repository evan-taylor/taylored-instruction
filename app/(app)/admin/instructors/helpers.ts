import {
  ADMIN_EMAILS,
  DAYS_IN_MONTH,
  DAYS_IN_WEEK,
  MILLISECONDS_PER_DAY,
} from "./constants";
import type { LastLoginDisplay } from "./types";

export function formatLastLogin(lastLogin: string | null): LastLoginDisplay {
  if (!lastLogin) {
    return { text: "Never", className: "text-gray-400" };
  }

  const loginDate = new Date(lastLogin);
  const now = new Date();
  const diffInDays = Math.floor(
    (now.getTime() - loginDate.getTime()) / MILLISECONDS_PER_DAY
  );

  if (diffInDays === 0) {
    return { text: "Today", className: "text-green-600 font-medium" };
  }
  if (diffInDays === 1) {
    return { text: "Yesterday", className: "text-green-500" };
  }
  if (diffInDays < DAYS_IN_WEEK) {
    return { text: `${diffInDays} days ago`, className: "text-yellow-600" };
  }
  if (diffInDays < DAYS_IN_MONTH) {
    return { text: `${diffInDays} days ago`, className: "text-orange-600" };
  }
  return { text: loginDate.toLocaleDateString(), className: "text-red-600" };
}

export function isAdminEmail(
  email: string | null,
  forceAdmin: boolean
): boolean {
  if (forceAdmin) {
    return true;
  }
  if (!email) {
    return false;
  }
  return ADMIN_EMAILS.includes(email);
}
