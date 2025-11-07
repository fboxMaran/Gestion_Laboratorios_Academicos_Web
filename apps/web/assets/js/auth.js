/**
 * GESTIÓN DE AUTENTICACIÓN
 */

import { STORAGE_KEYS } from './config.js';
import api from './api.js';

/**
 * Guarda la sesión del usuario
 */
export const saveSession = (token, userData) => {
    localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
    localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
};

/**
 * Obtiene los datos del usuario actual
 */
export const getCurrentUser = () => {
    const userData = localStorage.getItem(STORAGE_KEYS.USER_DATA);
    return userData ? JSON.parse(userData) : null;
};

/**
 * Verifica si hay una sesión activa
 */
export const isAuthenticated = () => {
    return localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN) !== null;
};

/**
 * Cierra la sesión
 */
export const logout = async () => {
    try {
        await api.logout();
    } catch (error) {
        console.error('Error al cerrar sesión:', error);
    } finally {
        localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
        localStorage.removeItem(STORAGE_KEYS.USER_DATA);
        window.location.href = '/index.html';
    }
};

/**
 * Verifica autenticación y redirige si es necesario
 */
export const requireAuth = () => {
    if (!isAuthenticated()) {
        window.location.href = '/index.html';
        return false;
    }
    return true;
};

/**
 * Maneja el formulario de login
 */
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const submitBtn = loginForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            
            try {
                // UI feedback
                submitBtn.disabled = true;
                submitBtn.textContent = 'Iniciando sesión...';
                
                // Obtener credenciales
                const credentials = {
                    email: document.getElementById('email').value,
                    password: document.getElementById('password').value
                };
                
                // Llamar al API
                const response = await api.login(credentials);
                
                // Guardar sesión
                saveSession(response.token, response.user);
                
                // Redirigir al dashboard
                // Redirigir al dashboard según rol
                if (response.user.role === 'technician') {
                    window.location.href = './pages/search-tech.html';
                } else {
                    window.location.href = './pages/dashboard.html';
                }

                
            } catch (error) {
                alert('Error al iniciar sesión: ' + error.message);
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
        });
    }
});
