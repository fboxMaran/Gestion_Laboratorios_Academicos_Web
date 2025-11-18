/**
 * GESTIÓN DE DISPONIBILIDAD Y RECURSOS - MÓDULO 1.2
 * Funcionalidades completas para calendario, recursos y disponibilidad
 */

import { API_CONFIG, STORAGE_KEYS } from './config.js';
import { getCurrentUser, isAuthenticated, logout } from './auth.js';

// Estado global
let currentLabId = null;
let currentLabData = null;
let currentView = 'week'; // 'week' o 'month'
let currentDate = new Date();
let calendarSlots = [];
let resources = [];
let subscriptions = [];
let changelog = [];

// Inicialización
document.addEventListener('DOMContentLoaded', async () => {
    // Verificar autenticación
    if (!isAuthenticated()) {
        window.location.href = '../../index.html';
        return;
    }

    // Cargar datos del usuario
    const user = getCurrentUser();
    if (user) {
        document.getElementById('userName').textContent = user.name || user.full_name || user.email;
    }

    // Inicializar página
    await initializePage();
});

/**
 * Inicializa la página
 */
async function initializePage() {
    try {
        // Obtener laboratorio del usuario automáticamente
        const urlParams = new URLSearchParams(window.location.search);
        const labId = urlParams.get('id');
        
        if (labId) {
            currentLabId = parseInt(labId);
            await loadLabData(currentLabId);
        } else {
            await loadUserLabs();
        }

        // Configurar eventos
        setupEventListeners();
        
        // Inicializar tabs
        initializeTabs();
    } catch (error) {
        console.error('Error inicializando página:', error);
        showAlert('Error al cargar los datos. Por favor, recarga la página.', 'error');
    }
}

/**
 * Carga los laboratorios del usuario
 */
async function loadUserLabs() {
    try {
        const user = getCurrentUser();
        const response = await fetch(`${API_CONFIG.BASE_URL}/labs?user_id=${user.id}`, {
            headers: getHeaders()
        });
        
        if (!response.ok) throw new Error('Error al cargar laboratorios');
        
        const labs = await response.json();
        
        if (labs.length === 0) {
            showAlert('No tienes laboratorios asignados.', 'warning');
            return;
        }
        
        if (labs.length === 1) {
            currentLabId = labs[0].id;
            await loadLabData(currentLabId);
        } else {
            // Mostrar selector
            const selectorCard = document.getElementById('labSelectorCard');
            const selector = document.getElementById('labSelector');
            selector.innerHTML = '<option value="">Seleccionar laboratorio...</option>';
            
            labs.forEach(lab => {
                const option = document.createElement('option');
                option.value = lab.id;
                option.textContent = lab.name;
                selector.appendChild(option);
            });
            
            selectorCard.style.display = 'block';
            selector.addEventListener('change', async (e) => {
                if (e.target.value) {
                    currentLabId = parseInt(e.target.value);
                    await loadLabData(currentLabId);
                }
            });
        }
    } catch (error) {
        console.error('Error cargando laboratorios:', error);
        showAlert('Error al cargar los laboratorios.', 'error');
    }
}

/**
 * Carga los datos del laboratorio
 */
async function loadLabData(labId) {
    try {
        const response = await fetch(`${API_CONFIG.BASE_URL}/labs/${labId}`, {
            headers: getHeaders()
        });
        
        if (!response.ok) throw new Error('Error al cargar datos del laboratorio');
        
        currentLabData = await response.json();
        currentLabId = labId;
        
        document.getElementById('labName').textContent = `Disponibilidad - ${currentLabData.name}`;
        
        // Cargar datos de las pestañas
        await Promise.all([
            loadCalendarSlots(),
            loadResources(),
            loadSubscriptions(),
            loadChangelog()
        ]);
    } catch (error) {
        console.error('Error cargando datos del laboratorio:', error);
        showAlert('Error al cargar los datos del laboratorio.', 'error');
    }
}

/**
 * Configura los event listeners
 */
