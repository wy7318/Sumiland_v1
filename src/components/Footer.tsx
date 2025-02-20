import { Link } from 'react-router-dom';
import { Facebook, Twitter, Instagram, Linkedin, Mail } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-gray-900 text-white py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-2xl font-bold mb-4">Sumiland & Sub Studio</h3>
            <p className="text-gray-400">
              Crafting Digital Experiences & Creative Solutions
            </p>
          </div>

          <div>
            <h4 className="text-lg font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="text-gray-400 hover:text-primary-400 transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/blog" className="text-gray-400 hover:text-primary-400 transition-colors">
                  Blog
                </Link>
              </li>
              <li>
                <Link to="/#services" className="text-gray-400 hover:text-primary-400 transition-colors">
                  Services
                </Link>
              </li>
              <li>
                <Link to="/#portfolio" className="text-gray-400 hover:text-primary-400 transition-colors">
                  Portfolio
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-semibold mb-4">Contact</h4>
            <ul className="space-y-2 text-gray-400">
              <li>Avondale, AZ</li>
              <li>Dallas, TX</li>
              <li>matt.lee@sumisubi.com</li>
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-semibold mb-4">Follow Us</h4>
            <div className="flex space-x-4">
              <a href="https://www.instagram.com/sumiland_design/reels/" className="text-gray-400 hover:text-primary-400 transition-colors">
                <Instagram className="w-6 h-6" />
              </a>
              <a href="https://www.linkedin.com/company/99441865/admin/dashboard/" className="text-gray-400 hover:text-primary-400 transition-colors">
                <Linkedin className="w-6 h-6" />
              </a>
              <a href="mailto:matt.lee@sumisubi.com" className="text-gray-400 hover:text-primary-400 transition-colors">
                <Mail className="w-6 h-6" />
              </a>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-800 text-center text-gray-400">
          <p>&copy; {new Date().getFullYear()} Sumiland & Sub Studio. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}