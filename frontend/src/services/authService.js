import axios from 'axios';
import { PublicClientApplication } from '@azure/msal-browser';

export const API_BASE_URL = import.meta.env.VITE_API_URL;

// Azure AD configuration
const msalConfig = {
    auth: {
        clientId: import.meta.env.VITE_AZURE_CLIENT_ID || 'fb3e75a7-554f-41f8-9da3-2b162c255349',
        authority: `https://login.microsoftonline.com/${import.meta.env.VITE_AZURE_TENANT_ID || '534253fc-dfb6-462f-b5ca-cbe81939f5ee'}`,
        redirectUri: 'http://localhost:5173/callback'
    },
    cache: {
        cacheLocation: 'sessionStorage',
        storeAuthStateInCookie: false,
    }
};

const msalInstance = new PublicClientApplication(msalConfig);

// Initialize MSAL instance
let msalInitialized = false;
const initializeMsal = async () => {
    if (!msalInitialized) {
        await msalInstance.initialize();
        msalInitialized = true;
    }
};

export const authService = {
    login: async (userId, password, userType) => {
        try {
            const response = await axios.post(`${API_BASE_URL}/auth/login`, {
                userId,
                password,
                userType
            });

            if (response.data.token) {
                localStorage.setItem('token', response.data.token);
            }

            return response.data;
        } catch (error) {
            throw new Error(error.response?.data?.message || 'Login failed');
        }
    },

    azureLogin: async () => {
        try {
            // Initialize MSAL before using it
            await initializeMsal();

            const loginRequest = {
                scopes: ['https://graph.microsoft.com/User.Read'],
                prompt: 'select_account'
            };

            const loginResponse = await msalInstance.loginPopup(loginRequest);
            
            // Send the access token to backend for verification and user creation
            const response = await axios.post(`${API_BASE_URL}/auth/azure-login`, {
                accessToken: loginResponse.accessToken
            });

            if (response.data.token) {
                localStorage.setItem('token', response.data.token);
            }

            return response.data;
        } catch (error) {
            console.error('Azure login error:', error);
            throw new Error(error.response?.data?.message || 'Azure login failed');
        }
    },

    logout: async () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('role');
        
        try {
            // Initialize MSAL before using it
            await initializeMsal();
            await msalInstance.logoutPopup();
        } catch (error) {
            console.error('MSAL logout error:', error);
            // Continue with logout even if MSAL logout fails
        }
    },

    getToken: () => {
        return localStorage.getItem('token');
    }
};
