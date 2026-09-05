import {
  ADMIN_EMAILS,
  DAYS_IN_MONTH,
  DAYS_IN_WEEK,
  MILLISECONDS_PER_DAY,
} from "./constants";
import type { LastLoginDisplay } from "./types";

export function formatLastLogin(lastLogin: string | null): LastLoginDisplay {
  if (!lastLogin) {
    return { className: "text-gray-400", text: "Never" };
  }

  const loginDate = new Date(lastLogin);
  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );
  const startOfLoginDay = new Date(
    loginDate.getFullYear(),
    loginDate.getMonth(),
    loginDate.getDate()
  );
  let diffInDays = Math.round(
    (startOfToday.getTime() - startOfLoginDay.getTime()) / MILLISECONDS_PER_DAY
  );
  if (diffInDays < 0) {
    diffInDays = 0;
  }

  if (diffInDays === 0) {
    return { className: "text-green-600 font-medium", text: "Today" };
  }
  if (diffInDays === 1) {
    return { className: "text-green-500", text: "Yesterday" };
  }
  if (diffInDays < DAYS_IN_WEEK) {
    return { className: "text-yellow-600", text: `${diffInDays} days ago` };
  }
  if (diffInDays < DAYS_IN_MONTH) {
    return { className: "text-orange-600", text: `${diffInDays} days ago` };
  }
  return { className: "text-red-600", text: loginDate.toLocaleDateString() };
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
