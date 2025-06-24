import Link from 'next/link'
import { Facebook, Instagram } from 'lucide-react'

export const Footer = () => {
  return (
    <footer className="bg-gray-100 text-text-light pt-16 pb-8">
      <div className="container mx-auto px-4">
        {/* Footer Grid: Company, Links, Help, Social */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 mb-12 items-start text-left">
          {/* About Us */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase text-text mb-2">About Us</h3>
            <p className="text-sm text-gray-600">At Taylored Instruction, we are dedicated to providing the highest quality health and safety training. Our goal is to equip every individual and organization with the skills they need to respond to emergencies with confidence.</p>
          </div>

          {/* Information Links */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase text-text mb-2">Information</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li><Link href="/my-account" className="hover:text-primary transition-colors">My Account</Link></li>
              <li><Link href="/terms" className="hover:text-primary transition-colors">Terms & Conditions</Link></li>
              <li><Link href="/privacy-policy" className="hover:text-primary transition-colors">Privacy Policy</Link></li>
              <li><Link href="https://help.tayloredinstruction.com/" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">Help Center</Link></li>
            </ul>
          </div>

          {/* Get Help */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase text-text mb-2">Get Help</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li><Link href="https://help.tayloredinstruction.com/" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">Visit Help Center</Link></li>
              <li><a href="mailto:info@tayloredinstruction.com" className="hover:text-primary transition-colors">info@tayloredinstruction.com</a></li>
              <li><a href="tel:3606588199" className="hover:text-primary transition-colors">(360) 658-8199</a></li>
            </ul>
          </div>

          {/* Social Media */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase text-text mb-2">Follow Us</h3>
            <div className="flex space-x-4">
              <a href="https://www.facebook.com/tayloredinstruction.us" target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="text-gray-500 hover:text-primary transition-colors"><Facebook size={20} /></a>
              <a href="https://www.instagram.com/taylored.instruction/" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="text-gray-500 hover:text-primary transition-colors"><Instagram size={20} /></a>
            </div>
          </div>
        </div>

        {/* Copyright - Adjusted border and text color */}
        <div className="border-t border-gray-300 pt-6 text-center text-xs text-gray-500">
          <p>&copy; {new Date().getFullYear()} Taylored Instruction. All Rights Reserved.</p>
        </div>
      </div>
    </footer>
  )
} 