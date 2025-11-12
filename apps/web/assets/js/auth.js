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
    // Primero limpiamos el localStorage inmediatamente
    localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER_DATA);
    
    // Intentamos notificar al servidor (pero no bloqueamos si falla)
    try {
        await api.logout();
    } catch (error) {
        console.error('Error al notificar logout al servidor:', error);
        // Ignoramos el error - la sesión local ya está cerrada
    }
    
    // Redirigimos al login (ruta relativa desde /pages/)
    window.location.href = '../index.html';
};

/**
 * Verifica autenticación y redirige si es necesario
 */
export const requireAuth = () => {
    if (!isAuthenticated()) {
        window.location.href = '../index.html';
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
                
                // Asegurar que tenemos el nombre completo
                if (!response.user.name && response.user.full_name) {
                    response.user.name = response.user.full_name;
                }
                
                // Guardar sesión
                saveSession(response.token, response.user);
                
                // Redirigir al dashboard según rol
                if (response.user.role === 'EncargadoTecnico' || response.user.role === 'technician') {
                    window.location.href = './pages/search-tech.html';
                } else if (response.user.role === 'Admin') {
                    // Redirigir a la página de admin (si existe)
                    // Por ahora va al dashboard normal
                    window.location.href = './pages/dashboard.html';
                } else {
                    // Estudiante, Docente y otros roles
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