function setupEventListeners() {
    // Botones principales
    document.getElementById('btnNewSlot')?.addEventListener('click', () => openSlotModal());
    document.getElementById('btnNewResource')?.addEventListener('click', () => openResourceModal());
    document.getElementById('btnAddResource')?.addEventListener('click', () => openResourceModal());
    document.getElementById('btnNewSubscription')?.addEventListener('click', () => openSubscriptionModal());
    
    // Calendario
    document.getElementById('btnPrevPeriod')?.addEventListener('click', () => navigatePeriod(-1));
    document.getElementById('btnNextPeriod')?.addEventListener('click', () => navigatePeriod(1));
    document.getElementById('btnToday')?.addEventListener('click', () => goToToday());
    document.getElementById('calendarView')?.addEventListener('change', (e) => changeCalendarView(e.target.value));
    document.getElementById('btnFilterCalendar')?.addEventListener('click', () => filterCalendar());
    
    // Recursos
    document.getElementById('btnFilterResources')?.addEventListener('click', () => filterResources());
    
    // Bitácora
    document.getElementById('btnFilterChangelog')?.addEventListener('click', () => filterChangelog());
    
    // Modales
    document.getElementById('btnSaveSlot')?.addEventListener('click', () => saveSlot());
    document.getElementById('btnSaveResource')?.addEventListener('click', () => saveResource());
    document.getElementById('btnSaveSubscription')?.addEventListener('click', () => saveSubscription());
    document.getElementById('btnEditResourceFromDetail')?.addEventListener('click', () => {
        const resourceId = document.getElementById('resourceDetailModal').dataset.resourceId;
        if (resourceId) openResourceModal(parseInt(resourceId));
    });
}

/**
 * Inicializa las pestañas
 */
function initializeTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabName = btn.dataset.tab;
            
            // Remover activo de todos
            tabButtons.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            // Activar seleccionado
            btn.classList.add('active');
            document.getElementById(`tab-${tabName}`).classList.add('active');
            
            // Cargar datos si es necesario
            if (tabName === 'calendar' && calendarSlots.length === 0) {
                loadCalendarSlots();
            } else if (tabName === 'resources' && resources.length === 0) {
                loadResources();
            } else if (tabName === 'changelog' && changelog.length === 0) {
                loadChangelog();
            } else if (tabName === 'subscriptions' && subscriptions.length === 0) {
                loadSubscriptions();
            }
        });
    });
}

// ==================== CALENDARIO ====================

/**
 * Carga los slots del calendario
 */
async function loadCalendarSlots() {
    if (!currentLabId) return;
    
    try {
        const startDate = getStartOfPeriod();
        const endDate = getEndOfPeriod();
        
        const response = await fetch(
            `${API_CONFIG.BASE_URL}/availability/labs/${currentLabId}/slots?from=${startDate.toISOString()}&to=${endDate.toISOString()}`,
            { headers: getHeaders() }
        );
        
        if (!response.ok) throw new Error('Error al cargar slots');
        
        calendarSlots = await response.json();
        renderCalendar();
    } catch (error) {
        console.error('Error cargando slots:', error);
        showAlert('Error al cargar el calendario.', 'error');
    }
}

/**
 * Renderiza el calendario según la vista actual
 */
function renderCalendar() {
    if (currentView === 'week') {
        renderWeekView();
    } else {
        renderMonthView();
    }
}

/**
 * Renderiza la vista semanal
 */
