import api from '../js/api.js';
import { requireAuth, getCurrentUser, logout as authLogout } from '../js/auth.js';
import { showNotification } from '../js/utils.js';

requireAuth();
window.logout = authLogout;

const user = getCurrentUser();
if (user) document.getElementById('userName').textContent = user.name;

// ==================== DATOS ====================
let resources = [];
let labs = [];
let combined = [];

// Cargar datos mock
async function loadMaintenanceData() {
    try {
        resources = await api.searchResources();
        labs = await api.searchLabs();
        
        combined = [
            ...resources.map(r => ({
                id: r.id,
                type: 'resource',
                name: r.name,
                lab: r.lab_name,
                status: r.status
            })),
            ...labs.map(l => ({
                id: l.id,
                type: 'lab',
                name: l.name,
                lab: `${l.building} - ${l.room}`,
                status: l.status
            }))
        ];

        renderTable(combined);
    } catch (err) {
        console.error('Error cargando mantenimientos:', err);
        showNotification('Error al cargar los datos de mantenimiento', 'error');
    }
}

// ==================== RENDER ====================
function renderTable(data) {
    const tbody = document.getElementById('maintenanceTableBody');
    if (!data || data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center text-secondary">No hay elementos.</td></tr>`;
        return;
    }

    tbody.innerHTML = data.map(item => `
        <tr>
            <td>${item.type === 'lab' ? 'Laboratorio' : 'Recurso'}</td>
            <td>${item.name}</td>
            <td>${item.lab}</td>
            <td>
                <span class="badge ${getStatusBadge(item.status)}">${translateStatus(item.status)}</span>
            </td>
            <td>
                ${item.status === 'maintenance' 
                    ? `<button class="btn btn-sm btn-success" onclick="markAvailable('${item.type}', ${item.id})">Finalizar</button>`
                    : `<button class="btn btn-sm btn-warning" onclick="openModal('${item.type}', ${item.id})">Programar</button>`}
            </td>
        </tr>
    `).join('');
}

function translateStatus(status) {
    switch (status) {
        case 'available': return 'Disponible';
        case 'maintenance': return 'En Mantenimiento';
        case 'scheduled': return 'Agendado';
        default: return 'Desconocido';
    }
}

function getStatusBadge(status) {
    switch (status) {
        case 'available': return 'badge-success';
        case 'maintenance': return 'badge-warning';
        case 'scheduled': return 'badge-secondary';
        default: return 'badge-light';
    }
}

// ==================== MODAL ====================
const modal = document.getElementById('maintenanceModal');
const closeBtn = document.getElementById('closeModal');
const cancelBtn = document.getElementById('cancelModal');
const saveBtn = document.getElementById('saveMaintenance');

window.openModal = function(type, id) {
    modal.classList.add('show');
    document.getElementById('maintenanceType').value = type;
    document.getElementById('maintenanceId').value = id;
};

closeBtn.addEventListener('click', closeModal);
cancelBtn.addEventListener('click', closeModal);

function closeModal() {
    modal.classList.remove('show');
    document.getElementById('maintenanceForm').reset();
}

// Guardar mantenimiento
saveBtn.addEventListener('click', () => {
    const type = document.getElementById('maintenanceType').value;
    const id = parseInt(document.getElementById('maintenanceId').value);
    const start = new Date(document.getElementById('startDate').value);
    const end = new Date(document.getElementById('endDate').value);
    const desc = document.getElementById('description').value.trim();
    const now = new Date();

    if (!start || !end || !desc) {
        showNotification('Por favor completa todos los campos.', 'error');
        return;
    }

    const list = type === 'lab' ? labs : resources;
    const item = list.find(i => i.id === id);
    if (!item) return;

    // Determinar estado según hora actual
    item.status = now >= start ? 'maintenance' : 'scheduled';
    item.maintenanceInfo = { start, end, desc };

    // Reconstruir datos combinados
    rebuildCombined();

    showNotification(`${item.name} programado correctamente.`, 'success');
    renderTable(getCurrentFiltered());
    closeModal();
});

// ==================== ACCIONES ====================
window.markAvailable = function(type, id) {
    const list = type === 'lab' ? labs : resources;
    const item = list.find(i => i.id === id);
    if (!item) return;

    item.status = 'available';
    item.maintenanceInfo = null;

    // Reconstruir datos combinados
    rebuildCombined();

    showNotification(`${item.name} marcado como disponible`, 'success');
    renderTable(getCurrentFiltered());
};

// ==================== FILTROS ====================
function getCurrentFiltered() {
    const type = document.getElementById('filterType').value;
    const status = document.getElementById('filterStatus').value;
    const search = document.getElementById('filterSearch').value.toLowerCase();

    return combined.filter(item =>
        (type === '' || item.type === type) &&
        (status === '' || item.status === status) &&
        (item.name.toLowerCase().includes(search) || item.lab.toLowerCase().includes(search))
    );
}

document.getElementById('btnFilter').addEventListener('click', () => {
    const filtered = getCurrentFiltered();
    renderTable(filtered);
    showNotification(`${filtered.length} resultados encontrados`, 'info');
});

document.getElementById('btnClear').addEventListener('click', () => {
    document.getElementById('filterType').value = '';
    document.getElementById('filterStatus').value = '';
    document.getElementById('filterSearch').value = '';
    renderTable(combined);
    showNotification('Filtros limpiados', 'info');
});

function rebuildCombined() {
    combined = [
        ...resources.map(r => ({
            id: r.id,
            type: 'resource',
            name: r.name,
            lab: r.lab_name,
            status: r.status
        })),
        ...labs.map(l => ({
            id: l.id,
            type: 'lab',
            name: l.name,
            lab: `${l.building} - ${l.room}`,
            status: l.status
        }))
    ];
}

// ==================== INICIO ====================
loadMaintenanceData();
