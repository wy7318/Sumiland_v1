// src/pages/NotFoundPage.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, Home, ArrowLeft } from 'lucide-react';

export default function NotFoundPage() {
    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
            <div className="text-center max-w-md">
                <div className="mb-8">
                    <AlertCircle className="w-24 h-24 text-gray-300 mx-auto mb-4" />
                    <h1 className="text-4xl font-bold text-gray-900 mb-2">404</h1>
                    <h2 className="text-xl font-semibold text-gray-700 mb-2">Page Not Found</h2>
                    <p className="text-gray-600">
                        The page you're looking for doesn't exist or may have been moved.
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Link
                        to="/online-order"
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <Home className="w-4 h-4" />
                        Browse Restaurants
                    </Link>

                    <button
                        onClick={() => window.history.back()}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Go Back
                    </button>
                </div>
            </div>
        </div>
    );
}