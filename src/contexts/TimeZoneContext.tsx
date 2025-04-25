import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { DateTime } from 'luxon';
import { supabase } from '../lib/supabase';
import { useOrganization } from './OrganizationContext';

interface TimeZoneContextType {
    orgTimezone: string;
    formatDate: (dateString: string, format?: string) => string;
    formatDateTime: (dateString: string, format?: string) => string;
    formatTime: (dateString: string, format?: string) => string;
    toLocalDate: (dateString: string) => DateTime;
}

const defaultTimezone = 'UTC';

const TimeZoneContext = createContext<TimeZoneContextType>({
    orgTimezone: defaultTimezone,
    formatDate: () => '',
    formatDateTime: () => '',
    formatTime: () => '',
    toLocalDate: () => DateTime.now(),
});

export const useTimeZone = () => useContext(TimeZoneContext);

interface TimeZoneProviderProps {
    children: ReactNode;
}

export const TimeZoneProvider: React.FC<TimeZoneProviderProps> = ({ children }) => {
    const { selectedOrganization } = useOrganization();
    const [orgTimezone, setOrgTimezone] = useState<string>(defaultTimezone);

    useEffect(() => {
        const fetchTimezone = async () => {
            if (!selectedOrganization?.id) return;

            const { data, error } = await supabase
                .from('organizations')
                .select('timezone')
                .eq('id', selectedOrganization.id)
                .single();

            if (error) {
                console.error('Failed to fetch org timezone:', error);
                return;
            }

            if (data?.timezone) {
                setOrgTimezone(data.timezone);
            } else {
                setOrgTimezone(defaultTimezone);
            }
        };

        fetchTimezone();
    }, [selectedOrganization]);

    // Convert UTC date string to organization timezone
    const toLocalDate = (dateString: string): DateTime => {
        if (!dateString) return DateTime.now().setZone(orgTimezone);

        return DateTime.fromISO(dateString, { zone: 'UTC' }).setZone(orgTimezone);
    };

    // Format date only (e.g., "Jan 15, 2023")
    const formatDate = (dateString: string, format: string = 'LLL dd, yyyy'): string => {
        if (!dateString) return '';

        return toLocalDate(dateString).toFormat(format);
    };

    // Format date and time (e.g., "Jan 15, 2023, 2:30 PM")
    const formatDateTime = (dateString: string, format: string = 'LLL dd, yyyy, t'): string => {
        if (!dateString) return '';

        return toLocalDate(dateString).toFormat(format);
    };

    // Format time only (e.g., "2:30 PM")
    const formatTime = (dateString: string, format: string = 't'): string => {
        if (!dateString) return '';

        return toLocalDate(dateString).toFormat(format);
    };

    const contextValue: TimeZoneContextType = {
        orgTimezone,
        formatDate,
        formatDateTime,
        formatTime,
        toLocalDate,
    };

    return (
        <TimeZoneContext.Provider value={contextValue}>
            {children}
        </TimeZoneContext.Provider>
    );
};

export default TimeZoneProvider;