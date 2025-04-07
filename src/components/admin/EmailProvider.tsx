import React, { createContext, useContext, useState, ReactNode } from 'react';
import { FoldableEmailModal } from './FoldableEmailModal';

type EmailContextType = {
    openEmailComposer: (options: EmailComposerOptions) => void;
    minimizeEmailComposer: () => void;
    maximizeEmailComposer: () => void;
    closeEmailComposer: () => void;
    isEmailComposerOpen: boolean;
    isEmailComposerMinimized: boolean;
};

type EmailComposerOptions = {
    to: string;
    caseTitle?: string;
    orgId?: string;
    caseId?: string;
    onSuccess?: () => void;
    autoClose?: boolean; // Added option to control auto-closing
};

const EmailContext = createContext<EmailContextType | undefined>(undefined);

export const useEmailComposer = (): EmailContextType => {
    const context = useContext(EmailContext);
    if (!context) {
        throw new Error('useEmailComposer must be used within an EmailProvider');
    }
    return context;
};

type EmailProviderProps = {
    children: ReactNode;
};

export function EmailProvider({ children }: EmailProviderProps) {
    const [emailOptions, setEmailOptions] = useState<EmailComposerOptions | null>(null);
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);

    const openEmailComposer = (options: EmailComposerOptions) => {
        setEmailOptions({
            ...options,
            autoClose: options.autoClose !== false // Default to true if not specified
        });
        setIsOpen(true);
        setIsMinimized(false);
    };

    const minimizeEmailComposer = () => {
        setIsMinimized(true);
    };

    const maximizeEmailComposer = () => {
        setIsMinimized(false);
    };

    const closeEmailComposer = () => {
        setIsOpen(false);
        setIsMinimized(false);
        setEmailOptions(null);
    };

    const handleSuccess = () => {
        if (emailOptions?.onSuccess) {
            emailOptions.onSuccess();
        }

        // Auto-close by default (unless explicitly disabled)
        if (emailOptions?.autoClose !== false) {
            closeEmailComposer();
        }
    };

    return (
        <EmailContext.Provider
            value={{
                openEmailComposer,
                minimizeEmailComposer,
                maximizeEmailComposer,
                closeEmailComposer,
                isEmailComposerOpen: isOpen,
                isEmailComposerMinimized: isMinimized,
            }}
        >
            {children}

            {emailOptions && (
                <FoldableEmailModal
                    to={emailOptions.to}
                    caseTitle={emailOptions.caseTitle}
                    orgId={emailOptions.orgId}
                    caseId={emailOptions.caseId}
                    onClose={closeEmailComposer}
                    onSuccess={handleSuccess}
                    isVisible={isOpen && !isMinimized}
                    onMinimize={minimizeEmailComposer}
                    onMaximize={maximizeEmailComposer}
                />
            )}
        </EmailContext.Provider>
    );
}