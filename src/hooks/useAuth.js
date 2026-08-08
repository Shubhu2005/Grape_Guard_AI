import { useCallback, useEffect, useState } from 'react';
import { unregisterCurrentToken } from '@/hooks/usePushNotifications';
const USER_STORAGE_KEY = 'user';
const TOKEN_STORAGE_KEY = 'access_token';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
const AUTH_CHANGE_EVENT = 'grapeguard-auth-changed';
const safeJson = async (response) => {
    try {
        return await response.json();
    }
    catch {
        return {};
    }
};
const clearSession = () => {
    localStorage.removeItem(USER_STORAGE_KEY);
    localStorage.removeItem(TOKEN_STORAGE_KEY);
};
const emitAuthChange = (user) => {
    window.dispatchEvent(new CustomEvent(AUTH_CHANGE_EVENT, { detail: user || null }));
};
export const useAuth = () => {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    useEffect(() => {
        const boot = async () => {
            const token = localStorage.getItem(TOKEN_STORAGE_KEY);
            const storedUser = localStorage.getItem(USER_STORAGE_KEY);
            if (storedUser) {
                try {
                    const parsed = JSON.parse(storedUser);
                    if (parsed?.id && (parsed.role === 'farmer' || parsed.role === 'expert')) {
                        setUser(parsed);
                        emitAuthChange(parsed);
                    }
                }
                catch {
                    localStorage.removeItem(USER_STORAGE_KEY);
                }
            }
            if (!token) {
                setIsLoading(false);
                return;
            }
            try {
                const response = await fetch(`${API_BASE_URL}/auth/me`, {
                    headers: { Authorization: `Bearer ${token}` },
                });

                if (!response.ok) {
                    // Only clear auth on explicit unauthorized/forbidden.
                    if (response.status === 401 || response.status === 403) {
                        clearSession();
                        setUser(null);
                    }
                    // For network hiccups or 5xx, keep local session so refresh doesn't kick user out.
                    setIsLoading(false);
                    return;
                }

                const payload = await safeJson(response);
                const normalizedUser = {
                    id: payload.user_id,
                    name: payload.full_name || 'User',
                    role: payload.role,
                };
                setUser(normalizedUser);
                localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(normalizedUser));
                emitAuthChange(normalizedUser);
            }
            catch {
                // Network failure: keep existing local session, just stop the spinner.
                setIsLoading(false);
                return;
            }
            finally {
                setIsLoading(false);
            }
        };
        boot();
    }, []);
    const login = useCallback(async (email, password, role) => {
        try {
            const response = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });
            const payload = await safeJson(response);
            if (!response.ok) {
                return { success: false, error: payload.detail || 'Login failed. Please try again.' };
            }
            if (payload.role !== role) {
                return {
                    success: false,
                    error: `Account belongs to ${payload.role}. Please select ${payload.role} login.`,
                };
            }
            const loggedInUser = {
                id: payload.user_id,
                name: payload.full_name || 'User',
                role: payload.role,
            };
            localStorage.setItem(TOKEN_STORAGE_KEY, payload.access_token);
            localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(loggedInUser));
            setUser(loggedInUser);
            emitAuthChange(loggedInUser);
            return { success: true };
        }
        catch {
            return { success: false, error: 'Unable to reach server. Check backend and CORS settings.' };
        }
    }, []);
    const register = useCallback(async (payload) => {
        if (payload.role !== 'farmer') {
            return { success: false, error: 'Only farmers can create accounts.' };
        }
        try {
            const response = await fetch(`${API_BASE_URL}/auth/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: payload.email,
                    password: payload.password,
                    full_name: payload.name,
                    role: payload.role,
                    phone: payload.phone,
                    location: payload.location,
                }),
            });
            const body = await safeJson(response);
            if (!response.ok) {
                return { success: false, error: body.detail || 'Signup failed. Please try again.' };
            }
            return { success: true };
        }
        catch {
            return { success: false, error: 'Unable to reach server. Check backend and CORS settings.' };
        }
    }, []);
    const logout = useCallback(async () => {
        await unregisterCurrentToken(localStorage.getItem(TOKEN_STORAGE_KEY));
        clearSession();
        sessionStorage.clear();
        setUser(null);
        emitAuthChange(null);
    }, []);
    const getAccessToken = useCallback(() => localStorage.getItem(TOKEN_STORAGE_KEY), []);
    return {
        user,
        isLoading,
        login,
        register,
        logout,
        getAccessToken,
    };
};
export { AUTH_CHANGE_EVENT };