function renderWeekView() {
    const body = document.getElementById('calendarWeekBody');
    if (!body) return;
    
    // Obtener el inicio de la semana
    const weekStart = new Date(currentDate);
    weekStart.setDate(currentDate.getDate() - currentDate.getDay() + 1); // Lunes
    weekStart.setHours(0, 0, 0, 0);
    
    // Actualizar encabezados con fechas
    const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    document.querySelectorAll('.calendar-day').forEach((dayEl, index) => {
        const dayDate = new Date(weekStart);
        dayDate.setDate(weekStart.getDate() + index);
        dayEl.textContent = `${days[index]} ${dayDate.getDate()}/${dayDate.getMonth() + 1}`;
        dayEl.dataset.date = dayDate.toISOString().split('T')[0];
    });
    
    // Generar horas (8:00 - 20:00)
    body.innerHTML = '';
    const hours = [];
    for (let h = 8; h < 21; h++) {
        hours.push(h);
    }
    
    // Crear estructura
    hours.forEach(hour => {
        const timeSlot = document.createElement('div');
        timeSlot.className = 'calendar-time-slot';
        timeSlot.textContent = `${hour.toString().padStart(2, '0')}:00`;
        body.appendChild(timeSlot);
        
        // Crear columnas para cada día
        for (let d = 0; d < 7; d++) {
            const dayColumn = document.createElement('div');
            dayColumn.className = 'calendar-day-column';
            dayColumn.dataset.hour = hour;
            dayColumn.dataset.day = d;
            body.appendChild(dayColumn);
        }
    });
    
    // Renderizar slots
    calendarSlots.forEach(slot => {
        renderSlotInWeek(slot);
    });
}

/**
 * Renderiza un slot en la vista semanal
 */
function renderSlotInWeek(slot) {
    const start = new Date(slot.starts_at);
    const end = new Date(slot.ends_at);
    
    const dayOfWeek = start.getDay() === 0 ? 6 : start.getDay() - 1; // Convertir domingo=0 a domingo=6
    const startHour = start.getHours();
    const startMin = start.getMinutes();
    const endHour = end.getHours();
    const endMin = end.getMinutes();
    
    const dayColumn = document.querySelector(`.calendar-day-column[data-day="${dayOfWeek}"][data-hour="${startHour}"]`);
    if (!dayColumn) return;
    
    const slotEl = document.createElement('div');
    slotEl.className = `calendar-slot-item status-${slot.status}`;
    slotEl.title = `${slot.title || 'Sin título'} - ${slot.status}`;
    slotEl.textContent = `${start.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} - ${slot.title || slot.status}`;
    
    // Calcular altura (cada hora = 60px aprox)
    const duration = (end - start) / (1000 * 60); // minutos
    const height = (duration / 60) * 60; // altura en px
    slotEl.style.height = `${Math.max(height, 30)}px`;
    slotEl.style.top = `${(startMin / 60) * 60}px`;
    
    slotEl.addEventListener('click', () => editSlot(slot));
    dayColumn.appendChild(slotEl);
}

/**
 * Renderiza la vista mensual
 */
function renderMonthView() {
    const header = document.getElementById('calendarMonthHeader');
    const body = document.getElementById('calendarMonthBody');
    
    if (!header || !body) return;
    
    // Encabezados de días
    const days = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
    header.innerHTML = '';
    days.forEach(day => {
        const dayEl = document.createElement('div');
        dayEl.className = 'calendar-day';
        dayEl.textContent = day;
        header.appendChild(dayEl);
    });
    
    // Obtener primer día del mes y último
    const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - startDate.getDay() + 1); // Lunes de la semana
    
    body.innerHTML = '';
    
    // Generar 42 días (6 semanas)
    for (let i = 0; i < 42; i++) {
        const dayDate = new Date(startDate);
        dayDate.setDate(startDate.getDate() + i);
        
        const dayEl = document.createElement('div');
        dayEl.className = 'calendar-month-day';
        if (dayDate.getMonth() !== currentDate.getMonth()) {
            dayEl.classList.add('other-month');
        }
        if (dayDate.toDateString() === new Date().toDateString()) {
            dayEl.classList.add('today');
        }
        
        dayEl.innerHTML = `
            <div class="calendar-month-day-number">${dayDate.getDate()}</div>
            <div class="calendar-month-day-slots" data-date="${dayDate.toISOString().split('T')[0]}"></div>
        `;
        
        body.appendChild(dayEl);
    }
    
    // Renderizar slots
    calendarSlots.forEach(slot => {
        renderSlotInMonth(slot);
    });
}

/**
 * Renderiza un slot en la vista mensual
 */
