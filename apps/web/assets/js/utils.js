/**
 * UTILIDADES GENERALES
 */

import { DATE_FORMAT, UI_CONSTANTS } from './config.js';

/**
 * Formatea una fecha
 */
export const formatDate = (date, format = DATE_FORMAT.DISPLAY) => {
    if (!date) return '';
    
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    
    return format
        .replace('DD', day)
        .replace('MM', month)
        .replace('YYYY', year)
        .replace('HH', hours)
        .replace('mm', minutes);
};

/**
 * Debounce function
 */
export const debounce = (func, delay = UI_CONSTANTS.DEBOUNCE_DELAY) => {
    let timeoutId;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func(...args), delay);
    };
};

/**
 * Muestra una notificación toast
 */
export const showNotification = (message, type = 'info') => {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, UI_CONSTANTS.NOTIFICATION_DURATION);
};

/**
 * Valida un email
 */
export const isValidEmail = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
};

/**
 * Valida un formulario
 */
export const validateForm = (formElement) => {
    const inputs = formElement.querySelectorAll('input[required], select[required], textarea[required]');
    let isValid = true;
    
    inputs.forEach(input => {
        if (!input.value.trim()) {
            input.classList.add('error');
            isValid = false;
        } else {
            input.classList.remove('error');
        }
    });
    
    return isValid;
};

/**
 * Limpia un formulario
 */
export const clearForm = (formElement) => {
    formElement.reset();
    const inputs = formElement.querySelectorAll('.error');
    inputs.forEach(input => input.classList.remove('error'));
};

/**
 * Convierte un objeto a query string
 */
export const objectToQueryString = (obj) => {
    return Object.keys(obj)
        .filter(key => obj[key] !== null && obj[key] !== undefined && obj[key] !== '')
        .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(obj[key])}`)
        .join('&');
};

/**
 * Exporta datos a CSV
 */
export const exportToCSV = (data, filename = 'export.csv') => {
    if (!data || !data.length) return;
    
    const headers = Object.keys(data[0]);
    const csv = [
        headers.join(','),
        ...data.map(row => headers.map(header => JSON.stringify(row[header] || '')).join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
};

/**
 * Carga un componente HTML
 */
export const loadComponent = async (path) => {
    try {
        const response = await fetch(path);
        return await response.text();
    } catch (error) {
        console.error(`Error cargando componente: ${path}`, error);
        return '';
    }
};

/**
 * Renderiza un template con datos
 */
export const renderTemplate = (template, data) => {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
        return data[key] !== undefined ? data[key] : match;
    });
};

export default {
    formatDate,
    debounce,
    showNotification,
    isValidEmail,
    validateForm,
    clearForm,
    objectToQueryString,
    exportToCSV,
    loadComponent,
    renderTemplate
};
