export type WorkspaceLink =
  | {
      label: string;
      href: string;
      type?: undefined;
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
  if (instructor || admin) {
    links.push(
      { label: "Teaching", type: "divider" },
      { label: "My sessions & rosters", href: "/instructor/sessions" }
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
  if (admin) {
    links.push(
      { label: "Administration", type: "divider" },
      { label: "Admin dashboard", href: "/admin" },
      { label: "Sessions & scheduling", href: "/admin/sessions" },
      { label: "Registrations & payments", href: "/admin/registrations" },
      { label: "Groups & invoices", href: "/admin/groups" },
      { label: "Instructor approvals", href: "/admin/instructors" }
    );
  }
  links.push(
    { label: "My account", type: "divider" },
    { label: "My registrations", href: "/registrations" },
    { label: "Account & sign out", href: "/my-account" }
  );
  return links;
}
