// Script base del módulo técnico

import { requireAuth, getCurrentUser, logout as authLogout } from '../assets/js/auth.js';
import { showNotification } from '../assets/js/utils.js';

// Autenticación
requireAuth();
window.logout = authLogout;

// Mostrar nombre del usuario actual
const user = getCurrentUser();
if (user) {
    document.getElementById('userName').textContent = user.name;
}

// Referencias de elementos
const btnFilter = document.getElementById('btnFilter');
const btnClear = document.getElementById('btnClear');
const tableBody = document.getElementById('requestsTableBody');

// Eventos base
btnFilter.addEventListener('click', () => {
    showNotification('Filtros aplicados (sin funcionalidad aún)', 'info');
});

btnClear.addEventListener('click', () => {
    document.getElementById('filterUser').value = '';
    document.getElementById('filterDate').value = '';
    document.getElementById('filterStatus').value = '';
    showNotification('Filtros limpiados', 'info');
});

// Cargar solicitudes (más adelante se conectará con la API)
function loadRequests() {
    tableBody.innerHTML = `
        <tr>
            <td colspan="6" class="text-center text-secondary">
                Aquí se mostrarán las solicitudes aprobadas del laboratorio.
            </td>
        </tr>
    `;
}

loadRequests();
