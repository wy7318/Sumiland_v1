import React from 'react';
import { ArrowUp, Mail, Phone } from 'lucide-react';
// Note: In your actual project, replace <a href="..."> with <Link to="..."> from react-router-dom

export function FooterSection() {
    const scrollToTop = () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    };

    const scrollToSection = (sectionId) => {
        const element = document.getElementById(sectionId);
        if (element) {
            const offset = 80;
            const elementPosition = element.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - offset;

            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });
        }
    };

    return (
        <footer className="bg-white relative border-t border-gray-200">
            {/* Subtle Background Pattern */}
            <div className="absolute inset-0">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9InJnYmEoMTU2LDE2MywxNzUsMC4xKSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-20" />
            </div>
            <div className="max-w-6xl mx-auto px-6 lg:px-8 py-16 relative z-10">
                {/* Main Content */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
                    {/* Company Info */}
                    <div className="md:col-span-1">
                        <a href="/" className="inline-block mb-6">
                            <img
                                src="https://jaytpfztifhtzcruxguj.supabase.co/storage/v1/object/public/organization-logos/logos/SimpliDone%20(1).png"
                                alt="SimpliDone CRM Logo"
                                className="h-10"
                            />
                        </a>

                        <p className="text-gray-600 text-lg mb-6 leading-relaxed">
                            Transform your business with intelligent CRM solutions.
                            Simple, powerful, and designed for growth.
                        </p>

                        <div className="flex items-center space-x-6">
                            <a
                                href="mailto:info@SimpliDone.com"
                                className="flex items-center text-gray-600 hover:text-black transition-colors"
                            >
                                <Mail className="w-4 h-4 mr-2" />
                                <span className="text-sm">info@SimpliDone.com</span>
                            </a>

                        </div>
                    </div>

                    {/* Navigation Links */}
                    <div className="md:col-span-1">
                        <h3 className="text-black font-medium text-lg mb-6">Navigation</h3>
                        <ul className="space-y-4">
                            <li>
                                <button
                                    onClick={() => scrollToSection('features')}
                                    className="text-gray-600 hover:text-black transition-colors text-left"
                                >
                                    Product
                                </button>
                            </li>
                            <li>
                                <button
                                    onClick={() => scrollToSection('pricing')}
                                    className="text-gray-600 hover:text-black transition-colors text-left"
                                >
                                    Pricing
                                </button>
                            </li>
                            <li>
                                <a
                                    href="/blog"
                                    className="text-gray-600 hover:text-black transition-colors"
                                >
                                    News
                                </a>
                            </li>
                            <li>
                                <button
                                    onClick={() => scrollToSection('faq')}
                                    className="text-gray-600 hover:text-black transition-colors text-left"
                                >
                                    FAQ
                                </button>
                            </li>
                            <li>
                                <button
                                    onClick={() => scrollToSection('contact')}
                                    className="text-gray-600 hover:text-black transition-colors text-left"
                                >
                                    Contact
                                </button>
                            </li>
                        </ul>
                    </div>

                    {/* Legal & Support */}
                    <div className="md:col-span-1">
                        <h3 className="text-white font-medium text-lg mb-6">Legal & Support</h3>
                        <ul className="space-y-4">
                            <li>
                                <a
                                    href="/privacy-policy"
                                    className="text-gray-400 hover:text-white transition-colors"
                                >
                                    Privacy Policy
                                </a>
                            </li>
                            <li>
                                <a
                                    href="/terms-of-service"
                                    className="text-gray-400 hover:text-white transition-colors"
                                >
                                    Terms of Service
                                </a>
                            </li>
                            <li>
                                <button
                                    onClick={() => scrollToSection('contact')}
                                    className="text-gray-400 hover:text-white transition-colors text-left"
                                >
                                    Support
                                </button>
                            </li>
                            <li>
                                <button
                                    onClick={() => scrollToSection('contact')}
                                    className="text-gray-400 hover:text-white transition-colors text-left"
                                >
                                    Help Center
                                </button>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="border-t border-gray-200 pt-8 flex flex-col md:flex-row justify-between items-center">
                    <p className="text-gray-500 text-sm mb-4 md:mb-0">
                        © {new Date().getFullYear()} SimpliDone. All rights reserved.
                    </p>

                    <div className="flex items-center space-x-8">
                        <span className="text-gray-500 text-sm">
                            Made with ❤️ for businesses
                        </span>
                        <div className="flex items-center space-x-4">
                            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                            <span className="text-gray-500 text-sm">All systems operational</span>
                        </div>
                    </div>
                </div>

                {/* Scroll to Top Button */}
                <button
                    onClick={scrollToTop}
                    className="absolute right-8 -top-6 bg-black hover:bg-gray-800 text-white p-3 rounded-full shadow-lg transition-colors group"
                    aria-label="Scroll to top"
                >
                    <ArrowUp className="w-5 h-5 group-hover:-translate-y-0.5 transition-transform" />
                </button>
            </div>
        </footer>
    );
}