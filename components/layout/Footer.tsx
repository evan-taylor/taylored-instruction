import Link from "next/link";
<<<<<<< HEAD
import { FaFacebook, FaInstagram } from "react-icons/fa";
=======
import { FiFacebook, FiInstagram } from "react-icons/fi";
>>>>>>> origin/master
import { GOOGLE_BUSINESS_PROFILE_URL } from "@/lib/businessProfile";

export const Footer = () => {
  return (
    <footer className="border-slate-200 border-t bg-slate-50 pt-16 pb-8 text-text-light">
      <div className="container mx-auto px-4">
        {/* Footer Grid: Company, Links, Help, Social */}
        <div className="mb-12 grid grid-cols-1 items-start gap-8 text-left sm:grid-cols-2 md:grid-cols-4">
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
                  href="/resources"
                >
                  Training resources
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
              <li>
                <a
                  className="transition-colors hover:text-primary"
                  href={GOOGLE_BUSINESS_PROFILE_URL}
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
                href="https://www.facebook.com/tayloredinstruction.us"
                rel="noopener noreferrer"
                target="_blank"
              >
<<<<<<< HEAD
                <FaFacebook size={20} />
=======
                <FiFacebook size={20} />
>>>>>>> origin/master
              </a>
              <a
                aria-label="Instagram"
                className="text-slate-500 transition-colors hover:text-primary"
                href="https://www.instagram.com/taylored.instruction/"
                rel="noopener noreferrer"
                target="_blank"
              >
<<<<<<< HEAD
                <FaInstagram size={20} />
=======
                <FiInstagram size={20} />
>>>>>>> origin/master
              </a>
            </div>
          </div>
        </div>

        {/* Copyright - text-slate-600 for WCAG 4.5:1 contrast on gray-100 */}
        <div className="border-slate-300 border-t pt-6 text-center text-slate-600 text-xs">
          <p>
            &copy; {new Date().getFullYear()} Taylored Instruction. All rights
            reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};