function renderSlotInMonth(slot) {
    const start = new Date(slot.starts_at);
    const dateStr = start.toISOString().split('T')[0];
    
    const daySlots = document.querySelector(`.calendar-month-day-slots[data-date="${dateStr}"]`);
    if (!daySlots) return;
    
    const dot = document.createElement('div');
    dot.className = `calendar-month-slot-dot status-${slot.status}`;
    dot.style.backgroundColor = getStatusColor(slot.status);
    dot.title = `${slot.title || 'Sin título'} - ${start.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`;
    dot.addEventListener('click', () => editSlot(slot));
    
    daySlots.appendChild(dot);
}

/**
 * Obtiene el color según el estado
 */
function getStatusColor(status) {
    const colors = {
        'DISPONIBLE': '#10b981',
        'BLOQUEADO': '#ef4444',
        'RESERVADO': '#3b82f6',
        'MANTENIMIENTO': '#f59e0b',
        'EXCLUSIVO': '#6366f1'
    };
    return colors[status] || '#64748b';
}

/**
 * Navega al período anterior/siguiente
 */
function navigatePeriod(direction) {
    if (currentView === 'week') {
        currentDate.setDate(currentDate.getDate() + (direction * 7));
    } else {
        currentDate.setMonth(currentDate.getMonth() + direction);
    }
    loadCalendarSlots();
}

/**
 * Va a la fecha de hoy
 */
function goToToday() {
    currentDate = new Date();
    loadCalendarSlots();
}

/**
 * Cambia la vista del calendario
 */
function changeCalendarView(view) {
    currentView = view;
    document.getElementById('calendarWeekView').style.display = view === 'week' ? 'block' : 'none';
    document.getElementById('calendarMonthView').style.display = view === 'month' ? 'block' : 'none';
    renderCalendar();
}

/**
 * Obtiene el inicio del período actual
 */
function getStartOfPeriod() {
    const date = new Date(currentDate);
    if (currentView === 'week') {
        date.setDate(date.getDate() - date.getDay() + 1);
    } else {
        date.setDate(1);
    }
    date.setHours(0, 0, 0, 0);
    return date;
}

/**
 * Obtiene el fin del período actual
 */
function getEndOfPeriod() {
    const date = new Date(currentDate);
    if (currentView === 'week') {
        date.setDate(date.getDate() - date.getDay() + 7);
    } else {
        date.setMonth(date.getMonth() + 1);
        date.setDate(0);
    }
    date.setHours(23, 59, 59, 999);
    return date;
}

/**
 * Filtra el calendario
 */
function filterCalendar() {
    // Implementar filtrado
    renderCalendar();
}

// ==================== RECURSOS ====================

/**
 * Carga los recursos del laboratorio
 */
async function loadResources() {
    if (!currentLabId) return;
    
    try {
        const response = await fetch(
            `${API_CONFIG.BASE_URL}/resources?lab_id=${currentLabId}`,
            { headers: getHeaders() }
        );
        
        if (!response.ok) throw new Error('Error al cargar recursos');
        
        resources = await response.json();
        renderResources();
        populateResourceSelects();
    } catch (error) {
        console.error('Error cargando recursos:', error);
        showAlert('Error al cargar los recursos.', 'error');
    }
}

/**
 * Renderiza los recursos en grid
 */
function renderResources() {
    const grid = document.getElementById('resourcesGrid');
    if (!grid) return;
    
    if (resources.length === 0) {
        grid.innerHTML = '<div class="text-center">No hay recursos registrados.</div>';
        return;
    }
    
    grid.innerHTML = '';
    
    resources.forEach(resource => {
        const card = document.createElement('div');
        card.className = 'resource-card';
        card.innerHTML = `
            <div class="resource-card-header">
                <h4 class="resource-card-title">${resource.name}</h4>
                <span class="resource-card-badge state-${resource.state}">${resource.state}</span>
            </div>
            <div class="resource-card-type">${resource.type}</div>
            ${resource.inventory_code ? `<div class="resource-card-info-item">📋 Código: ${resource.inventory_code}</div>` : ''}
            ${resource.location ? `<div class="resource-card-info-item">📍 ${resource.location}</div>` : ''}
            ${resource.description ? `<div class="resource-card-description">${resource.description}</div>` : ''}
            <div class="resource-card-actions">
                <button class="btn btn-sm btn-primary" onclick="viewResourceDetail(${resource.id})">Ver Detalles</button>
                <button class="btn btn-sm btn-outline" onclick="openResourceModal(${resource.id})">Editar</button>
            </div>
        `;
        grid.appendChild(card);
    });
}

