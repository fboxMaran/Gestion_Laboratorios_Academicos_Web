/**
 * CAPA DE ABSTRACCIÓN DE API
 * 
 * Este archivo gestiona TODA la comunicación con datos.
 * Automáticamente usa mock data o API real según config.js
 */

import { USE_MOCK_DATA, API_CONFIG, STORAGE_KEYS } from './config.js';

/**
 * Simula delay de red para hacer el mock más realista
 */
const simulateNetworkDelay = (ms = 500) => {
    return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Obtiene el token de autenticación
 */
const getAuthToken = () => {
    return localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
};

/**
 * Headers comunes para las peticiones
 */
const getHeaders = () => {
    const headers = {
        'Content-Type': 'application/json'
    };
    
    const token = getAuthToken();
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    return headers;
};

/**
 * API MOCK - Carga datos desde archivos JSON locales
 */
class MockAPI {
    async loadMockData(filename) {
        // Detectar si estamos en la raíz o en una subcarpeta
        const basePath = window.location.pathname.includes('/pages/') 
            ? '../assets/data/mock/' 
            : './assets/data/mock/';
        
        const response = await fetch(`${basePath}${filename}.json`);
        if (!response.ok) {
            throw new Error(`Error cargando datos mock: ${filename}`);
        }
        return response.json();
    }

    // Auth
    async login(credentials) {
        await simulateNetworkDelay();
        const users = await this.loadMockData('users');
        const user = users.find(u => 
            u.email === credentials.email && 
            u.password === credentials.password
        );
        
        if (!user) {
            throw new Error('Credenciales inválidas');
        }
        
        return {
            token: 'mock-jwt-token-' + Date.now(),
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                department: user.department
            }
        };
    }

    async logout() {
        await simulateNetworkDelay(200);
        return { success: true };
    }

    // Profile
    async getProfile() {
        await simulateNetworkDelay();

        const userData = JSON.parse(localStorage.getItem('user_data'));
        if (userData && userData.role === 'technician') {
            return this.loadMockData('profile_technician');
        } else {
            return this.loadMockData('profile');
        }
    }


    async updateProfile(data) {
        await simulateNetworkDelay();
        return { success: true, data };
    }

    // Search
    async searchLabs(filters = {}) {
        await simulateNetworkDelay();
        let labs = await this.loadMockData('labs');
        
        // Aplicar filtros si existen
        if (filters.category) {
            labs = labs.filter(lab => lab.category === filters.category);
        }
        if (filters.search) {
            const searchLower = filters.search.toLowerCase();
            labs = labs.filter(lab => 
                lab.name.toLowerCase().includes(searchLower) ||
                lab.description.toLowerCase().includes(searchLower)
            );
        }
        
        return labs;
    }

    async searchResources(filters = {}) {
        await simulateNetworkDelay();
        return this.loadMockData('resources');
    }

    async getLabDetails(id) {
        await simulateNetworkDelay();
        const labs = await this.loadMockData('labs');
        return labs.find(lab => lab.id === parseInt(id));
    }

    // Requests
    async getRequests() {
        await simulateNetworkDelay();
        return this.loadMockData('requests');
    }

    async createRequest(requestData) {
        await simulateNetworkDelay();
        return {
            success: true,
            request: {
                id: Date.now(),
                ...requestData,
                status: 'pending',
                created_at: new Date().toISOString()
            }
        };
    }

    async cancelRequest(id) {
        await simulateNetworkDelay();
        return { success: true, id };
    }

    // History
    async getHistory(filters = {}) {
        await simulateNetworkDelay();
        return this.loadMockData('history');
    }

    // Notifications
    async getNotifications() {
        await simulateNetworkDelay();
        return this.loadMockData('notifications');
    }

    async markAsRead(id) {
        await simulateNetworkDelay();
        return { success: true, id };
    }

    async markAllAsRead() {
        await simulateNetworkDelay();
        return { success: true };
    }

    async getInventory() {
        await simulateNetworkDelay();
        return this.loadMockData('resources');
    }

    // Reports
    async getReports() {
        await simulateNetworkDelay();
        return this.loadMockData('reports');
    }

    async exportReport(format = 'pdf') {
        await simulateNetworkDelay(400);
        return { success: true, message: `Exportación ${format.toUpperCase()} simulada.` };
    }

}


