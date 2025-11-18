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
    BASE_URL: 'http://localhost:8080/api',
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
        EXPORT_EXCEL: '/reports/export/excel',
        
        // Labs Management (Módulo 1.1)
        LABS: '/labs',
        LAB_DETAIL: '/labs/:id',
        LAB_CONTACTS: '/labs/:id/contacts',
        LAB_POLICIES: '/labs/:id/policies',
        LAB_HOURS: '/labs/:id/hours',
        LAB_FIXED_RESOURCES: '/labs/:id/resources-fixed',
        LAB_CONSUMABLES: '/labs/:id/consumables',
        LAB_HISTORY: '/labs/:id/history',
        DEPARTMENTS: '/departments',
        
        // Availability & Resources (Módulo 1.2)
        AVAILABILITY_SLOTS: '/availability/labs/:labId/slots',
        AVAILABILITY_SLOT_STATUS: '/availability/slots/:id/status',
        AVAILABILITY_SLOT_DELETE: '/availability/slots/:id',
        AVAILABILITY_SUBSCRIPTIONS: '/availability/subscriptions',
        AVAILABILITY_SUBSCRIPTION_DELETE: '/availability/subscriptions/:id',
        AVAILABILITY_CHANGELOG: '/availability/changelog',
        RESOURCES: '/resources',
        RESOURCE_DETAIL: '/resources/:id',
        RESOURCE_TYPES: '/resource-types',


        // Administration
        ADMINISTRATION: '/admin', 
        USERS: '/admin/users',
        UPDATE_USER: '/admin/users/:id',
        CREATE_USER: '/admin/users',

        // Settings
        SETTINGS : '/admin/settings',
        UPDATE_SETTING : '/admin/settings/:key',
        UPDATEMANY_SETTINGS : '/admin/updateManySettings',

        // Audit
        AUDIT_LOG: '/admin/audit',
        INSERT_AUDIT_LOG: '/admin/audit'

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
