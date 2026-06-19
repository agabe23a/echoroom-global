import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // On startup, check if they already have a passport in their pocket
    useEffect(() => {
        const checkAuth = async () => {
            const token = localStorage.getItem('echo_token');
            if (token) {
                try {
                    const response = await api.get('/auth/me');
                    setUser(response.data);
                } catch (error) {
                    localStorage.removeItem('echo_token'); // Token expired or invalid
                }
            }
            setLoading(false);
        };
        checkAuth();
    }, []);

    const register = async (alias, passcode) => {
        const response = await api.post('/auth/register', { alias, passcode });
        return response.data;
    };

    const login = async (alias, passcode) => {
        // FastAPI OAuth2 requires form data, not JSON
        const formData = new URLSearchParams();
        formData.append('username', alias);
        formData.append('password', passcode);

        const response = await api.post('/auth/login', formData, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        
        localStorage.setItem('echo_token', response.data.access_token);
        
        // Fetch and set their profile
        const userRes = await api.get('/auth/me');
        setUser(userRes.data);
    };

    const logout = () => {
        localStorage.removeItem('echo_token');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, register, login, logout, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);