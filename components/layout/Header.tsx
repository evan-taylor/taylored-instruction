'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { FaBars, FaTimes, FaChevronDown, FaShoppingCart, FaSearch } from 'react-icons/fa'
import { useSupabaseClient, useSession } from '@supabase/auth-helpers-react'
import { useProfile } from '../../hooks/useProfile'

// --- Type Definitions ---
interface NavLinkItem {
  label: string;
  href: string;
  indent?: boolean;
  type?: undefined; // Ensure type compatibility with Divider
  requiresInstructor?: boolean; // Added for conditional display
}

interface NavDivider {
  label: string;
  type: 'divider';
  href?: undefined; // Ensure type compatibility with LinkItem
  indent?: undefined;
  requiresInstructor?: undefined; // Added
}

type DropdownItem = NavLinkItem | NavDivider;

interface NavTopLevelLink {
  label: string;
  dropdown?: DropdownItem[]; // Optional dropdown
  href?: string; // Optional direct href if no dropdown
  hideWhenLoggedIn?: boolean; // Added
  hideWhenLoggedOut?: boolean; // Added
  requiresInstructor?: boolean; // Added for top-level links if needed
}

// Helper function for active link class
const getLinkClass = (href: string, pathname: string, isMobile: boolean = false) => {
  const baseClass = isMobile 
    ? "block py-1" 
    : "flex items-center text-text hover:text-primary transition-colors duration-200"
  const activeClass = isMobile ? "text-primary font-semibold" : "text-primary font-semibold"
  // More robust active check for nested paths might be needed
  const isActive = pathname === href || (href !== '/' && pathname.startsWith(href));
  return `${baseClass} ${isActive ? activeClass : ''}`
}

// Helper function for dropdown link active class
const getDropdownLinkClass = (href: string, pathname: string) => {
  const baseClass = "block px-4 py-2 hover:bg-gray-100 text-sm text-text-light transition-colors duration-200"
  const activeClass = "bg-gray-100 text-primary font-medium"
  const isActive = pathname === href || (href !== '/' && pathname.startsWith(href));
  return `${baseClass} ${isActive ? activeClass : ''}`
}

// --- Navigation Links Data --- (Will be dynamically generated)

// Function to generate nav links based on auth state
const generateNavLinks = (isLoggedIn: boolean, isInstructor: boolean): NavTopLevelLink[] => [
  {
    label: "About Us",
    dropdown: [
      { label: "About Taylored Instruction", href: "/about" },
      { label: "Contact Us", href: "/contact" },
      { label: "Help Center", href: "https://help.tayloredinstruction.com/" },
    ]
  },
  {
    label: "Classes",
    dropdown: [
      { label: "Register for Classes", href: "https://www.hovn.app/tayloredinstruction" },
      { type: 'divider', label: 'American Heart Association' },
      { label: "BLS", href: "/bls", indent: true },
      { label: "Heartsaver", href: "/heartsaver", indent: true },
      { label: "Instructor Training", href: "/aha-instructor-training", indent: true },
      { type: 'divider', label: 'American Red Cross' },
      { label: "Adult and Pediatric First Aid/CPR/AED", href: "/first-aid-cpr-aed", indent: true },
      { label: "Lifeguarding", href: "/lifeguarding", indent: true },
      { label: "First Aid/CPR/AED Instructor", href: "/fa-cpr-aed-instructor", indent: true },
    ]
  },
  {
    label: "Instructors",
    dropdown: [
      { label: "Alignment", href: "/alignment" },
      { label: "Instructor Resources", href: "/instructor-resources", requiresInstructor: true },
      // Conditionally add eCards if instructor
      ...(isInstructor ? [{ label: "eCards", href: "/ecards", requiresInstructor: true } as NavLinkItem] : []),
    ]
  },
  {
    label: "Login", // Changed from "My Account"
    href: "/login",    // Direct link to login page
    hideWhenLoggedIn: true // Hide when logged in
  },
  // Add Account link for logged-in users
  {
    label: "My Account",
    href: "/my-account", // Or your preferred account page
    hideWhenLoggedOut: true // Hide when logged out
  }
];


