import axios from 'axios';

// Point this to your running FastAPI server
const API_URL = 'http://localhost:5005/api';

const api = axios.create({
    baseURL: API_URL,
});

// The Interceptor: Automatically injects the JWT passport into every request
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('echo_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

export default api;