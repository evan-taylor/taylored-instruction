"use client";

import { ChevronDown, Menu, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useProfile } from "../../hooks/useProfile";

const EXTERNAL_LINK_REGEX = /^https?:\/\//;

// --- Type Definitions ---
interface NavLinkItem {
  href: string;
  indent?: boolean;
  label: string;
  type?: undefined;
}

interface NavDivider {
  href?: string; // Optional href for clickable dividers
  indent?: undefined;
  label: string;
  type: "divider";
}

type DropdownItem = NavLinkItem | NavDivider;

interface NavTopLevelLink {
  dropdown?: DropdownItem[];
  href?: string;
  label: string;
}

// Helper function for active link class
const getLinkClass = (href: string, pathname: string, isMobile = false) => {
  const baseClass = isMobile
    ? "block py-1"
    : "flex items-center text-text hover:text-primary transition-colors duration-200";
  const activeClass = isMobile
    ? "text-primary font-semibold"
    : "text-primary font-semibold";
  const isActive =
    pathname === href || (href !== "/" && pathname.startsWith(href));
  return `${baseClass} ${isActive ? activeClass : ""}`;
};

// Helper function for dropdown link active class
const getDropdownLinkClass = (href: string, pathname: string) => {
  const baseClass =
    "block px-4 py-2 hover:bg-gray-100 text-sm text-text-light transition-colors duration-200";
  const activeClass = "bg-gray-100 text-primary font-medium";
  const isActive =
    pathname === href || (href !== "/" && pathname.startsWith(href));
  return `${baseClass} ${isActive ? activeClass : ""}`;
};

const generateNavLinks = (
  isAuthenticated: boolean,
  isInstructor: boolean
): NavTopLevelLink[] => [
  {
    dropdown: [
      { href: "/about", label: "About Taylored Instruction" },
      { href: "/resources", label: "Training Resources" },
      { href: "/blog", label: "Blog" },
      { href: "/contact", label: "Contact Us" },
    ],
    label: "About Us",
  },
  {
    dropdown: [
      {
        href: "https://www.hovn.app/tayloredinstruction",
        label: "Register for Classes",
      },
      {
        href: "https://www.hovn.app/tayloredinstruction/agencies/aha",
        label: "American Heart Association Courses",
        type: "divider",
      },
      { href: "/bls", indent: true, label: "BLS" },
      { href: "/heartsaver", indent: true, label: "Heartsaver" },
      {
        href: "/aha-instructor-training",
        indent: true,
        label: "Instructor Training",
      },
      {
        href: "https://www.hovn.app/tayloredinstruction/agencies/arc",
        label: "American Red Cross Courses",
        type: "divider",
      },
      {
        href: "/first-aid-cpr-aed",
        indent: true,
        label: "Adult and Pediatric First Aid/CPR/AED",
      },
      { href: "/lifeguarding", indent: true, label: "Lifeguarding" },
      {
        href: "/lifeguarding-instructor",
        indent: true,
        label: "Lifeguarding Instructor",
      },
      {
        href: "/fa-cpr-aed-instructor",
        indent: true,
        label: "First Aid/CPR/AED Instructor",
      },
    ],
    label: "Classes",
  },
  {
    dropdown: [
      {
        href: "https://shop.tayloredinstruction.com/",
        label: "Shop All Products",
      },
      {
        href: "https://shop.tayloredinstruction.com/search/aeds",
        label: "AEDs",
      },
      {
        href: "https://shop.tayloredinstruction.com/search/instructor-supplies",
        label: "Instructor Supplies",
      },
    ],
    label: "Products",
  },
  {
    dropdown: [
      ...(isInstructor
        ? ([] as NavLinkItem[])
        : ([{ href: "/alignment", label: "Alignment" }] as NavLinkItem[])),
      ...(isInstructor
        ? [
            {
              href: "https://docs.tayloredinstruction.com/",
              label: "Instructor Resources",
            } as NavLinkItem,
          ]
        : []),
      ...(isInstructor
        ? [
            {
              href: "/ecards",
              label: "eCards",
            } as NavLinkItem,
          ]
        : []),
      { label: "Account", type: "divider" },
      ...(isAuthenticated
        ? [{ href: "/my-account", label: "My Account" }]
        : [{ href: "/login", label: "Login" }]),
    ],
    label: "Instructors",
  },
];

