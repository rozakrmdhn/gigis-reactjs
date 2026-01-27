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
