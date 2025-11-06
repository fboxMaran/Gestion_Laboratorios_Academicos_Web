import { requireAuth, getCurrentUser, logout as authLogout } from '../assets/js/auth.js';
import { showNotification } from '../assets/js/utils.js';


requireAuth();
window.logout = authLogout;


const user = getCurrentUser();
if (user) {
    document.getElementById('userName').textContent = user.name;
}


const DATA_SOURCE = './mock-data/reports.json';
let reportsData = [];


async function loadReports() {
    try {
        const res = await fetch(DATA_SOURCE);
        reportsData = await res.json();
    } catch (err) {
        console.error('Error al cargar reportes:', err);
        showNotification('No se pudieron cargar los datos', 'error');
    }
}


document.getElementById('btnGenerate').addEventListener('click', () => {
    const type = document.getElementById('reportType').value;
    const date = document.getElementById('dateRange').value;

    if (!reportsData.length) {
        showNotification('No hay datos disponibles', 'warning');
        return;
    }

    const filtered = reportsData.filter(r =>
        r.type === type && (!date || r.date.startsWith(date))
    );

    renderReport(filtered, type);
});


document.getElementById('btnClear').addEventListener('click', () => {
    document.getElementById('reportType').value = 'usage';
    document.getElementById('dateRange').value = '';
    document.getElementById('reportTableBody').innerHTML = `
        <tr><td colspan="6" class="text-center text-secondary">Seleccione un tipo de reporte para comenzar.</td></tr>`;
    showNotification('Filtros limpiados', 'info');
});


function renderReport(data, type) {
    const tbody = document.getElementById('reportTableBody');
    if (data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-secondary">No se encontraron registros.</td></tr>`;
        return;
    }

    tbody.innerHTML = data.map(item => `
        <tr>
            <td>${translateType(item.type)}</td>
            <td>${item.resource}</td>
            <td>${item.lab}</td>
            <td>${item.date}</td>
            <td>${item.user}</td>
            <td><span class="badge ${item.status}">${translateStatus(item.status)}</span></td>
        </tr>
    `).join('');

    showNotification(`${data.length} registros cargados para "${translateType(type)}"`, 'success');
}


document.getElementById('exportPDF').addEventListener('click', () => {
    showNotification('Exportación PDF simulada (pendiente de implementación)', 'info');
});

document.getElementById('exportExcel').addEventListener('click', () => {
    showNotification('Exportación Excel simulada (pendiente de implementación)', 'info');
});

function translateType(type) {
    switch (type) {
        case 'usage': return 'Uso de Recursos';
        case 'stock': return 'Stock Actual';
        case 'maintenance': return 'Historial de Mantenimiento';
        default: return 'Desconocido';
    }
}

function translateStatus(status) {
    switch (status) {
        case 'completed': return 'Completado';
        case 'maintenance': return 'Mantenimiento';
        case 'low-stock': return 'Stock Bajo';
        default: return 'Desconocido';
    }
}

loadReports();
