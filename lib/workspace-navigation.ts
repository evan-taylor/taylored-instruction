export type WorkspaceLink =
  | {
      label: string;
      href: string;
      type?: undefined;
      /** Left out of the compact header menu; still listed on the account page. */
      secondary?: boolean;
    }
  | {
      label: string;
      type: "divider";
      href?: undefined;
    };

export function workspaceLinks(
  signedIn: boolean,
  instructor: boolean,
  admin: boolean,
  aligned = false
): WorkspaceLink[] {
  if (!signedIn) {
    return [
      { label: "Become an instructor", href: "/alignment" },
      { label: "My registrations", href: "/registrations" },
      { label: "Sign in", href: "/login" },
    ];
  }
  const links: WorkspaceLink[] = [];
  if (admin) {
    links.push(
      { label: "Administration", type: "divider" },
      { label: "Admin dashboard", href: "/admin" },
      { label: "Sessions", href: "/admin/sessions" },
      { label: "Registrations", href: "/admin/registrations", secondary: true },
      { label: "Groups & invoices", href: "/admin/groups", secondary: true },
      { label: "Instructors", href: "/admin/instructors", secondary: true },
      {
        label: "Aligned instructors",
        href: "/admin/aligned",
        secondary: true,
      }
    );
  }
  if (instructor || admin || aligned) {
    links.push({ label: "Teaching", type: "divider" });
  }
  if (instructor || admin) {
    links.push({ label: "My teaching sessions", href: "/instructor/sessions" });
  }
  if (aligned) {
    links.push({
      label: "Independent sessions",
      href: "/instructor/independent",
    });
  }
  if (instructor || aligned) {
    links.push({ label: "Purchase eCards", href: "/ecards" });
  }
  if (instructor) {
    links.push({
      label: "Instructor resources",
      href: "https://docs.tayloredinstruction.com/",
    });
  }
  links.push(
    { label: "My account", type: "divider" },
    { label: "My registrations", href: "/registrations" },
    { label: "Account settings", href: "/my-account" }
  );
  return links;
}
