const PRIVATE_ROUTE =
  /^\/(api\/registration|courses(?:\/|$)|classes(?:\/|$)|s(?:\/|$)|register|registration|instructor\/sessions|admin\/(?:courses|sessions|materials|coupons|registration))/u;
export function isPrivateRegistrationPath(path: string) {
  return PRIVATE_ROUTE.test(path);
}

export function isPrivateRegistrationUrl(value: string | undefined) {
  if (!value) {
    return false;
  }
  try {
    return isPrivateRegistrationPath(
      new URL(value, "https://localhost").pathname
    );
  } catch {
    return true;
  }
}
