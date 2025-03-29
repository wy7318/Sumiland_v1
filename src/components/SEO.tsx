import { useEffect } from 'react';

interface SEOProps {
    title: string;
    description: string;
    keywords?: string;
    ogTitle?: string;
    ogDescription?: string;
    ogType?: string;
    ogUrl?: string;
    ogImage?: string;
    favicon?: string;
}

export function SEO({
    title,
    description,
    keywords,
    ogTitle = title,
    ogDescription = description,
    ogType = 'website',
    ogUrl = 'https://xelytic.com',
    ogImage = 'https://jaytpfztifhtzcruxguj.supabase.co/storage/v1/object/public/organization-logos/logos/blue_logo.png',
    favicon = 'https://jaytpfztifhtzcruxguj.supabase.co/storage/v1/object/public/organization-logos/logos/blue_logo.png'
}: SEOProps) {
    useEffect(() => {
        // Helper function to create meta element - defined BEFORE it's used
        function createMetaElement(name: string, isProperty: boolean = false) {
            const meta = document.createElement('meta');
            meta.setAttribute(isProperty ? 'property' : 'name', name);
            document.head.appendChild(meta);
            return meta;
        }

        // Update the document title
        document.title = title;

        // Get meta elements or create if they don't exist
        const metaDescription = document.querySelector('meta[name="description"]') ||
            createMetaElement('description');
        const metaKeywords = document.querySelector('meta[name="keywords"]') ||
            createMetaElement('keywords');
        const metaOgTitle = document.querySelector('meta[property="og:title"]') ||
            createMetaElement('og:title', true);
        const metaOgDescription = document.querySelector('meta[property="og:description"]') ||
            createMetaElement('og:description', true);
        const metaOgType = document.querySelector('meta[property="og:type"]') ||
            createMetaElement('og:type', true);
        const metaOgUrl = document.querySelector('meta[property="og:url"]') ||
            createMetaElement('og:url', true);
        const metaOgImage = document.querySelector('meta[property="og:image"]') ||
            createMetaElement('og:image', true);
        const metaTwitterCard = document.querySelector('meta[name="twitter:card"]') ||
            createMetaElement('twitter:card');

        // Set meta content
        metaDescription.setAttribute('content', description);
        if (keywords) metaKeywords.setAttribute('content', keywords);
        metaOgTitle.setAttribute('content', ogTitle);
        metaOgDescription.setAttribute('content', ogDescription);
        metaOgType.setAttribute('content', ogType);
        metaOgUrl.setAttribute('content', ogUrl);
        metaOgImage.setAttribute('content', ogImage);
        metaTwitterCard.setAttribute('content', 'summary_large_image');

        // Add canonical link if it doesn't exist
        if (!document.querySelector('link[rel="canonical"]')) {
            const link = document.createElement('link');
            link.setAttribute('rel', 'canonical');
            link.setAttribute('href', ogUrl);
            document.head.appendChild(link);
        } else {
            document.querySelector('link[rel="canonical"]')?.setAttribute('href', ogUrl);
        }

        // Add favicon if it doesn't exist
        if (!document.querySelector('link[rel="icon"]')) {
            const faviconLink = document.createElement('link');
            faviconLink.setAttribute('rel', 'icon');
            faviconLink.setAttribute('href', favicon);
            document.head.appendChild(faviconLink);
        } else {
            document.querySelector('link[rel="icon"]')?.setAttribute('href', favicon);
        }

        // Add apple touch icon if it doesn't exist
        if (!document.querySelector('link[rel="apple-touch-icon"]')) {
            const appleTouchIcon = document.createElement('link');
            appleTouchIcon.setAttribute('rel', 'apple-touch-icon');
            appleTouchIcon.setAttribute('href', favicon);
            document.head.appendChild(appleTouchIcon);
        } else {
            document.querySelector('link[rel="apple-touch-icon"]')?.setAttribute('href', favicon);
        }
    }, [title, description, keywords, ogTitle, ogDescription, ogType, ogUrl, ogImage, favicon]);

    return null; // This component doesn't render anything
}