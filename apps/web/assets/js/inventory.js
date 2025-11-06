import { requireAuth, getCurrentUser, logout as authLogout } from '../assets/js/auth.js';
import { showNotification } from '../assets/js/utils.js';

requireAuth();
window.logout = authLogout;

const user = getCurrentUser();
if (user) {
    document.getElementById('userName').textContent = user.name;
}

const DATA_SOURCE = 'apps/web/assets/data/mock';

let inventoryData = [];

async function loadInventory() {
    try {
        const response = await fetch(DATA_SOURCE);
        inventoryData = await response.json();
        renderInventory(inventoryData);
    } catch (err) {
        console.error('Error al cargar inventario:', err);
        showNotification('Error al cargar inventario', 'error');
    }
}

function renderInventory(data) {
    const tbody = document.getElementById('inventoryTableBody');
    if (!data || data.length === 0) {
        tbody.innerHTML = `
            <tr><td colspan="6" class="text-center text-secondary">
                No se encontraron recursos.
            </td></tr>`;
        return;
    }

    tbody.innerHTML = data.map(item => `
        <tr>
            <td>${item.name}</td>
            <td>${item.category}</td>
            <td>${item.lab}</td>
            <td>${item.available} / ${item.total}</td>
            <td><span class="badge ${item.status}">${translateStatus(item.status)}</span></td>
            <td>
                <button class="btn btn-sm btn-outline">Editar</button>
                <button class="btn btn-sm btn-error">Eliminar</button>
            </td>
        </tr>
    `).join('');
}

function translateStatus(status) {
    switch (status) {
        case 'available': return 'Disponible';
        case 'maintenance': return 'Mantenimiento';
        case 'out': return 'Agotado';
        default: return 'Desconocido';
    }
}

document.getElementById('btnFilter').addEventListener('click', () => {
    const category = document.getElementById('filterCategory').value;
    const status = document.getElementById('filterStatus').value;
    const search = document.getElementById('filterSearch').value.toLowerCase();

    const filtered = inventoryData.filter(item => {
        return (
            (category === '' || item.category === category) &&
            (status === '' || item.status === status) &&
            (item.name.toLowerCase().includes(search))
        );
    });

    renderInventory(filtered);
    showNotification(`${filtered.length} resultados encontrados`, 'info');
});

document.getElementById('btnClear').addEventListener('click', () => {
    document.getElementById('filterCategory').value = '';
    document.getElementById('filterStatus').value = '';
    document.getElementById('filterSearch').value = '';
    renderInventory(inventoryData);
    showNotification('Filtros limpiados', 'info');
});

// ==================== DASHBOARD ====================

function renderDashboard() {
    // Calcular datos base
    const usageData = reportsData.filter(r => r.type === 'usage');
    const maintenanceData = reportsData.filter(r => r.type === 'maintenance');
    const stockData = reportsData.filter(r => r.type === 'stock');

    // 1️⃣ Uso de recursos por laboratorio
    const usageByLab = {};
    usageData.forEach(r => {
        usageByLab[r.lab] = (usageByLab[r.lab] || 0) + 1;
    });

    new Chart(document.getElementById('chartUsage'), {
        type: 'bar',
        data: {
            labels: Object.keys(usageByLab),
            datasets: [{
                label: 'Cantidad de usos',
                data: Object.values(usageByLab),
                backgroundColor: '#4e73df'
            }]
        },
        options: {
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true } }
        }
    });

    // 2️⃣ Estado del inventario
    const stockSummary = {
        "Disponible": stockData.filter(r => r.status === 'completed').length,
        "Bajo stock": stockData.filter(r => r.status === 'low-stock').length
    };

    new Chart(document.getElementById('chartStock'), {
        type: 'doughnut',
        data: {
            labels: Object.keys(stockSummary),
            datasets: [{
                data: Object.values(stockSummary),
                backgroundColor: ['#1cc88a', '#e74a3b']
            }]
        },
        options: {
            plugins: { legend: { position: 'bottom' } }
        }
    });

    // 3️⃣ Historial de mantenimientos
    const maintenanceByDate = {};
    maintenanceData.forEach(r => {
        maintenanceByDate[r.date] = (maintenanceByDate[r.date] || 0) + 1;
    });

    new Chart(document.getElementById('chartMaintenance'), {
        type: 'line',
        data: {
            labels: Object.keys(maintenanceByDate),
            datasets: [{
                label: 'Mantenimientos realizados',
                data: Object.values(maintenanceByDate),
                borderColor: '#f6c23e',
                backgroundColor: 'rgba(246,194,62,0.3)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true } }
        }
    });
}


loadReports().then(() => {
    renderDashboard(); // Mostrar las gráficas al cargar datos
});