export const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [activeDesktopDropdown, setActiveDesktopDropdown] = useState<string | null>(null)
  const headerRef = useRef<HTMLElement>(null)
  const pathname = usePathname() ?? ''; // Provide default empty string if null

  // --- Authentication State ---
  const { session, isInstructor, loading: profileLoading } = useProfile();
  const supabase = useSupabaseClient();
  const router = useRouter(); // Next.js router for redirection (if needed, usePathname is for reading)

  const isLoggedIn = !!session; // Simple boolean check

  const handleLogout = async () => {
      setActiveDesktopDropdown(null); // Close any open dropdowns
      closeMobileMenu();
      try {
        const { error } = await supabase.auth.signOut();
        if (error) {
           console.error("Error signing out:", error);
           // Optionally show an error message to the user
        } else {
           router.push('/'); // Redirect only on successful logout
        }
      } catch (err) {
         console.error("Exception during sign out:", err);
         // Handle unexpected errors
      }
  };

  // Generate nav links based on current auth state
  const currentNavLinks = generateNavLinks(isLoggedIn, isInstructor);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(event.target as Node)) {
        setActiveDesktopDropdown(null)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  const toggleDesktopDropdown = (dropdown: string) => {
    setActiveDesktopDropdown(activeDesktopDropdown === dropdown ? null : dropdown)
  }

  const closeMobileMenu = () => setIsMenuOpen(false);

  // Filter links for rendering based on auth status
  const filterLinks = (links: NavTopLevelLink[]) => {
    return links.filter(link => {
        if (isLoggedIn && link.hideWhenLoggedIn) return false;
        if (!isLoggedIn && link.hideWhenLoggedOut) return false;
        // Add instructor check for top level
        if (link.requiresInstructor && !isInstructor) return false;
        return true;
    });
  };

  const visibleNavLinks = filterLinks(currentNavLinks);


  return (
    <header ref={headerRef} className="sticky top-0 z-50 bg-background shadow-md">
      <div className="container py-3">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <Link href="/" className="flex-shrink-0" onClick={() => { setActiveDesktopDropdown(null); closeMobileMenu(); }}>
            <Image 
              src="/horizontal-logo-black.png" 
              alt="Taylored Instruction Logo" 
              width={220}
              height={64} 
              className="h-auto w-auto max-h-[64px]"
              priority
            />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-6">
            <NavMenu 
              navLinks={visibleNavLinks} 
              activeDropdown={activeDesktopDropdown} 
              toggleDropdown={toggleDesktopDropdown}
              isLoggedIn={isLoggedIn}
              isInstructor={isInstructor}
            />

            {/* Cart, Search, Register */}
            <div className="flex items-center ml-4 space-x-4">
              {/* Search button REMOVED */}
              {/* <button className="text-text-light hover:text-primary transition-colors duration-200" aria-label="Search">
                <FaSearch size={18} />
              </button> */}
              {/* Cart link REMOVED */}
              {/* <Link href="/cart" className="text-text-light hover:text-primary transition-colors duration-200" aria-label="Cart">
                <FaShoppingCart size={20} />
              </Link> */}
              <Link 
                href="https://www.hovn.app/tayloredinstruction" 
                target="_blank" 
                className="btn btn-primary text-sm py-2 px-4"
              >
                Register Now
              </Link>
            </div>
          </nav>

          {/* Mobile Menu Button */}
          <button 
            className="lg:hidden text-text-light hover:text-primary"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label={isMenuOpen ? "Close menu" : "Open menu"}
          >
            {isMenuOpen ? <FaTimes size={24} /> : <FaBars size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <div className={`lg:hidden bg-background-light transition-all duration-300 ease-in-out overflow-hidden ${isMenuOpen ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="container py-4">
          <MobileNavMenu 
            navLinks={visibleNavLinks}
            closeMenu={closeMobileMenu}
            isLoggedIn={isLoggedIn}
            isInstructor={isInstructor}
          />
          <div className="mt-6 flex flex-col items-center space-y-4">
            {/* Mobile Search & Cart - REMOVED */}
            {/* <button className="flex items-center space-x-2 text-text hover:text-primary" aria-label="Search">
              <FaSearch size={18} /> <span>Search</span>
            </button> */}
            {/* <Link href="/cart" className="flex items-center space-x-2 text-text hover:text-primary" onClick={closeMobileMenu}>
              <FaShoppingCart size={20} /> <span>Cart</span>
            </Link> */}
            <Link 
              href="https://www.hovn.app/tayloredinstruction" 
              target="_blank" 
              className="btn btn-primary w-full text-center"
              onClick={closeMobileMenu} 
            >
              Register Now
            </Link>
          </div>
        </div>
      </div>
    </header>
  )
}

// Desktop Navigation Menu
const NavMenu = ({
    navLinks,
    activeDropdown,
    toggleDropdown,
    isLoggedIn,
    isInstructor,
}: {
    navLinks: NavTopLevelLink[];
    activeDropdown: string | null;
    toggleDropdown: (dropdown: string) => void;
    isLoggedIn: boolean;
    isInstructor: boolean;
}) => {
  const pathname = usePathname() ?? '';

  const filterDropdownItems = (items: DropdownItem[]) => {
    return items.filter(item => {
      if (item.requiresInstructor && !isInstructor) return false;
      return true;
    });
  };

  return (
    <>
      {navLinks.map((link) => {
        // Prevent rendering if a link is accidentally labeled "Logout"
        if (link.label.toLowerCase() === 'logout') return null;

        return (
          <div key={link.label} className="relative">
            {link.dropdown ? (
              <button 
                onClick={() => toggleDropdown(link.label)}
                className={`flex items-center text-text hover:text-primary transition-colors duration-200 ${
                  activeDropdown === link.label || link.dropdown?.some(item => item.href && pathname.startsWith(item.href)) ? 'text-primary' : ''
                }`}
              >
                {link.label} 
                <FaChevronDown 
                  size={12} 
                  className={`ml-1 transition-transform duration-200 ${activeDropdown === link.label ? 'rotate-180' : ''}`}
                />
              </button>
            ) : link.href ? (
              <Link href={link.href} className={getLinkClass(link.href, pathname)}>
                {link.label}
              </Link>
            ) : (
              // Fallback for links without href or dropdown, if any. Or simply return null if not expected.
              <span>{link.label}</span> 
            )}

            {activeDropdown === link.label && link.dropdown && (
              <div className="absolute left-0 mt-2 w-56 origin-top-left rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none py-1 z-20">
                {filterDropdownItems(link.dropdown).map((item, index) => {
                  if (item.type === 'divider') {
                    return <div key={`divider-${index}`} className="my-1 h-px bg-gray-200 mx-4" />;
                  }
                  // Prevent rendering if a dropdown item is accidentally labeled "Logout"
                  if (item.label.toLowerCase() === 'logout') return null;
                  return (
                    <Link 
                      key={item.label}
                      href={item.href!}
                      className={`${getDropdownLinkClass(item.href!, pathname)} ${item.indent ? 'pl-8' : ''}`}
                      onClick={() => toggleDropdown(link.label)} // Close dropdown on click
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </>
  )
}

// Mobile Navigation Menu
const MobileNavMenu = ({
    navLinks,
    closeMenu,
    isLoggedIn,
    isInstructor,
}: {
    navLinks: NavTopLevelLink[];
    closeMenu: () => void;
    isLoggedIn: boolean;
    isInstructor: boolean;
}) => {
  const pathname = usePathname() ?? '';
  const [openMobileDropdown, setOpenMobileDropdown] = useState<string | null>(null);

  const toggleMobileDropdown = (dropdown: string) => {
    setOpenMobileDropdown(openMobileDropdown === dropdown ? null : dropdown);
  };

  const filterDropdownItems = (items: DropdownItem[]) => {
    return items.filter(item => {
      if (item.requiresInstructor && !isInstructor) return false;
      return true;
    });
  };

  return (
    <div className="py-2 space-y-1">
      {navLinks.map((link) => {
        // Prevent rendering if a link is accidentally labeled "Logout"
        if (link.label.toLowerCase() === 'logout') return null;
        
        return( // Added return here
          <div key={link.label}>
            {link.dropdown ? (
              <>
                <button 
                  onClick={() => toggleMobileDropdown(link.label)}
                  className="w-full flex justify-between items-center py-2 text-left text-text hover:text-primary transition-colors duration-200"
                >
                  <span>{link.label}</span>
                  <FaChevronDown className={`ml-1 h-3 w-3 transition-transform duration-200 ${openMobileDropdown === link.label ? 'rotate-180' : ''}`} />
                </button>
                {openMobileDropdown === link.label && (
                  <div className="pl-4 pt-1 pb-2 space-y-1 border-l border-gray-200 ml-2">
                    {filterDropdownItems(link.dropdown).map((item, index) => {
                      if (item.type === 'divider') {
                        return <div key={`divider-${index}`} className="my-1 h-px bg-gray-200" />;
                      }
                      // Prevent rendering if a dropdown item is accidentally labeled "Logout"
                      if (item.label.toLowerCase() === 'logout') return null;
                      return (
                        <Link
                          key={item.label}
                          href={item.href!}
                          className={getDropdownLinkClass(item.href!, pathname)}
                          onClick={closeMenu} // Close main mobile menu on item click
                        >
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </>
            ) : link.href ? (
              <Link 
                href={link.href} 
                className={`${getLinkClass(link.href, pathname, true)} block py-2 border-b border-gray-200`}
                onClick={closeMenu}
              >
                {link.label}
              </Link>
            ) : (
              // Fallback for links without href or dropdown
              <span className="block py-2 border-b border-gray-200 text-text">{link.label}</span>
            )}
          </div>
        ); // Closing parenthesis for return
      })}
    </div>
  )
} 