/**
 * Pobla los selects de recursos
 */
function populateResourceSelects() {
    const selects = [
        document.getElementById('slotResource'),
        document.getElementById('subscriptionResource'),
        document.getElementById('filterResourceCalendar')
    ];
    
    selects.forEach(select => {
        if (!select) return;
        const currentValue = select.value;
        select.innerHTML = '<option value="">Espacio del laboratorio</option>';
        
        resources.forEach(resource => {
            const option = document.createElement('option');
            option.value = resource.id;
            option.textContent = resource.name;
            select.appendChild(option);
        });
        
        if (currentValue) select.value = currentValue;
    });
}

/**
 * Filtra los recursos
 */
function filterResources() {
    const type = document.getElementById('filterResourceType').value;
    const state = document.getElementById('filterResourceState').value;
    const search = document.getElementById('searchResource').value.toLowerCase();
    
    const filtered = resources.filter(r => {
        if (type && r.type !== type) return false;
        if (state && r.state !== state) return false;
        if (search && !r.name.toLowerCase().includes(search) && !(r.inventory_code && r.inventory_code.toLowerCase().includes(search))) return false;
        return true;
    });
    
    const grid = document.getElementById('resourcesGrid');
    grid.innerHTML = '';
    
    if (filtered.length === 0) {
        grid.innerHTML = '<div class="text-center">No se encontraron recursos.</div>';
        return;
    }
    
    filtered.forEach(resource => {
        const card = document.createElement('div');
        card.className = 'resource-card';
        card.innerHTML = `
            <div class="resource-card-header">
                <h4 class="resource-card-title">${resource.name}</h4>
                <span class="resource-card-badge state-${resource.state}">${resource.state}</span>
            </div>
            <div class="resource-card-type">${resource.type}</div>
            ${resource.inventory_code ? `<div class="resource-card-info-item">📋 Código: ${resource.inventory_code}</div>` : ''}
            ${resource.location ? `<div class="resource-card-info-item">📍 ${resource.location}</div>` : ''}
            ${resource.description ? `<div class="resource-card-description">${resource.description}</div>` : ''}
            <div class="resource-card-actions">
                <button class="btn btn-sm btn-primary" onclick="viewResourceDetail(${resource.id})">Ver Detalles</button>
                <button class="btn btn-sm btn-outline" onclick="openResourceModal(${resource.id})">Editar</button>
            </div>
        `;
        grid.appendChild(card);
    });
}

/**
 * Abre el modal de recurso
 */
window.openResourceModal = function(resourceId = null) {
    const modal = document.getElementById('resourceModal');
    const form = document.getElementById('resourceForm');
    const title = document.getElementById('resourceModalTitle');
    
    form.reset();
    document.getElementById('resourceId').value = '';
    
    if (resourceId) {
        const resource = resources.find(r => r.id === resourceId);
        if (resource) {
            title.textContent = 'Editar Recurso';
            document.getElementById('resourceId').value = resource.id;
            document.getElementById('resourceName').value = resource.name;
            document.getElementById('resourceType').value = resource.type;
            document.getElementById('resourceInventoryCode').value = resource.inventory_code || '';
            document.getElementById('resourceState').value = resource.state;
            document.getElementById('resourceLocation').value = resource.location || '';
            document.getElementById('resourceDescription').value = resource.description || '';
            document.getElementById('resourceTechSheet').value = resource.tech_sheet || '';
            document.getElementById('resourceLastMaintenance').value = resource.last_maintenance_date || '';
        }
    } else {
        title.textContent = 'Nuevo Recurso';
    }
    
    modal.style.display = 'block';
};

/**
 * Guarda un recurso
 */