export const MarketingHeader = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeDesktopDropdown, setActiveDesktopDropdown] = useState<
    string | null
  >(null);
  const headerRef = useRef<HTMLElement>(null);
  const pathname = usePathname() ?? "";
  const { session, isInstructor } = useProfile();

  const isAuthenticated = !!session;
  const navLinks = generateNavLinks(isAuthenticated, isInstructor);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        headerRef.current &&
        !headerRef.current.contains(event.target as Node)
      ) {
        setActiveDesktopDropdown(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const toggleDesktopDropdown = (dropdown: string) => {
    setActiveDesktopDropdown(
      activeDesktopDropdown === dropdown ? null : dropdown
    );
  };

  const closeMobileMenu = () => setIsMenuOpen(false);

  return (
    <header
      className="sticky top-0 z-50 bg-background shadow-md"
      ref={headerRef}
    >
      <div className="container py-3">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link
            className="flex-shrink-0"
            href="/"
            onClick={() => {
              setActiveDesktopDropdown(null);
              closeMobileMenu();
            }}
          >
            <Image
              alt="Taylored Instruction Logo"
              className="h-auto max-h-[64px] w-auto"
              height={64}
              priority
              src="/horizontal-logo-black.png"
              width={220}
            />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden items-center space-x-6 lg:flex">
            <NavMenu
              activeDropdown={activeDesktopDropdown}
              navLinks={navLinks}
              pathname={pathname}
              toggleDropdown={toggleDesktopDropdown}
            />

            {/* Register Button */}
            <div className="ml-4 flex items-center space-x-4">
              <Link
                className="btn btn-primary px-4 py-2 text-sm"
                href="https://www.hovn.app/tayloredinstruction"
                target="_blank"
              >
                Register Now
              </Link>
            </div>
          </nav>

          {/* Mobile Menu Button */}
          <button
            aria-label={isMenuOpen ? "Close menu" : "Open menu"}
            className="text-text-light hover:text-primary lg:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            type="button"
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <div
        className={`overflow-hidden bg-background-light transition-all duration-300 ease-in-out lg:hidden ${isMenuOpen ? "max-h-screen opacity-100" : "max-h-0 opacity-0"}`}
      >
        <div className="container py-4">
          <MobileNavMenu
            closeMenu={closeMobileMenu}
            navLinks={navLinks}
            pathname={pathname}
          />
          <div className="mt-6 flex flex-col items-center space-y-4">
            <Link
              className="btn btn-primary w-full text-center"
              href="https://www.hovn.app/tayloredinstruction"
              onClick={closeMobileMenu}
              target="_blank"
            >
              Register Now
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
};

// Desktop Navigation Menu
const NavMenu = ({
  navLinks,
  activeDropdown,
  toggleDropdown,
  pathname,
}: {
  navLinks: NavTopLevelLink[];
  activeDropdown: string | null;
  toggleDropdown: (dropdown: string) => void;
  pathname: string;
}) => {
  const renderDropdownItem = (
    item: DropdownItem,
    onItemClick: () => void
  ): React.ReactNode => {
    if (item.type === "divider") {
      if (item.href) {
        const isExternal = EXTERNAL_LINK_REGEX.test(item.href);
        return (
          <Link
            className="block px-4 pt-2 pb-1 font-semibold text-[11px] text-gray-500 uppercase tracking-wide transition-colors duration-200 hover:text-primary"
            href={item.href}
            key={`divider-${item.label}`}
            onClick={onItemClick}
            {...(isExternal
              ? { rel: "noopener noreferrer", target: "_blank" }
              : {})}
          >
            {item.label}
          </Link>
        );
      }
      return (
        <div
          className="px-4 pt-2 pb-1 font-semibold text-[11px] text-gray-500 uppercase tracking-wide"
          key={`divider-${item.label}`}
        >
          {item.label}
        </div>
      );
    }
    if (!item.href) {
      return null;
    }
    const isExternal = EXTERNAL_LINK_REGEX.test(item.href);
    return (
      <Link
        className={`${getDropdownLinkClass(item.href, pathname)} ${item.indent ? "pl-8" : ""}`}
        href={item.href}
        key={item.label}
        onClick={onItemClick}
        {...(isExternal
          ? { rel: "noopener noreferrer", target: "_blank" }
          : {})}
      >
        {item.label}
      </Link>
    );
  };

  const renderNavLink = (link: NavTopLevelLink) => {
    if (link.dropdown) {
      return (
        <button
          className={`flex items-center text-text transition-colors duration-200 hover:text-primary ${
            activeDropdown === link.label ||
            link.dropdown?.some(
              (item) => item.href && pathname.startsWith(item.href)
            )
              ? "text-primary"
              : ""
          }`}
          onClick={() => toggleDropdown(link.label)}
          type="button"
        >
          {link.label}
          <ChevronDown
            className={`ml-1 transition-transform duration-200 ${activeDropdown === link.label ? "rotate-180" : ""}`}
            size={12}
          />
        </button>
      );
    }
    if (link.href) {
      return (
        <Link className={getLinkClass(link.href, pathname)} href={link.href}>
          {link.label}
        </Link>
      );
    }
    return <span>{link.label}</span>;
  };

  return (
    <>
      {navLinks.map((link) => (
        <div className="relative" key={link.label}>
          {renderNavLink(link)}

          {activeDropdown === link.label && link.dropdown && (
            <div className="absolute left-0 z-20 mt-2 w-56 origin-top-left rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
              {link.dropdown.map((item) =>
                renderDropdownItem(item, () => toggleDropdown(link.label))
              )}
            </div>
          )}
        </div>
      ))}
    </>
  );
};

// Mobile Navigation Menu
const MobileNavMenu = ({
  navLinks,
  closeMenu,
  pathname,
}: {
  navLinks: NavTopLevelLink[];
  closeMenu: () => void;
  pathname: string;
}) => {
  const [openMobileDropdown, setOpenMobileDropdown] = useState<string | null>(
    null
  );

  const toggleMobileDropdown = (dropdown: string) => {
    setOpenMobileDropdown(openMobileDropdown === dropdown ? null : dropdown);
  };

  const renderDropdownItem = (item: DropdownItem) => {
    if (item.type === "divider") {
      if (item.href) {
        const isExternal = EXTERNAL_LINK_REGEX.test(item.href);
        return (
          <Link
            className="block pt-2 pb-1 font-semibold text-[11px] text-gray-500 uppercase tracking-wide transition-colors duration-200 hover:text-primary"
            href={item.href}
            key={`divider-${item.label}`}
            onClick={closeMenu}
            {...(isExternal
              ? { rel: "noopener noreferrer", target: "_blank" }
              : {})}
          >
            {item.label}
          </Link>
        );
      }
      return (
        <div
          className="pt-2 pb-1 font-semibold text-[11px] text-gray-500 uppercase tracking-wide"
          key={`divider-${item.label}`}
        >
          {item.label}
        </div>
      );
    }
    if (!item.href) {
      return null;
    }
    const isExternal = EXTERNAL_LINK_REGEX.test(item.href);
    return (
      <Link
        className={getDropdownLinkClass(item.href, pathname)}
        href={item.href}
        key={item.label}
        onClick={closeMenu}
        {...(isExternal
          ? { rel: "noopener noreferrer", target: "_blank" }
          : {})}
      >
        {item.label}
      </Link>
    );
  };

  const renderMobileLink = (link: NavTopLevelLink) => {
    if (link.dropdown) {
      return (
        <>
          <button
            className="flex w-full items-center justify-between py-2 text-left text-text transition-colors duration-200 hover:text-primary"
            onClick={() => toggleMobileDropdown(link.label)}
            type="button"
          >
            <span>{link.label}</span>
            <ChevronDown
              className={`ml-1 h-3 w-3 transition-transform duration-200 ${openMobileDropdown === link.label ? "rotate-180" : ""}`}
            />
          </button>
          {openMobileDropdown === link.label && (
            <div className="ml-2 space-y-1 border-gray-200 border-l pt-1 pb-2 pl-4">
              {link.dropdown.map(renderDropdownItem)}
            </div>
          )}
        </>
      );
    }
    if (link.href) {
      return (
        <Link
          className={`${getLinkClass(link.href, pathname, true)} block border-gray-200 border-b py-2`}
          href={link.href}
          onClick={closeMenu}
        >
          {link.label}
        </Link>
      );
    }
    return (
      <span className="block border-gray-200 border-b py-2 text-text">
        {link.label}
      </span>
    );
  };

  return (
    <div className="space-y-1 py-2">
      {navLinks.map((link) => (
        <div key={link.label}>{renderMobileLink(link)}</div>
      ))}
    </div>
  );
};
