import axios from 'axios';

export const API_BASE_URL = import.meta.env.VITE_API_URL; 

export const getItemForReceiver = async () => {
    try {
        const response = await axios.get(`${API_BASE_URL}/reicept/`);
        return response.data;
    } catch (error) {
        if (error.response?.status === 404) {
            throw new Error('Receiver not found');
        }
        throw new Error('Failed to search receiver');
    }
};
