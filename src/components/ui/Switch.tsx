// components/ui/Switch.tsx
import React from 'react';

interface SwitchProps {
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
    disabled?: boolean;
    className?: string;
}

export const Switch: React.FC<SwitchProps> = ({
    checked,
    onCheckedChange,
    disabled = false,
    className = '',
}) => {
    return (
        <div
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${checked ? 'bg-primary-600' : 'bg-gray-200'
                } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${className}`}
            onClick={() => {
                if (!disabled) {
                    onCheckedChange(!checked);
                }
            }}
            role="switch"
            aria-checked={checked}
            tabIndex={disabled ? -1 : 0}
            aria-disabled={disabled}
        >
            <span
                className={`${checked ? 'translate-x-6' : 'translate-x-1'
                    } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
            />
        </div>
    );
};