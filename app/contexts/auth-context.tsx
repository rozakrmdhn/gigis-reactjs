import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { authService } from '../services/auth.service';
import type { User } from '../services/auth.service';

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    signin: (email: string, password: string) => Promise<void>;
    signout: () => Promise<void>;
    updateUser: (updatedData: Partial<User>) => void;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();

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

    // Listen for session expiry event dispatched by api-client
    useEffect(() => {
        const handleSessionExpired = () => {
            setUser(null);
            navigate('/login', { replace: true });
        };

        window.addEventListener("auth-session-expired", handleSessionExpired);
        return () => {
            window.removeEventListener("auth-session-expired", handleSessionExpired);
        };
    }, [navigate]);

    const signin = async (email: string, password: string) => {
        const response = await authService.signin(email, password);
        if (response.status === 'success' && response.data) {
            setUser(response.data.user);
        }
    };

    const signout = async () => {
        try {
            await authService.signout();
        } catch {
            // Ignore backend signout network failure
        } finally {
            setUser(null);
            toast.success('Berhasil keluar dari sistem.');
            navigate('/login', { replace: true });
        }
    };

    const updateUser = (updatedData: Partial<User>) => {
        const updatedUser = authService.setUser(updatedData);
        if (updatedUser) {
            setUser(updatedUser);
        }
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                isAuthenticated: !!user,
                signin,
                signout,
                updateUser,
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
