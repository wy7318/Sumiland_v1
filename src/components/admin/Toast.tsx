// Place this in ./components/admin/Toast.tsx or update your existing file

import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
    message: string;
    type: ToastType;
    onClose: () => void;
    duration?: number;
}

export const Toast: React.FC<ToastProps> = ({
    message,
    type = 'info',
    onClose,
    duration = 5000
}) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, duration);

        return () => clearTimeout(timer);
    }, [onClose, duration]);

    const getIconAndColor = () => {
        switch (type) {
            case 'success':
                return {
                    icon: <CheckCircle className="w-5 h-5" />,
                    bgColor: 'bg-green-50',
                    borderColor: 'border-green-200',
                    textColor: 'text-green-800',
                    iconColor: 'text-green-500'
                };
            case 'error':
                return {
                    icon: <AlertCircle className="w-5 h-5" />,
                    bgColor: 'bg-red-50',
                    borderColor: 'border-red-200',
                    textColor: 'text-red-800',
                    iconColor: 'text-red-500'
                };
            case 'warning':
                return {
                    icon: <AlertCircle className="w-5 h-5" />,
                    bgColor: 'bg-yellow-50',
                    borderColor: 'border-yellow-200',
                    textColor: 'text-yellow-800',
                    iconColor: 'text-yellow-500'
                };
            case 'info':
            default:
                return {
                    icon: <AlertCircle className="w-5 h-5" />,
                    bgColor: 'bg-blue-50',
                    borderColor: 'border-blue-200',
                    textColor: 'text-blue-800',
                    iconColor: 'text-blue-500'
                };
        }
    };

    const { icon, bgColor, borderColor, textColor, iconColor } = getIconAndColor();

    return (
        <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-4 right-4 z-50 flex items-center p-4 mb-4 rounded-lg shadow-md border ${bgColor} ${borderColor} ${textColor} max-w-md`}
            role="alert"
        >
            <div className={`flex-shrink-0 ${iconColor}`}>
                {icon}
            </div>
            <div className="ml-3 mr-6 text-sm font-medium">
                {message}
            </div>
            <button
                type="button"
                className={`ml-auto -mx-1.5 -my-1.5 rounded-lg p-1.5 inline-flex h-8 w-8 focus:ring-2 focus:ring-gray-300 ${textColor} hover:bg-gray-100`}
                onClick={onClose}
                aria-label="Close"
            >
                <X className="w-5 h-5" />
            </button>
        </motion.div>
    );
};

// Toast context to manage toasts throughout the application
export const ToastContext = React.createContext<{
    showToast: (message: string, type?: ToastType) => string;
    hideToast: (id: string) => void;
}>({
    showToast: () => "",
    hideToast: () => { },
});

export const useToast = () => React.useContext(ToastContext);

// ToastContainer to manage multiple toasts
export interface ToastMessage {
    id: string;
    message: string;
    type: ToastType;
}

export const ToastContainer: React.FC = () => {
    const [toasts, setToasts] = useState<ToastMessage[]>([]);

    const showToast = (message: string, type: ToastType = 'info') => {
        const id = Date.now().toString();
        setToasts(prev => [...prev, { id, message, type }]);
        return id;
    };

    const hideToast = (id: string) => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
    };

    // Expose functions globally for direct access
    useEffect(() => {
        // Add to window object
        (window as any).showToast = showToast;
        (window as any).hideToast = hideToast;

        return () => {
            delete (window as any).showToast;
            delete (window as any).hideToast;
        };
    }, []);

    return (
        <>
            <ToastContext.Provider value={{ showToast, hideToast }}>
                <div className="toast-container fixed top-4 right-4 z-50 space-y-2">
                    <AnimatePresence>
                        {toasts.map((toast) => (
                            <Toast
                                key={toast.id}
                                message={toast.message}
                                type={toast.type}
                                onClose={() => hideToast(toast.id)}
                            />
                        ))}
                    </AnimatePresence>
                </div>
            </ToastContext.Provider>
        </>
    );
};