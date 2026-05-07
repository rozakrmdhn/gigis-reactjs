import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { authService } from '../services/auth.service';
import type { User } from '../services/auth.service';

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    signin: (email: string, password: string) => Promise<void>;
    signout: () => void;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Only run on client side
        if (typeof window !== 'undefined') {
            // Check for existing auth on mount
            const existingUser = authService.getUser();
            if (existingUser && authService.isAuthenticated()) {
                setUser(existingUser);
            }
        }
        setIsLoading(false);
    }, []);

    // Listen for session expiry event
    useEffect(() => {
        const handleSessionExpired = () => {
            console.log("Session expired");
            setUser(null);
        };

        window.addEventListener("auth-session-expired", handleSessionExpired);

        // Global watchdog check every 1 second
        const interval = setInterval(() => {
            const expiry = authService.getExpiry();
            const now = Date.now();

            if (expiry && user) {
                const remainingMs = expiry - now;

                // Peringatan 2 menit sebelum expired
                if (remainingMs > 0 && remainingMs <= 2 * 60 * 1000) {
                    window.dispatchEvent(new CustomEvent("auth-session-warning", {
                        detail: { remainingMs }
                    }));
                }
            }

            authService.checkSession();
        }, 1000);

        return () => {
            window.removeEventListener("auth-session-expired", handleSessionExpired);
            clearInterval(interval);
        };
    }, [user]);

    const signin = async (email: string, password: string) => {
        const response = await authService.signin(email, password);
        if (response.status === 'success' && response.data) {
            setUser(response.data.user);
        }
    };

    const signout = () => {
        authService.signout();
        setUser(null);
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                isAuthenticated: !!user,
                signin,
                signout,
                isLoading,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
