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
  admin: boolean
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
      { label: "Instructors", href: "/admin/instructors", secondary: true }
    );
  }
  if (instructor || admin) {
    links.push(
      { label: "Teaching", type: "divider" },
      { label: "My teaching sessions", href: "/instructor/sessions" }
    );
  }
  if (instructor) {
    links.push(
      { label: "Purchase eCards", href: "/ecards" },
      {
        label: "Instructor resources",
        href: "https://docs.tayloredinstruction.com/",
      }
    );
  }
  links.push(
    { label: "My account", type: "divider" },
    { label: "My registrations", href: "/registrations" },
    { label: "Account settings", href: "/my-account" }
  );
  return links;
}
