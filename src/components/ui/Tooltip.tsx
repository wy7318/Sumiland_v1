// components/ui/Tooltip.tsx
import React, { useState } from 'react';

interface TooltipProps {
    content: string;
    children: React.ReactNode;
    position?: 'top' | 'right' | 'bottom' | 'left';
    delay?: number;
}

export const Tooltip: React.FC<TooltipProps> = ({
    content,
    children,
    position = 'top',
    delay = 300,
}) => {
    const [isVisible, setIsVisible] = useState(false);
    const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);

    const handleMouseEnter = () => {
        const id = setTimeout(() => {
            setIsVisible(true);
        }, delay);
        setTimeoutId(id);
    };

    const handleMouseLeave = () => {
        if (timeoutId) {
            clearTimeout(timeoutId);
            setTimeoutId(null);
        }
        setIsVisible(false);
    };

    const positionStyles = {
        top: 'bottom-full left-1/2 transform -translate-x-1/2 mb-2',
        right: 'left-full top-1/2 transform -translate-y-1/2 ml-2',
        bottom: 'top-full left-1/2 transform -translate-x-1/2 mt-2',
        left: 'right-full top-1/2 transform -translate-y-1/2 mr-2',
    };

    const arrowStyles = {
        top: 'bottom-[-4px] left-1/2 transform -translate-x-1/2 rotate-45',
        right: 'left-[-4px] top-1/2 transform -translate-y-1/2 rotate-45',
        bottom: 'top-[-4px] left-1/2 transform -translate-x-1/2 rotate-45',
        left: 'right-[-4px] top-1/2 transform -translate-y-1/2 rotate-45',
    };

    return (
        <div
            className="relative inline-block"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            {children}
            {isVisible && (
                <div
                    className={`absolute z-50 whitespace-nowrap px-3 py-2 text-xs font-medium text-white bg-gray-800 rounded shadow-sm max-w-xs ${positionStyles[position]
                        }`}
                >
                    {content}
                    <div
                        className={`absolute h-2 w-2 bg-gray-800 ${arrowStyles[position]}`}
                    />
                </div>
            )}
        </div>
    );
};