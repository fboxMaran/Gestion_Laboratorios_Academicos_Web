import api from '../js/api.js';
import { requireAuth, getCurrentUser, logout as authLogout } from '../js/auth.js';
import { showNotification } from '../js/utils.js';

// ==================== SESIÓN ====================
requireAuth();
window.logout = authLogout;

const user = getCurrentUser();
if (user) {
    document.getElementById('userName').textContent = user.name;
}

// ==================== INVENTARIO ====================
let resources = [];

// Cargar inventario desde el mock (usa api.searchResources() → resources.json)
async function loadInventory() {
    try {
        resources = await api.searchResources();
        console.log('Inventario cargado:', resources);

        populateFilterOptions(resources); // <-- rellenar selects dinámicamente
        renderInventory(resources);
    } catch (error) {
        console.error('Error al cargar inventario:', error);
        const tbody = document.getElementById('inventoryTableBody');
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-error">Error al cargar inventario</td></tr>`;
    }
}

// Renderizar tabla de inventario con imagen, descripción y cantidad
function renderInventory(data) {
    const tbody = document.getElementById('inventoryTableBody');
    if (!data || data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-secondary">No se encontraron recursos.</td></tr>`;
        return;
    }

    tbody.innerHTML = data.map(item => `
        <tr>
            <td style="display:flex; align-items:center; gap:10px;">
                <img src="${item.image}" alt="${item.name}" width="60" height="45" style="border-radius:6px; object-fit:cover;">
                <div>
                    <strong>${item.name}</strong><br>
                    <small class="text-secondary">${item.description}</small>
                </div>
            </td>
            <td>${item.category}</td>
            <td>${item.lab_name}</td>
            <td>${item.quantity_available} / ${item.quantity_total}</td>
            <td><span class="badge ${getStatusClass(item.status)}">${translateStatus(item.status)}</span></td>
            <td>
                <button class="btn btn-sm btn-outline" onclick="showDetails(${item.id})">Detalles</button>
                <button class="btn btn-sm btn-error" onclick="deleteItem(${item.id})">Eliminar</button>
            </td>
        </tr>
    `).join('');
}

// ==================== UTILIDADES ====================
function translateStatus(status) {
    switch (status) {
        case 'available': return 'Disponible';
        case 'maintenance': return 'Mantenimiento';
        case 'reserved': return 'Reservado';
        case 'out': return 'Agotado';
        default: return 'Desconocido';
    }
}

function getStatusClass(status) {
    switch (status) {
        case 'available': return 'badge-success';
        case 'maintenance': return 'badge-warning';
        case 'reserved': return 'badge-info';
        case 'out': return 'badge-error';
        default: return 'badge-light';
    }
}

// ==================== FILTROS DINÁMICOS ====================
function populateFilterOptions(data) {
    const catSelect = document.getElementById('filterCategory');
    const statusSelect = document.getElementById('filterStatus');

    // Guardar valores únicos
    const categories = Array.from(new Set(data.map(i => (i.category || '').trim()))).filter(Boolean);
    const statuses = Array.from(new Set(data.map(i => (i.status || '').trim()))).filter(Boolean);

    // Limpiar (mantener la opción "Todas"/"Todos")
    // Si tus selects ya incluyen una opción por defecto con value "", la dejamos y agregamos después.
    // Primero quitamos todas las opciones excepto la primera:
    while (catSelect.options.length > 1) catSelect.remove(1);
    while (statusSelect.options.length > 1) statusSelect.remove(1);

    // Añadir categorías ordenadas alfabéticamente
    categories.sort((a,b) => a.localeCompare(b, 'es')).forEach(c => {
        const opt = document.createElement('option');
        opt.value = c;
        opt.textContent = c;
        catSelect.appendChild(opt);
    });

    // Añadir estados (traducción opcional en label)
    // Mapa para mostrar etiqueta amigable (puedes expandir si hay más estados)
    const statusLabel = {
        available: 'Disponible',
        maintenance: 'Mantenimiento',
        reserved: 'Reservado',
        out: 'Agotado'
    };

    statuses.sort((a,b) => a.localeCompare(b, 'es')).forEach(s => {
        const opt = document.createElement('option');
        opt.value = s;
        opt.textContent = statusLabel[s] || s;
        statusSelect.appendChild(opt);
    });
}

// ==================== FILTRADO (robusto, case-insensitive) ====================
document.getElementById('btnFilter').addEventListener('click', () => {
    const categoryRaw = document.getElementById('filterCategory').value;
    const statusRaw = document.getElementById('filterStatus').value;
    const searchRaw = document.getElementById('filterSearch').value;

    const category = (categoryRaw || '').toString().trim().toLowerCase();
    const status = (statusRaw || '').toString().trim().toLowerCase();
    const search = (searchRaw || '').toString().trim().toLowerCase();

    const filtered = resources.filter(item => {
        const itemCategory = (item.category || '').toString().trim().toLowerCase();
        const itemStatus = (item.status || '').toString().trim().toLowerCase();
        const itemName = (item.name || '').toString().toLowerCase();
        const itemLab = (item.lab_name || '').toString().toLowerCase();

        const matchesCategory = category === '' || itemCategory === category;
        const matchesStatus = status === '' || itemStatus === status;
        const matchesSearch = search === '' || itemName.includes(search) || itemLab.includes(search);

        return matchesCategory && matchesStatus && matchesSearch;
    });

    renderInventory(filtered);
    showNotification(`${filtered.length} resultados encontrados`, 'info');
});

document.getElementById('btnClear').addEventListener('click', () => {
    document.getElementById('filterCategory').value = '';
    document.getElementById('filterStatus').value = '';
    document.getElementById('filterSearch').value = '';
    renderInventory(resources);
    showNotification('Filtros limpiados', 'info');
});

// ==================== ACCIONES (mock) ====================
window.showDetails = function(id) {
    const item = resources.find(i => i.id === id);
    if (!item) return;

    const specs = Object.entries(item.technical_specs || {})
        .map(([k, v]) => `<li><strong>${k}:</strong> ${v}</li>`)
        .join('');

    const details = `
        ${item.name}\n\n
        ${item.description}\n\n
        Especificaciones:\n
        ${specs.replace(/<[^>]*>?/gm, '')}\n\n
        Ubicación: ${item.lab_name}\n
        Cantidad disponible: ${item.quantity_available}/${item.quantity_total}
    `;

    // Si quieres una vista bonita reemplaza alert por un modal real; esto muestra la info rápidamente.
    alert(details);
}

window.deleteItem = function(id) {
    if (confirm('¿Seguro que deseas eliminar este recurso?')) {
        resources = resources.filter(i => i.id !== id);
        renderInventory(resources);
        showNotification('Recurso eliminado', 'success');
    }
}

// ==================== INICIO ====================
loadInventory();
