import api from '../js/api.js';
import { requireAuth, getCurrentUser, logout as authLogout } from '../js/auth.js';
// Verificar autenticación
requireAuth();

// Hacer logout disponible globalmente
window.logout = authLogout;

// Mostrar nombre del técnico
const user = getCurrentUser();
if (user) {
    document.getElementById('userName').textContent = user.name;
}

const tableBody = document.getElementById('requestsTableBody');
const filterUser = document.getElementById('filterUser');
const filterDate = document.getElementById('filterDate');
const filterStatus = document.getElementById('filterStatus');
const btnFilter = document.getElementById('btnFilter');
const btnClear = document.getElementById('btnClear');

let requests = [];

// 🔹 Cargar todas las solicitudes desde el mock
async function loadRequests() {
    try {
        requests = await api.getRequests();
        console.log('Solicitudes cargadas:', requests);
        renderTable(requests);
    } catch (error) {
        console.error('Error al cargar solicitudes:', error);
        tableBody.innerHTML = `
            <tr><td colspan="6" class="text-center text-error">
                Error al cargar solicitudes
            </td></tr>`;
    }
}

// 🔹 Renderizar tabla
function renderTable(data) {
    tableBody.innerHTML = '';

    if (!data.length) {
        tableBody.innerHTML = `<tr><td colspan="6" class="text-center text-secondary">No hay solicitudes</td></tr>`;
        return;
    }

    data.forEach(req => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${req.approved_by || '—'}</td>
            <td>${req.resource_name}</td>
            <td>${req.lab_name}</td>
            <td>${req.date_from}</td>
            <td><span class="badge ${getStatusClass(req.status)}">${formatStatus(req.status)}</span></td>
            <td>${getActionButtons(req)}</td>
        `;
        tableBody.appendChild(row);
    });
}

// 🔹 Filtrar
btnFilter.addEventListener('click', () => {
    const userValue = filterUser.value.toLowerCase();
    const dateValue = filterDate.value;
    const statusValue = filterStatus.value;

    const filtered = requests.filter(r => {
        const matchUser = userValue
            ? (r.approved_by?.toLowerCase().includes(userValue) || r.lab_name.toLowerCase().includes(userValue))
            : true;
        const matchDate = dateValue ? r.date_from === dateValue : true;
        const matchStatus = statusValue ? r.status === statusValue : true;
        return matchUser && matchDate && matchStatus;
    });

    renderTable(filtered);
});

// 🔹 Limpiar filtros
btnClear.addEventListener('click', () => {
    filterUser.value = '';
    filterDate.value = '';
    filterStatus.value = '';
    renderTable(requests);
});

// 🔹 Actualizar estado (simulado)
function updateStatus(id, newStatus) {
    const req = requests.find(r => r.id == id);
    if (!req) return;
    req.status = newStatus;
    renderTable(requests);
    alert(`Solicitud #${id} actualizada a "${formatStatus(newStatus)}"`);
}

// 🔹 Botones según estado
function getActionButtons(req) {
    const id = req.id;
    switch (req.status) {
        case 'pending':
            return `
                <button class="btn btn-sm btn-success" onclick="updateStatus(${id}, 'approved')">Aprobar</button>
                <button class="btn btn-sm btn-error" onclick="updateStatus(${id}, 'rejected')">Rechazar</button>`;
        case 'approved':
            return `<button class="btn btn-sm btn-primary" onclick="updateStatus(${id}, 'delivered')">Registrar Entrega</button>`;
        case 'delivered':
            return `<button class="btn btn-sm btn-outline" onclick="updateStatus(${id}, 'returned')">Registrar Devolución</button>`;
        default:
            return '<span class="text-secondary">—</span>';
    }
}

// 🔹 Etiquetas de estado
function getStatusClass(status) {
    switch (status) {
        case 'pending': return 'badge-warning';
        case 'approved': return 'badge-success';
        case 'rejected': return 'badge-error';
        case 'delivered': return 'badge-info';
        case 'returned': return 'badge-secondary';
        default: return 'badge-light';
    }
}

function formatStatus(status) {
    const map = {
        pending: 'Pendiente',
        approved: 'Aprobada',
        rejected: 'Rechazada',
        delivered: 'Entregada',
        returned: 'Devuelta',
        completed: 'Completada',
        cancelled: 'Cancelada'
    };
    return map[status] || status;
}

// Hacer la función accesible globalmente para onclicks
window.updateStatus = updateStatus;

// Inicializar
loadRequests();    
