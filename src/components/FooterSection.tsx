import { ArrowUp } from 'lucide-react';

export function FooterSection() {
    const scrollToTop = () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    };

    return (
        <footer className="bg-gray-900 border-t border-gray-800">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
                    <div>
                        <div className="flex items-center mb-6">
                            <img
                                src="https://jaytpfztifhtzcruxguj.supabase.co/storage/v1/object/public/organization-logos/logos/blue_logo.png"
                                alt="Xelytic CRM Logo"
                                className="h-12 mb-2"
                            />
                        </div>

                        <p className="text-gray-400 mb-6">
                            Transform your business with our comprehensive CRM solution.
                            Smart analytics for smarter decisions.
                        </p>

                        <div className="flex gap-4">
                            {['facebook', 'twitter', 'linkedin', 'instagram'].map((social, index) => (
                                <a
                                    key={index}
                                    href={`#${social}`}
                                    className="bg-gray-800 hover:bg-primary-500 rounded-full w-10 h-10 flex items-center justify-center transition-colors"
                                    aria-label={`Follow us on ${social}`}
                                >
                                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                        <path fillRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 5.523 4.477 10 10 10s10-4.477 10-10c0-5.523-4.477-10-10-10z" clipRule="evenodd" />
                                    </svg>
                                </a>
                            ))}
                        </div>
                    </div>

                    <div>
                        <h3 className="text-white font-bold text-xl mb-6">Product</h3>
                        <ul className="space-y-4">
                            {['Features', 'Services', 'Pricing', 'Demo', 'API', 'Security'].map((item, index) => (
                                <li key={index}>
                                    <a href={`#${item.toLowerCase()}`} className="text-gray-400 hover:text-primary-400 transition-colors">
                                        {item}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div>
                        <h3 className="text-white font-bold text-xl mb-6">Resources</h3>
                        <ul className="space-y-4">
                            {['Documentation', 'Blog', 'Guides', 'Case Studies', 'FAQ', 'Support'].map((item, index) => (
                                <li key={index}>
                                    <a href={`#${item.toLowerCase()}`} className="text-gray-400 hover:text-primary-400 transition-colors">
                                        {item}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div>
                        <h3 className="text-white font-bold text-xl mb-6">Company</h3>
                        <ul className="space-y-4">
                            {['About Us', 'Careers', 'Press', 'Partners', 'Contact Us', 'Terms of Service'].map((item, index) => (
                                <li key={index}>
                                    <a href={`#${item.toLowerCase().replace(/\s+/g, '-')}`} className="text-gray-400 hover:text-primary-400 transition-colors">
                                        {item}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                <div className="mt-12 pt-8 border-t border-gray-800 flex flex-col md:flex-row justify-between items-center">
                    <p className="text-gray-500 text-sm mb-4 md:mb-0">
                        © {new Date().getFullYear()} Xelytic CRM. All rights reserved.
                    </p>

                    <div className="flex gap-6">
                        <a href="#privacy-policy" className="text-gray-500 hover:text-primary-400 text-sm transition-colors">
                            Privacy Policy
                        </a>
                        <a href="#terms-of-service" className="text-gray-500 hover:text-primary-400 text-sm transition-colors">
                            Terms of Service
                        </a>
                        <a href="#cookies-policy" className="text-gray-500 hover:text-primary-400 text-sm transition-colors">
                            Cookies Policy
                        </a>
                    </div>
                </div>

                <button
                    onClick={scrollToTop}
                    className="absolute right-8 -top-6 bg-primary-500 hover:bg-primary-600 text-white p-3 rounded-full shadow-lg transition-colors"
                    aria-label="Scroll to top"
                >
                    <ArrowUp className="w-5 h-5" />
                </button>
            </div>
        </footer>
    );
}