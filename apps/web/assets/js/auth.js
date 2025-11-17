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
 * Muestra un mensaje de error visual
 */
const showError = (message) => {
    const errorDiv = document.getElementById('loginError');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        
        // Auto-ocultar después de 5 segundos
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 5000);
    }
};

/**
 * Oculta el mensaje de error
 */
const hideError = () => {
    const errorDiv = document.getElementById('loginError');
    if (errorDiv) {
        errorDiv.style.display = 'none';
    }
};

/**
 * Configura mensajes de validación HTML5 en español
 */
const setupValidationMessages = () => {
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    
    if (emailInput) {
        emailInput.addEventListener('invalid', (e) => {
            if (emailInput.validity.valueMissing) {
                emailInput.setCustomValidity('Por favor, ingresa tu correo institucional');
            } else if (emailInput.validity.typeMismatch || emailInput.validity.patternMismatch) {
                emailInput.setCustomValidity('Por favor, ingresa un correo válido. Ejemplo: correo@estudiantec.cr');
            } else {
                emailInput.setCustomValidity('');
            }
            emailInput.reportValidity();
        });
        
        emailInput.addEventListener('input', () => {
            emailInput.setCustomValidity('');
        });
    }
    
    if (passwordInput) {
        passwordInput.addEventListener('invalid', (e) => {
            if (passwordInput.validity.valueMissing) {
                passwordInput.setCustomValidity('Por favor, ingresa tu contraseña');
            } else if (passwordInput.validity.tooShort) {
                passwordInput.setCustomValidity('La contraseña debe tener al menos 6 caracteres');
            } else {
                passwordInput.setCustomValidity('');
            }
            passwordInput.reportValidity();
        });
        
        passwordInput.addEventListener('input', () => {
            passwordInput.setCustomValidity('');
        });
    }
};

/**
 * Maneja el formulario de login
 */
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    
    // Configurar mensajes de validación en español
    setupValidationMessages();
    
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const submitBtn = loginForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            
            // Ocultar mensajes de error previos
            hideError();
            
            try {
                // UI feedback
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<span class="loading"></span> Iniciando sesión...';
                
                // Obtener credenciales
                const credentials = {
                    email: document.getElementById('email').value.trim(),
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
                const role = response.user.role;
                console.log(role);
                // Mapeo de roles según la base de datos:
                // 1: Estudiante, 2: Docente, 3: EncargadoTecnico, 4: Admin
                if (role === 'technician') {
                    // Técnicos van a su página especializada
                    window.location.href = './pages/search-tech.html';
                } else if (role === 'Admin') {
                    // Administradores van al dashboard (o página específica de admin si existe)
                    window.location.href = './pages/dashboard.html';
                } else if (role === 'Docente') {
                    // Docentes van al dashboard
                    window.location.href = './pages/dashboard.html';
                } else if (role === 'Estudiante') {
                    // Estudiantes van al dashboard
                    window.location.href = './pages/dashboard.html';
                } else {
                    // Fallback para cualquier otro rol
                    window.location.href = './pages/dashboard.html';
                }
                
            } catch (error) {
                // Mostrar error visual elegante
                let errorMessage = 'Error al iniciar sesión';
                
                if (error.message.includes('Credenciales inválidas')) {
                    errorMessage = '❌ Correo o contraseña incorrectos';
                } else if (error.message.includes('conectar al servidor')) {
                    errorMessage = '🔌 No se puede conectar al servidor. Verifica que esté corriendo.';
                } else if (error.message.includes('institucional')) {
                    errorMessage = '📧 Debes usar un correo institucional (@estudiantec.cr, @tec.ac.cr o @itcr.ac.cr)';
                } else {
                    errorMessage = '❌ ' + error.message;
                }
                
                showError(errorMessage);
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
        });
    }
});
