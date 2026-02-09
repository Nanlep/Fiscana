/**
 * Auth Context for React
 * Provides authentication state and methods throughout the app
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { authApi, User, clearTokens, isAuthenticated as checkAuth, setTokens } from '../services/apiClient';

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;
    login: (email: string, password: string) => Promise<boolean>;
    signup: (data: SignupData) => Promise<boolean>;
    logout: () => Promise<void>;
    updateProfile: (data: Partial<User>) => Promise<boolean>;
    refreshUser: () => Promise<void>;
    clearError: () => void;
}

interface SignupData {
    email: string;
    password: string;
    name: string;
    type?: 'INDIVIDUAL' | 'CORPORATE';
    companyName?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Check authentication on mount
    useEffect(() => {
        const initAuth = async () => {
            if (checkAuth()) {
                try {
                    const response = await authApi.getProfile();
                    if (response.success && response.data) {
                        setUser(response.data);
                    } else {
                        clearTokens();
                    }
                } catch {
                    clearTokens();
                }
            }
            setIsLoading(false);
        };

        initAuth();

        // Listen for logout events from API client (token refresh failure)
        const handleLogout = () => {
            setUser(null);
            clearTokens();
        };

        window.addEventListener('auth:logout', handleLogout);
        return () => window.removeEventListener('auth:logout', handleLogout);
    }, []);

    const login = useCallback(async (email: string, password: string): Promise<boolean> => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await authApi.login(email, password);

            if (response.success && response.data) {
                setUser(response.data.user);
                setIsLoading(false);
                return true;
            } else {
                setError(response.error || 'Login failed');
                setIsLoading(false);
                return false;
            }
        } catch (err) {
            setError('Login failed. Please try again.');
            setIsLoading(false);
            return false;
        }
    }, []);

    const signup = useCallback(async (data: SignupData): Promise<boolean> => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await authApi.signup(data);

            if (response.success && response.data) {
                setUser(response.data.user);
                setIsLoading(false);
                return true;
            } else {
                setError(response.error || 'Signup failed');
                setIsLoading(false);
                return false;
            }
        } catch (err) {
            setError('Signup failed. Please try again.');
            setIsLoading(false);
            return false;
        }
    }, []);

    const logout = useCallback(async (): Promise<void> => {
        try {
            await authApi.logout();
        } finally {
            setUser(null);
            clearTokens();
        }
    }, []);

    const updateProfile = useCallback(async (data: Partial<User>): Promise<boolean> => {
        try {
            const response = await authApi.updateProfile(data);
            if (response.success && response.data) {
                setUser(response.data);
                return true;
            }
            setError(response.error || 'Update failed');
            return false;
        } catch {
            setError('Update failed. Please try again.');
            return false;
        }
    }, []);

    const refreshUser = useCallback(async (): Promise<void> => {
        try {
            const response = await authApi.getProfile();
            if (response.success && response.data) {
                setUser(response.data);
            }
        } catch {
            // Silently fail refresh
        }
    }, []);

    const clearError = useCallback(() => {
        setError(null);
    }, []);

    const value: AuthContextType = {
        user,
        isAuthenticated: !!user,
        isLoading,
        error,
        login,
        signup,
        logout,
        updateProfile,
        refreshUser,
        clearError
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthContext;
