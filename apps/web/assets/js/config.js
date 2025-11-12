/**
 * CONFIGURACIÓN GLOBAL
 * 
 * Este archivo centraliza toda la configuración.
 * Para cambiar de mock a API real, solo cambia USE_MOCK_DATA a false
 */

// MODO DE OPERACIÓN
export const USE_MOCK_DATA = false; // ✅ Cambiado a false para usar API real

// URLS DEL API
export const API_CONFIG = {
    BASE_URL: 'http://localhost:3000/api',
    ENDPOINTS: {
        // Auth
        LOGIN: '/auth/login',
        LOGOUT: '/auth/logout',
        REGISTER: '/auth/register',
        
        // User Profile
        PROFILE: '/users/me',
        UPDATE_PROFILE: '/users/me',
        
        // Search & Browse
        SEARCH_LABS: '/browse/labs',
        SEARCH_RESOURCES: '/browse/resources',
        LAB_DETAILS: '/labs/:id',
        RESOURCE_DETAILS: '/resources/:id',
        
        // Requests
        REQUESTS: '/requests',
        CREATE_REQUEST: '/requests',
        REQUEST_DETAILS: '/requests/:id',
        CANCEL_REQUEST: '/requests/:id',
        
        // History
        HISTORY: '/users/me/history',
        TRAININGS: '/users/me/trainings',
        LAB_REQUIREMENTS: '/users/me/lab-requirements',
        
        // Notifications
        NOTIFICATIONS: '/notifications',
        MARK_READ: '/notifications/:id/seen',
        MARK_ALL_READ: '/notifications/mark-all-seen',
        DELETE_NOTIFICATION: '/notifications/:id',

        // Inventory
        INVENTORY: '/inventory',

        // Reports
        REPORTS: '/reports',
        EXPORT_PDF: '/reports/export/pdf',
        EXPORT_EXCEL: '/reports/export/excel'

    }
};

// RUTAS DE DATOS MOCK (archivos locales)
export const MOCK_DATA_PATH = './assets/data/mock/';

// STORAGE KEYS
export const STORAGE_KEYS = {
    AUTH_TOKEN: 'auth_token',
    USER_DATA: 'user_data',
    THEME: 'theme_preference'
};

// FORMATO DE FECHAS
export const DATE_FORMAT = {
    DISPLAY: 'DD/MM/YYYY',
    API: 'YYYY-MM-DD',
    DATETIME: 'DD/MM/YYYY HH:mm'
};

// CONSTANTES UI
export const UI_CONSTANTS = {
    NOTIFICATION_DURATION: 3000,
    DEBOUNCE_DELAY: 300,
    ITEMS_PER_PAGE: 10,
    MAX_FILE_SIZE: 5 * 1024 * 1024 // 5MB
};

// ESTADOS DE SOLICITUDES
export const REQUEST_STATUS = {
    PENDING: 'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected',
    CANCELLED: 'cancelled',
    COMPLETED: 'completed'
};

// TIPOS DE NOTIFICACIONES
export const NOTIFICATION_TYPES = {
    INFO: 'info',
    SUCCESS: 'success',
    WARNING: 'warning',
    ERROR: 'error'
};

export default {
    USE_MOCK_DATA,
    API_CONFIG,
    MOCK_DATA_PATH,
    STORAGE_KEYS,
    DATE_FORMAT,
    UI_CONSTANTS,
    REQUEST_STATUS,
    NOTIFICATION_TYPES
};
