import Link from 'next/link'
import { FaFacebook, FaInstagram } from 'react-icons/fa'
import { ChamberBadge } from '@/components/ui/ChamberBadge'

export const Footer = () => {
  return (
    <footer className="bg-gray-100 text-text-light pt-16 pb-8">
      <div className="container mx-auto px-4">
        {/* Main Footer Content - Back to 3 columns */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-12"> 
          
          {/* About Us & Badge Column */}
          <div>
            <h3 className="text-lg font-semibold text-text mb-4">ABOUT US</h3>
            <p className="mb-6 text-sm">
              At Taylored Instruction, we are dedicated to providing the highest quality health and safety training. 
              Our goal is to equip every individual and organization with the skills they need to respond to emergencies with confidence.
            </p>
            <div className="mt-6">
              <ChamberBadge />
            </div>
          </div>

          {/* Quick Links Column */}
          <div>
            <h3 className="text-lg font-semibold text-text mb-4">Quick Links</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/" className="hover:text-primary transition-colors duration-200">Home</Link></li>
              <li><Link href="/classes" className="hover:text-primary transition-colors duration-200">Classes</Link></li>
              <li><Link href="/about" className="hover:text-primary transition-colors duration-200">About</Link></li>
              <li><Link href="/contact" className="hover:text-primary transition-colors duration-200">Contact</Link></li>
              <li><Link href="/shop" className="hover:text-primary transition-colors duration-200">Shop</Link></li>
              <li><Link href="/my-account" className="hover:text-primary transition-colors duration-200">My Account</Link></li>
            </ul>
          </div>

          {/* Information & Help Column */}
          <div>
            <h3 className="text-lg font-semibold text-text mb-4">INFORMATION</h3>
            <ul className="space-y-2 text-sm mb-6">
              <li><Link href="/my-account" className="hover:text-primary transition-colors duration-200">My Account</Link></li>
              <li><Link href="/terms" className="hover:text-primary transition-colors duration-200">Terms and Conditions</Link></li>
              <li><Link href="/privacy-policy" className="hover:text-primary transition-colors duration-200">Privacy Policy</Link></li>
              <li><Link href="https://help.tayloredinstruction.com/" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors duration-200">Help Center</Link></li>
            </ul>

            <h3 className="text-lg font-semibold text-text mb-4">GET HELP</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="https://help.tayloredinstruction.com/" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors duration-200">Visit Our Help Center</Link></li>
              <li><a href="mailto:info@tayloredinstruction.com" className="hover:text-primary transition-colors duration-200">info@tayloredinstruction.com</a></li>
              <li><a href="tel:3606588199" className="hover:text-primary transition-colors duration-200">(360) 658-8199</a></li>
            </ul>
          </div>
          
          {/* Removed the fourth column entirely */}
        </div>

        {/* Social Media - Moved out of grid, centered */}
        <div className="flex justify-center space-x-6 mb-8">
          <a 
            href="https://www.facebook.com/tayloredinstruction.us" 
            target="_blank" 
            rel="noopener noreferrer"
            aria-label="Facebook"
            className="text-gray-500 hover:text-primary transition-colors duration-200"
          >
            <FaFacebook size={24} />
          </a>
          <a 
            href="https://www.instagram.com/taylored.instruction/" 
            target="_blank" 
            rel="noopener noreferrer"
            aria-label="Instagram"
            className="text-gray-500 hover:text-primary transition-colors duration-200"
          >
            <FaInstagram size={24} />
          </a>
        </div>

        {/* Copyright - Adjusted border and text color */}
        <div className="border-t border-gray-300 pt-6 text-center text-xs text-gray-500">
          <p>&copy; {new Date().getFullYear()} Taylored Instruction. All Rights Reserved.</p>
        </div>
      </div>
    </footer>
  )
} 