/**
 * API REAL - Hace peticiones HTTP al backend
 */
class RealAPI {
    async request(endpoint, options = {}) {
        const url = `${API_CONFIG.BASE_URL}${endpoint}`;
        const config = {
            ...options,
            headers: {
                ...getHeaders(),
                ...options.headers
            }
        };

        const response = await fetch(url, config);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Error en la petición');
        }

        return data;
    }

    // Auth
    async login(credentials) {
        return this.request(API_CONFIG.ENDPOINTS.LOGIN, {
            method: 'POST',
            body: JSON.stringify(credentials)
        });
    }

    async logout() {
        return this.request(API_CONFIG.ENDPOINTS.LOGOUT, {
            method: 'POST'
        });
    }

    // Profile
    async getProfile() {
        return this.request(API_CONFIG.ENDPOINTS.PROFILE);
    }

    async updateProfile(data) {
        return this.request(API_CONFIG.ENDPOINTS.UPDATE_PROFILE, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    // Search
    async searchLabs(filters = {}) {
        const params = new URLSearchParams(filters);
        return this.request(`${API_CONFIG.ENDPOINTS.SEARCH_LABS}?${params}`);
    }

    async searchResources(filters = {}) {
        const params = new URLSearchParams(filters);
        return this.request(`${API_CONFIG.ENDPOINTS.SEARCH_RESOURCES}?${params}`);
    }

    async getLabDetails(id) {
        const endpoint = API_CONFIG.ENDPOINTS.LAB_DETAILS.replace(':id', id);
        return this.request(endpoint);
    }

    // Requests
    async getRequests() {
        return this.request(API_CONFIG.ENDPOINTS.REQUESTS);
    }

    async getInventory() {
        return this.request(API_CONFIG.ENDPOINTS.INVENTORY);
    }


    async createRequest(requestData) {
        return this.request(API_CONFIG.ENDPOINTS.CREATE_REQUEST, {
            method: 'POST',
            body: JSON.stringify(requestData)
        });
    }

    async cancelRequest(id) {
        const endpoint = API_CONFIG.ENDPOINTS.CANCEL_REQUEST.replace(':id', id);
        return this.request(endpoint, {
            method: 'POST'
        });
    }

    // History
    async getHistory(filters = {}) {
        const params = new URLSearchParams(filters);
        return this.request(`${API_CONFIG.ENDPOINTS.HISTORY}?${params}`);
    }

    // Notifications
    async getNotifications() {
        return this.request(API_CONFIG.ENDPOINTS.NOTIFICATIONS);
    }

    async markAsRead(id) {
        const endpoint = API_CONFIG.ENDPOINTS.MARK_READ.replace(':id', id);
        return this.request(endpoint, {
            method: 'POST'
        });
    }

    async markAllAsRead() {
        return this.request(API_CONFIG.ENDPOINTS.MARK_ALL_READ, {
            method: 'POST'
        });
    }

    // Reports
    async getReports() {
        return this.request(API_CONFIG.ENDPOINTS.REPORTS);
    }

    async exportReport(format = 'pdf') {
        const endpoint = format === 'excel' 
            ? API_CONFIG.ENDPOINTS.EXPORT_EXCEL 
            : API_CONFIG.ENDPOINTS.EXPORT_PDF;
        return this.request(endpoint, { method: 'GET' });
    }

}

/**
 * API UNIFICADA
 * Exporta la instancia correcta según configuración
 */
const api = USE_MOCK_DATA ? new MockAPI() : new RealAPI();

export default api;
