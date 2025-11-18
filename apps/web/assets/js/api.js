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

    async deleteNotification(id) {
        await simulateNetworkDelay();
        return { success: true, id };
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

        try {
            console.log(`API Request: ${options.method || 'GET'} ${url}`);
            const response = await fetch(url, config);
            
            let data;
            try {
                data = await response.json();
            } catch (e) {
                console.error('Error parsing JSON:', e);
                throw new Error('Respuesta inválida del servidor');
            }

            if (!response.ok) {
                console.error('API Error:', response.status, data);
                throw new Error(data.error || data.message || 'Error en la petición');
            }

            console.log('API Response:', data);
            return data;
        } catch (error) {
            console.error('Fetch Error:', error);
            if (error.message === 'Failed to fetch') {
                throw new Error('No se puede conectar al servidor. Verifica que esté corriendo en http://localhost:3000');
            }
            throw error;
        }
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
        const endpoint = `${API_CONFIG.ENDPOINTS.CANCEL_REQUEST.replace(':id', id)}/cancel`;
        return this.request(endpoint, {
            method: 'PUT'
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

    async deleteNotification(id) {
        const endpoint = API_CONFIG.ENDPOINTS.DELETE_NOTIFICATION.replace(':id', id);
        return this.request(endpoint, {
            method: 'DELETE'
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

    // Availability & Resources (Módulo 1.2)
    async getAvailabilitySlots(labId, params = {}) {
        const queryParams = new URLSearchParams(params);
        const endpoint = API_CONFIG.ENDPOINTS.AVAILABILITY_SLOTS.replace(':labId', labId);
        return this.request(`${endpoint}?${queryParams}`);
    }

    async createAvailabilitySlot(labId, slotData) {
        const endpoint = API_CONFIG.ENDPOINTS.AVAILABILITY_SLOTS.replace(':labId', labId);
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(slotData)
        });
    }

    async updateAvailabilitySlotStatus(slotId, status, userId) {
        const endpoint = API_CONFIG.ENDPOINTS.AVAILABILITY_SLOT_STATUS.replace(':id', slotId);
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify({ status, user_id: userId })
        });
    }

    async deleteAvailabilitySlot(slotId) {
        const endpoint = API_CONFIG.ENDPOINTS.AVAILABILITY_SLOT_DELETE.replace(':id', slotId);
        return this.request(endpoint, { method: 'DELETE' });
    }

    async getAvailabilitySubscriptions(userId) {
        return this.request(`${API_CONFIG.ENDPOINTS.AVAILABILITY_SUBSCRIPTIONS}?user_id=${userId}`);
    }

    async createAvailabilitySubscription(subscriptionData) {
        return this.request(API_CONFIG.ENDPOINTS.AVAILABILITY_SUBSCRIPTIONS, {
            method: 'POST',
            body: JSON.stringify(subscriptionData)
        });
    }

    async deleteAvailabilitySubscription(subscriptionId) {
        const endpoint = API_CONFIG.ENDPOINTS.AVAILABILITY_SUBSCRIPTION_DELETE.replace(':id', subscriptionId);
        return this.request(endpoint, { method: 'DELETE' });
    }

    async getAvailabilityChangelog(params = {}) {
        const queryParams = new URLSearchParams(params);
        return this.request(`${API_CONFIG.ENDPOINTS.AVAILABILITY_CHANGELOG}?${queryParams}`);
    }

    async getResources(params = {}) {
        const queryParams = new URLSearchParams(params);
        return this.request(`${API_CONFIG.ENDPOINTS.RESOURCES}?${queryParams}`);
    }

    async getResource(id) {
        const endpoint = API_CONFIG.ENDPOINTS.RESOURCE_DETAIL.replace(':id', id);
        return this.request(endpoint);
    }

    async createResource(resourceData) {
        return this.request(API_CONFIG.ENDPOINTS.RESOURCES, {
            method: 'POST',
            body: JSON.stringify(resourceData)
        });
    }

    async updateResource(id, resourceData) {
        const endpoint = API_CONFIG.ENDPOINTS.RESOURCE_DETAIL.replace(':id', id);
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(resourceData)
        });
    }

    async deleteResource(id) {
        const endpoint = API_CONFIG.ENDPOINTS.RESOURCE_DETAIL.replace(':id', id);
        return this.request(endpoint, { method: 'DELETE' });
    }

    async getResourceTypes() {
        return this.request(API_CONFIG.ENDPOINTS.RESOURCE_TYPES);
    }

}

/**
 * API UNIFICADA
 * Exporta la instancia correcta según configuración
 */
const api = USE_MOCK_DATA ? new MockAPI() : new RealAPI();

export default api;
