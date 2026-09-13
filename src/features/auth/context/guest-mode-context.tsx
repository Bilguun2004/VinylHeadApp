import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

const GUEST_MODE_KEY = 'vinylhead.guest-mode';

type GuestModeContextValue = {
    guestMode: boolean;
    guestModeReady: boolean;
    enterGuestMode: () => Promise<void>;
    exitGuestMode: () => Promise<void>;
};

const GuestModeContext = createContext<GuestModeContextValue | null>(null);

export function GuestModeProvider({ children }: { children: ReactNode }) {
    const [guestMode, setGuestMode] = useState(false);
    const [guestModeReady, setGuestModeReady] = useState(false);

    useEffect(() => {
        void AsyncStorage.getItem(GUEST_MODE_KEY).then((value) => {
            setGuestMode(value === 'true');
            setGuestModeReady(true);
        });
    }, []);

    const enterGuestMode = async () => {
        await AsyncStorage.setItem(GUEST_MODE_KEY, 'true');
        setGuestMode(true);
    };

    const exitGuestMode = async () => {
        await AsyncStorage.removeItem(GUEST_MODE_KEY);
        setGuestMode(false);
    };

    return (
        <GuestModeContext.Provider
            value={{ guestMode, guestModeReady, enterGuestMode, exitGuestMode }}
        >
            {children}
        </GuestModeContext.Provider>
    );
}

export function useGuestMode() {
    const value = useContext(GuestModeContext);
    if (!value) throw new Error('useGuestMode must be used inside GuestModeProvider');
    return value;
}