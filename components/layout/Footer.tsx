import { Facebook, Instagram } from "lucide-react";
import Link from "next/link";

export const Footer = () => {
  return (
    <footer className="bg-gray-100 pt-16 pb-8 text-text-light">
      <div className="container mx-auto px-4">
        {/* Footer Grid: Company, Links, Help, Social */}
        <div className="mb-12 grid grid-cols-1 items-start gap-8 text-left sm:grid-cols-2 md:grid-cols-4">
          {/* About Us */}
          <div className="space-y-4">
            <h3 className="mb-2 font-semibold text-sm text-text uppercase">
              About Us
            </h3>
            <p className="text-gray-600 text-sm">
              At Taylored Instruction, we are dedicated to providing the highest
              quality health and safety training. Our goal is to equip every
              individual and organization with the skills they need to respond
              to emergencies with confidence.
            </p>
          </div>

          {/* Information Links */}
          <div className="space-y-4">
            <h3 className="mb-2 font-semibold text-sm text-text uppercase">
              Information
            </h3>
            <ul className="space-y-2 text-gray-600 text-sm">
              <li>
                <Link
                  className="transition-colors hover:text-primary"
                  href="/my-account"
                >
                  My Account
                </Link>
              </li>
              <li>
                <Link
                  className="transition-colors hover:text-primary"
                  href="/resources"
                >
                  Training Resources
                </Link>
              </li>
              <li>
                <Link
                  className="transition-colors hover:text-primary"
                  href="/terms"
                >
                  Terms & Conditions
                </Link>
              </li>
              <li>
                <Link
                  className="transition-colors hover:text-primary"
                  href="/privacy-policy"
                >
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>

          {/* Get Help */}
          <div className="space-y-4">
            <h3 className="mb-2 font-semibold text-sm text-text uppercase">
              Get Help
            </h3>
            <ul className="space-y-2 text-gray-600 text-sm">
              {/* Visit Help Center link removed */}
              <li>
                <a
                  className="transition-colors hover:text-primary"
                  href="mailto:info@tayloredinstruction.com"
                >
                  info@tayloredinstruction.com
                </a>
              </li>
              <li>
                <a
                  className="transition-colors hover:text-primary"
                  href="tel:3606588199"
                >
                  (360) 658-8199
                </a>
              </li>
            </ul>
          </div>

          {/* Social Media */}
          <div className="space-y-4">
            <h3 className="mb-2 font-semibold text-sm text-text uppercase">
              Follow Us
            </h3>
            <div className="flex space-x-4">
              <a
                aria-label="Facebook"
                className="text-gray-500 transition-colors hover:text-primary"
                href="https://www.facebook.com/tayloredinstruction.us"
                rel="noopener noreferrer"
                target="_blank"
              >
                <Facebook size={20} />
              </a>
              <a
                aria-label="Instagram"
                className="text-gray-500 transition-colors hover:text-primary"
                href="https://www.instagram.com/taylored.instruction/"
                rel="noopener noreferrer"
                target="_blank"
              >
                <Instagram size={20} />
              </a>
            </div>
          </div>
        </div>

        {/* Copyright - text-gray-600 for WCAG 4.5:1 contrast on gray-100 */}
        <div className="border-gray-300 border-t pt-6 text-center text-gray-600 text-xs">
          <p>
            &copy; {new Date().getFullYear()} Taylored Instruction. All Rights
            Reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};
