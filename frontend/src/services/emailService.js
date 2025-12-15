import axios from 'axios';
export const API_BASE_URL = import.meta.env.VITE_API_URL; 

export const emailSent = async (emailData) => {
    try {
        const response = await axios.post(`${API_BASE_URL}/email/send-email`, emailData);
        return response;
    } catch (error) {
        throw new Error(error.response?.data?.message || 'Failed to create status');
    }
};

