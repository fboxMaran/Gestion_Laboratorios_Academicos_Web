import api from '../js/api.js';
import { requireAuth, getCurrentUser, logout as authLogout } from '../js/auth.js';
import { showNotification } from '../js/utils.js';

requireAuth();
window.logout = authLogout;

const user = getCurrentUser();
if (user) document.getElementById('userName').textContent = user.name;

let reportsData = [];

// ==================== CARGA INICIAL ====================
async function loadReports() {
    try {
        reportsData = await api.getReports();
        if (!reportsData.length) {
            showNotification('No hay datos de reportes disponibles', 'warning');
            return;
        }
        renderCharts(reportsData);
        showNotification('Reportes cargados correctamente', 'success');
    } catch (err) {
        console.error('Error al cargar reportes:', err);
        showNotification('No se pudieron cargar los datos', 'error');
    }
}

// ==================== FILTROS ====================
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

// ==================== TABLA ====================
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

// ==================== EXPORTACIÓN con api====================
// document.getElementById('exportPDF').addEventListener('click', async () => {
//     const res = await api.exportReport('pdf');
//     showNotification(res.message, 'info');
// });

// document.getElementById('exportExcel').addEventListener('click', async () => {
//     const res = await api.exportReport('excel');
//     showNotification(res.message, 'info');
// });

// ==================== GRÁFICOS ====================
function renderCharts(data) {
    if (!data || !data.length) return;

    // --- USO ---
    const usageCounts = {};
    data.filter(r => r.type === 'usage').forEach(r => {
        usageCounts[r.lab] = (usageCounts[r.lab] || 0) + 1;
    });

    new Chart(document.getElementById('chartUsage'), {
        type: 'bar',
        data: {
            labels: Object.keys(usageCounts),
            datasets: [{
                label: 'Usos por laboratorio',
                data: Object.values(usageCounts),
                backgroundColor: '#2563eb'
            }]
        }
    });

    // --- STOCK ---
    const stockData = {
        normal: data.filter(r => r.type === 'stock' && r.status === 'completed').length,
        low: data.filter(r => r.type === 'stock' && r.status === 'low-stock').length
    };

    new Chart(document.getElementById('chartStock'), {
        type: 'doughnut',
        data: {
            labels: ['Stock Normal', 'Stock Bajo'],
            datasets: [{
                data: [stockData.normal, stockData.low],
                backgroundColor: ['#10b981', '#f59e0b']
            }]
        }
    });

    // --- MANTENIMIENTOS ---
    const maintenanceByDate = {};
    data.filter(r => r.type === 'maintenance').forEach(r => {
        maintenanceByDate[r.date] = (maintenanceByDate[r.date] || 0) + 1;
    });

    new Chart(document.getElementById('chartMaintenance'), {
        type: 'line',
        data: {
            labels: Object.keys(maintenanceByDate),
            datasets: [{
                label: 'Mantenimientos',
                data: Object.values(maintenanceByDate),
                borderColor: '#ef4444',
                fill: false
            }]
        }
    });
}

// ==================== UTILIDADES ====================
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
// ==================== REPORTES ====================
window.exportPDF = function () {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text("Reporte Generado", 10, 15);

    let y = 30;

    reportsData.forEach(item => {
        doc.setFontSize(12);
        doc.text(
            `• ${translateType(item.type)} | ${item.resource} | ${item.lab} | ${item.date} | ${item.user}`,
            10,
            y
        );
        y += 8;

        if (y > 270) {
            doc.addPage();
            y = 20;
        }
    });

    doc.save("reporte.pdf");
    showNotification("PDF exportado correctamente ✔️", "success");
};

window.exportExcel = function () {
    if (!Array.isArray(reportsData) || reportsData.length === 0) {
        showNotification("No hay datos para exportar.", "warning");
        return;
    }

    const data = reportsData.map(item => ({
        Tipo: translateType(item.type),
        Recurso: item.resource,
        Laboratorio: item.lab,
        Fecha: item.date,
        Usuario: item.user,
        Estado: translateStatus(item.status)
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, "Reportes");
    XLSX.writeFile(workbook, "reporte.xlsx");

    showNotification("Archivo Excel exportado correctamente ✔️", "success");
};

document.getElementById("exportPDF").addEventListener("click", window.exportPDF);
document.getElementById("exportExcel").addEventListener("click", window.exportExcel);

// hey
// ==================== INICIO ====================
loadReports();
