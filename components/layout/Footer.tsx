import Link from "next/link";
import { FiFacebook, FiInstagram } from "react-icons/fi";
import { BUSINESS } from "@/lib/business";
import { LOCATIONS, locationName, locationPath } from "@/lib/locations";
import {
  AHA_COURSE_LINKS,
  RED_CROSS_COURSE_LINKS,
  type SiteLink,
  TRAINING_SERVICE_LINKS,
} from "@/lib/service-links";

const LOCATION_LINKS = LOCATIONS.map((location) => ({
  label: locationName(location),
  href: locationPath(location),
}));

const COURSE_GROUPS = [
  { label: "American Heart Association", links: AHA_COURSE_LINKS },
  { label: "American Red Cross", links: RED_CROSS_COURSE_LINKS },
];

const FooterLinkList = ({ links }: { links: SiteLink[] }) => (
  <ul className="space-y-2 text-slate-600 text-sm">
    {links.map((link) => (
      <li key={link.href}>
        <Link className="transition-colors hover:text-primary" href={link.href}>
          {link.label}
        </Link>
      </li>
    ))}
  </ul>
);

/** Read once at module load so the prerendered shell doesn't depend on the clock. */
const COPYRIGHT_YEAR = new Date().getFullYear();

export const Footer = () => {
  return (
    <footer className="border-slate-200 border-t bg-slate-50 pt-16 pb-8 text-text-light">
      <div className="container mx-auto px-4">
        {/* Footer Grid: Company, Courses, Services, Links, Help, Social */}
        <div className="mb-12 grid grid-cols-1 items-start gap-8 text-left sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
          {/* About Us */}
          <div className="space-y-4">
            <h3 className="mb-2 font-semibold text-sm text-text uppercase tracking-wide">
              About us
            </h3>
            <p className="text-slate-600 text-sm">
              At Taylored Instruction, we are dedicated to providing the highest
              quality health and safety training. Our goal is to equip every
              individual and organization with the skills they need to respond
              to emergencies with confidence.
            </p>
          </div>

          {/* Courses */}
          <div className="space-y-4">
            <h3 className="mb-2 font-semibold text-sm text-text uppercase tracking-wide">
              Courses
            </h3>
            {COURSE_GROUPS.map((group) => (
              <div className="space-y-2" key={group.label}>
                <p className="font-medium text-slate-500 text-xs">
                  {group.label}
                </p>
                <FooterLinkList links={group.links} />
              </div>
            ))}
          </div>

          {/* Services */}
          <div className="space-y-4">
            <h3 className="mb-2 font-semibold text-sm text-text uppercase tracking-wide">
              Services
            </h3>
            <FooterLinkList links={TRAINING_SERVICE_LINKS} />
            <h3 className="mb-2 font-semibold text-sm text-text uppercase tracking-wide">
              Locations
            </h3>
            <FooterLinkList links={LOCATION_LINKS} />
          </div>

          {/* Information Links */}
          <div className="space-y-4">
            <h3 className="mb-2 font-semibold text-sm text-text uppercase tracking-wide">
              Information
            </h3>
            <ul className="space-y-2 text-slate-600 text-sm">
              <li>
                <Link
                  className="transition-colors hover:text-primary"
                  href="/my-account"
                >
                  My account
                </Link>
              </li>
              <li>
                <Link
                  className="transition-colors hover:text-primary"
                  href="/terms"
                >
                  Terms and conditions
                </Link>
              </li>
              <li>
                <Link
                  className="transition-colors hover:text-primary"
                  href="/privacy-policy"
                >
                  Privacy policy
                </Link>
              </li>
            </ul>
          </div>

          {/* Get Help */}
          <div className="space-y-4">
            <h3 className="mb-2 font-semibold text-sm text-text uppercase tracking-wide">
              Get help
            </h3>
            <ul className="space-y-2 text-slate-600 text-sm">
              {/* Visit Help Center link removed */}
              <li>
                <a
                  className="transition-colors hover:text-primary"
                  href={`mailto:${BUSINESS.email}`}
                >
                  {BUSINESS.email}
                </a>
              </li>
              <li>
                <a
                  className="transition-colors hover:text-primary"
                  href={BUSINESS.phone.href}
                >
                  {BUSINESS.phone.display}
                </a>
              </li>
              <li>
                <a
                  className="transition-colors hover:text-primary"
                  href={BUSINESS.googleBusinessProfileUrl}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  Find us on Google
                </a>
              </li>
            </ul>
          </div>

          {/* Social Media */}
          <div className="space-y-4">
            <h3 className="mb-2 font-semibold text-sm text-text uppercase tracking-wide">
              Follow us
            </h3>
            <div className="flex space-x-4">
              <a
                aria-label="Facebook"
                className="text-slate-500 transition-colors hover:text-primary"
                href={BUSINESS.socials.facebook}
                rel="noopener noreferrer"
                target="_blank"
              >
                <FiFacebook size={20} />
              </a>
              <a
                aria-label="Instagram"
                className="text-slate-500 transition-colors hover:text-primary"
                href={BUSINESS.socials.instagram}
                rel="noopener noreferrer"
                target="_blank"
              >
                <FiInstagram size={20} />
              </a>
            </div>
          </div>
        </div>

        {/* Copyright - text-slate-600 for WCAG 4.5:1 contrast on gray-100 */}
        <div className="border-slate-300 border-t pt-6 text-center text-slate-600 text-xs">
          <p>
            &copy; {COPYRIGHT_YEAR} Taylored Instruction. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};