async function saveResource() {
    const form = document.getElementById('resourceForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    const formData = new FormData(form);
    const resourceId = formData.get('id');
    const data = {
        lab_id: currentLabId,
        name: formData.get('name'),
        type: formData.get('type'),
        inventory_code: formData.get('inventory_code') || null,
        state: formData.get('state'),
        location: formData.get('location') || null,
        description: formData.get('description') || null,
        tech_sheet: formData.get('tech_sheet') || null,
        last_maintenance_date: formData.get('last_maintenance_date') || null
    };
    
    try {
        let response;
        if (resourceId) {
            response = await fetch(`${API_CONFIG.BASE_URL}/resources/${resourceId}`, {
                method: 'PUT',
                headers: { ...getHeaders(), 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
        } else {
            response = await fetch(`${API_CONFIG.BASE_URL}/resources`, {
                method: 'POST',
                headers: { ...getHeaders(), 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
        }
        
        if (!response.ok) throw new Error('Error al guardar recurso');
        
        showAlert('Recurso guardado correctamente.', 'success');
        closeModal('resourceModal');
        await loadResources();
    } catch (error) {
        console.error('Error guardando recurso:', error);
        showAlert('Error al guardar el recurso.', 'error');
    }
}

/**
 * Muestra los detalles de un recurso
 */
window.viewResourceDetail = async function(resourceId) {
    const resource = resources.find(r => r.id === resourceId);
    if (!resource) return;
    
    const modal = document.getElementById('resourceDetailModal');
    const body = document.getElementById('resourceDetailBody');
    const title = document.getElementById('resourceDetailTitle');
    
    title.textContent = resource.name;
    modal.dataset.resourceId = resourceId;
    
    body.innerHTML = `
        <div class="resource-detail-section">
            <h4>Información General</h4>
            <div class="resource-detail-info">
                <div class="resource-detail-info-item">
                    <div class="resource-detail-info-label">Tipo</div>
                    <div class="resource-detail-info-value">${resource.type}</div>
                </div>
                <div class="resource-detail-info-item">
                    <div class="resource-detail-info-label">Estado</div>
                    <div class="resource-detail-info-value">
                        <span class="resource-card-badge state-${resource.state}">${resource.state}</span>
                    </div>
                </div>
                ${resource.inventory_code ? `
                <div class="resource-detail-info-item">
                    <div class="resource-detail-info-label">Código de Inventario</div>
                    <div class="resource-detail-info-value">${resource.inventory_code}</div>
                </div>
                ` : ''}
                ${resource.location ? `
                <div class="resource-detail-info-item">
                    <div class="resource-detail-info-label">Ubicación</div>
                    <div class="resource-detail-info-value">${resource.location}</div>
                </div>
                ` : ''}
                ${resource.last_maintenance_date ? `
                <div class="resource-detail-info-item">
                    <div class="resource-detail-info-label">Último Mantenimiento</div>
                    <div class="resource-detail-info-value">${new Date(resource.last_maintenance_date).toLocaleDateString('es-ES')}</div>
                </div>
                ` : ''}
            </div>
        </div>
        ${resource.description ? `
        <div class="resource-detail-section">
            <h4>Descripción</h4>
            <p>${resource.description}</p>
        </div>
        ` : ''}
        ${resource.tech_sheet ? `
        <div class="resource-detail-section">
            <h4>Ficha Técnica</h4>
            <div class="resource-detail-tech-sheet">${resource.tech_sheet}</div>
        </div>
        ` : ''}
    `;
    
    modal.style.display = 'block';
};

// ==================== SLOTS ====================

/**
 * Abre el modal de slot
 */
function openSlotModal(slot = null) {
    const modal = document.getElementById('slotModal');
    const form = document.getElementById('slotForm');
    const title = document.getElementById('slotModalTitle');
    
    form.reset();
    document.getElementById('slotId').value = '';
    
    if (slot) {
        title.textContent = 'Editar Horario';
        const start = new Date(slot.starts_at);
        const end = new Date(slot.ends_at);
        
        document.getElementById('slotId').value = slot.id;
        document.getElementById('slotStartDate').value = start.toISOString().split('T')[0];
        document.getElementById('slotStartTime').value = start.toTimeString().slice(0, 5);
        document.getElementById('slotEndDate').value = end.toISOString().split('T')[0];
        document.getElementById('slotEndTime').value = end.toTimeString().slice(0, 5);
        document.getElementById('slotResource').value = slot.resource_id || '';
        document.getElementById('slotStatus').value = slot.status;
        document.getElementById('slotTitle').value = slot.title || '';
        document.getElementById('slotReason').value = slot.reason || '';
    } else {
        title.textContent = 'Nuevo Horario';
        const today = new Date();
        document.getElementById('slotStartDate').value = today.toISOString().split('T')[0];
        document.getElementById('slotEndDate').value = today.toISOString().split('T')[0];
    }
    
    modal.style.display = 'block';
}

/**
 * Edita un slot
 */
function editSlot(slot) {
    openSlotModal(slot);
}

/**
 * Guarda un slot
 */
async function saveSlot() {
    const form = document.getElementById('slotForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    const formData = new FormData(form);
    const slotId = formData.get('id');
    const user = getCurrentUser();
    
    const startDate = formData.get('start_date');
    const startTime = formData.get('start_time');
    const endDate = formData.get('end_date');
    const endTime = formData.get('end_time');
    
    const starts_at = new Date(`${startDate}T${startTime}`);
    const ends_at = new Date(`${endDate}T${endTime}`);
    
    if (ends_at <= starts_at) {
        showAlert('La fecha de fin debe ser posterior a la fecha de inicio.', 'error');
        return;
    }
    
    const data = {
        resource_id: formData.get('resource_id') || null,
        starts_at: starts_at.toISOString(),
        ends_at: ends_at.toISOString(),
        status: formData.get('status'),
        title: formData.get('title') || null,
        reason: formData.get('reason') || null,
        user_id: user.id
    };
    
    try {
        let response;
        if (slotId) {
            // Actualizar estado
            response = await fetch(`${API_CONFIG.BASE_URL}/availability/slots/${slotId}/status`, {
                method: 'PUT',
                headers: { ...getHeaders(), 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: data.status, user_id: user.id })
            });
        } else {
            response = await fetch(`${API_CONFIG.BASE_URL}/availability/labs/${currentLabId}/slots`, {
                method: 'POST',
                headers: { ...getHeaders(), 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
        }
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al guardar horario');
        }
        
        showAlert('Horario guardado correctamente.', 'success');
        closeModal('slotModal');
        await loadCalendarSlots();
    } catch (error) {
        console.error('Error guardando slot:', error);
        showAlert(error.message || 'Error al guardar el horario.', 'error');
    }
}

// ==================== SUSCRIPCIONES ====================

/**
 * Carga las suscripciones
 */
async function loadSubscriptions() {
    const user = getCurrentUser();
    if (!user) return;
    
    try {
        const response = await fetch(
            `${API_CONFIG.BASE_URL}/availability/subscriptions?user_id=${user.id}`,
            { headers: getHeaders() }
        );
        
        if (!response.ok) throw new Error('Error al cargar suscripciones');
        
        subscriptions = await response.json();
        renderSubscriptions();
    } catch (error) {
        console.error('Error cargando suscripciones:', error);
    }
}

/**
 * Renderiza las suscripciones
 */
function renderSubscriptions() {
    const tbody = document.getElementById('subscriptionsTableBody');
    if (!tbody) return;
    
    if (subscriptions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center">No tienes suscripciones activas.</td></tr>';
        return;
    }
    
    tbody.innerHTML = '';
    
    subscriptions.forEach(sub => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${sub.lab_id ? 'Laboratorio #' + sub.lab_id : '-'}</td>
            <td>${sub.resource_id ? 'Recurso #' + sub.resource_id : 'Todo el laboratorio'}</td>
            <td>${new Date(sub.created_at).toLocaleDateString('es-ES')}</td>
            <td>
                <button class="btn btn-sm btn-outline" onclick="deleteSubscription(${sub.id})">Eliminar</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

/**
 * Abre el modal de suscripción
 */
function openSubscriptionModal() {
    const modal = document.getElementById('subscriptionModal');
    document.getElementById('subscriptionForm').reset();
    modal.style.display = 'block';
}

/**
 * Guarda una suscripción
 */
async function saveSubscription() {
    const form = document.getElementById('subscriptionForm');
    const user = getCurrentUser();
    
    const data = {
        user_id: user.id,
        lab_id: currentLabId,
        resource_id: form.resource_id.value || null
    };
    
    try {
        const response = await fetch(`${API_CONFIG.BASE_URL}/availability/subscriptions`, {
            method: 'POST',
            headers: { ...getHeaders(), 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        if (!response.ok) throw new Error('Error al crear suscripción');
        
        showAlert('Suscripción creada correctamente.', 'success');
        closeModal('subscriptionModal');
        await loadSubscriptions();
    } catch (error) {
        console.error('Error guardando suscripción:', error);
        showAlert('Error al crear la suscripción.', 'error');
    }
}

/**
 * Elimina una suscripción
 */
window.deleteSubscription = async function(subId) {
    if (!confirm('¿Estás seguro de eliminar esta suscripción?')) return;
    
    try {
        // Nota: La API puede no tener DELETE para suscripciones, 
        // en ese caso se puede implementar en el backend o usar otro método
        const response = await fetch(`${API_CONFIG.BASE_URL}/availability/subscriptions/${subId}`, {
            method: 'DELETE',
            headers: getHeaders()
        });
        
        if (!response.ok) {
            // Si no existe la ruta DELETE, intentar con otro método o mostrar mensaje
            throw new Error('Error al eliminar suscripción. La funcionalidad puede no estar disponible aún.');
        }
        
        showAlert('Suscripción eliminada correctamente.', 'success');
        await loadSubscriptions();
    } catch (error) {
        console.error('Error eliminando suscripción:', error);
        showAlert(error.message || 'Error al eliminar la suscripción.', 'error');
    }
};

// ==================== BITÁCORA ====================

/**
 * Carga la bitácora de cambios
 */
async function loadChangelog() {
    if (!currentLabId) return;
    
    try {
        const response = await fetch(
            `${API_CONFIG.BASE_URL}/availability/changelog?entity_type=slot&entity_id=${currentLabId}`,
            { headers: getHeaders() }
        );
        
        if (!response.ok) throw new Error('Error al cargar bitácora');
        
        changelog = await response.json();
        renderChangelog();
    } catch (error) {
        console.error('Error cargando bitácora:', error);
    }
}

/**
 * Renderiza la bitácora
 */
function renderChangelog() {
    const tbody = document.getElementById('changelogTableBody');
    if (!tbody) return;
    
    if (changelog.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">No hay registros en la bitácora.</td></tr>';
        return;
    }
    
    tbody.innerHTML = '';
    
    changelog.forEach(entry => {
        const row = document.createElement('tr');
        const detail = typeof entry.detail === 'string' ? JSON.parse(entry.detail) : entry.detail;
        row.innerHTML = `
            <td>${new Date(entry.created_at).toLocaleString('es-ES')}</td>
            <td>Usuario #${entry.user_id || 'N/A'}</td>
            <td>${entry.entity_type}</td>
            <td>${entry.action}</td>
            <td>${JSON.stringify(detail)}</td>
        `;
        tbody.appendChild(row);
    });
}

/**
 * Filtra la bitácora
 */
function filterChangelog() {
    // Implementar filtrado
    renderChangelog();
}

// ==================== UTILIDADES ====================

/**
 * Obtiene los headers con autenticación
 */
function getHeaders() {
    const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };
}

/**
 * Muestra una alerta
 */
function showAlert(message, type = 'info') {
    const container = document.getElementById('alertContainer');
    if (!container) return;
    
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;
    
    container.appendChild(alert);
    
    setTimeout(() => {
        alert.remove();
    }, 5000);
}

/**
 * Cierra un modal
 */
window.closeModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
};

// Cerrar modales al hacer clic fuera
window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        e.target.style.display = 'none';
    }
});

// Exportar logout para uso global
window.logout = logout;

