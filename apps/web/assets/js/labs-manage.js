/**
 * GESTIÓN DE LABORATORIOS - MÓDULO 1.1
 * Funcionalidades completas para administración de perfiles de laboratorio
 */

import { API_CONFIG, STORAGE_KEYS } from './config.js';
import { getCurrentUser, isAuthenticated, logout } from './auth.js';

// Estado global
let currentLabId = null;
let currentLabData = null;
let isEditMode = false;
let departments = [];
let contacts = [];
let fixedResources = [];
let consumables = [];
let history = [];

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
        document.getElementById('userName').textContent = user.name || user.email;
    }

    // Inicializar página
    await initializePage();
});

/**
 * Inicializa la página
 */
async function initializePage() {
    try {
        // Cargar departamentos
        await loadDepartments();
        
        // Obtener laboratorio del usuario automáticamente
        const urlParams = new URLSearchParams(window.location.search);
        const labId = urlParams.get('id');
        
        if (labId) {
            // Si hay ID en la URL, usarlo (útil para compartir enlaces)
            currentLabId = parseInt(labId);
            await loadLabData(currentLabId);
        } else {
            // Si no hay ID, cargar automáticamente los laboratorios del usuario
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
 * Carga la lista de departamentos
 */
async function loadDepartments() {
    try {
        const response = await fetch(`${API_CONFIG.BASE_URL}/departments`, {
            headers: getHeaders()
        });
        
        if (!response.ok) throw new Error('Error al cargar departamentos');
        
        departments = await response.json();
        
        const select = document.getElementById('labDepartmentSelect');
        select.innerHTML = '<option value="">Seleccionar departamento...</option>';
        
        departments.forEach(dept => {
            const option = document.createElement('option');
            option.value = dept.id;
            option.textContent = dept.name || dept.code;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error cargando departamentos:', error);
    }
}

/**
 * Carga los laboratorios del usuario
 */
async function loadUserLabs() {
    try {
        // Usar el endpoint /labs?my=true para obtener solo los laboratorios del usuario
        const response = await fetch(`${API_CONFIG.BASE_URL}/labs?my=true`, {
            headers: getHeaders()
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al cargar laboratorios');
        }
        
        const labs = await response.json();
        
        if (labs.length === 0) {
            showAlert('No tienes laboratorios asignados. Contacta al administrador para que te asigne uno.', 'warning');
            // Ocultar el contenido principal si no hay laboratorios
            document.querySelector('.tabs-container').style.display = 'none';
            return;
        }
        
        if (labs.length === 1) {
            // Si solo tiene uno, cargarlo directamente
            currentLabId = labs[0].id;
            await loadLabData(currentLabId);
        } else {
            // Si tiene múltiples, mostrar selector
            showLabSelector(labs);
        }
    } catch (error) {
        console.error('Error cargando laboratorios:', error);
        showAlert(error.message || 'Error al cargar laboratorios. Verifica tu conexión.', 'error');
    }
}

/**
 * Muestra el selector de laboratorios
 */
function showLabSelector(labs) {
    const card = document.getElementById('labSelectorCard');
    const select = document.getElementById('labSelector');
    
    select.innerHTML = '<option value="">Seleccionar laboratorio...</option>';
    labs.forEach(lab => {
        const option = document.createElement('option');
        option.value = lab.id;
        option.textContent = lab.name || lab.code;
        select.appendChild(option);
    });
    
    card.style.display = 'block';
    
    select.addEventListener('change', async (e) => {
        if (e.target.value) {
            currentLabId = parseInt(e.target.value);
            await loadLabData(currentLabId);
        }
    });
}

/**
 * Carga todos los datos del laboratorio
 */
async function loadLabData(labId) {
    try {
        showLoading(true);
        
        // Cargar datos en paralelo
        const [labData, contactsData, fixedData, consumablesData, policiesData, hoursData, historyData] = await Promise.all([
            fetchLab(labId),
            fetchContacts(labId),
            fetchFixedResources(labId),
            fetchConsumables(labId),
            fetchPolicies(labId),
            fetchHours(labId),
            fetchHistory(labId)
        ]);
        
        currentLabData = labData;
        contacts = contactsData || [];
        fixedResources = fixedData || [];
        consumables = consumablesData || [];
        history = historyData || [];
        
        // Actualizar UI
        updateLabProfile(labData);
        updateContactsTable();
        updateFixedResourcesTable();
        updateConsumablesTable();
        updatePoliciesForm(policiesData, hoursData);
        updateHistoryTable();
        
        // Actualizar título
        document.getElementById('labName').textContent = labData.name || 'Gestión de Laboratorio';
        
        showLoading(false);
    } catch (error) {
        console.error('Error cargando datos del laboratorio:', error);
        showAlert('Error al cargar los datos del laboratorio', 'error');
        showLoading(false);
    }
}

/**
 * Fetch functions
 */
async function fetchLab(id) {
    const response = await fetch(`${API_CONFIG.BASE_URL}/labs/${id}`, {
        headers: getHeaders()
    });
    if (!response.ok) throw new Error('Error al cargar laboratorio');
    return await response.json();
}

async function fetchContacts(labId) {
    const response = await fetch(`${API_CONFIG.BASE_URL}/labs/${labId}/contacts`, {
        headers: getHeaders()
    });
    if (!response.ok) return [];
    return await response.json();
}

async function fetchFixedResources(labId) {
    const response = await fetch(`${API_CONFIG.BASE_URL}/labs/${labId}/resources-fixed`, {
        headers: getHeaders()
    });
    if (!response.ok) return [];
    return await response.json();
}

async function fetchConsumables(labId) {
    const response = await fetch(`${API_CONFIG.BASE_URL}/labs/${labId}/consumables`, {
        headers: getHeaders()
    });
    if (!response.ok) return [];
    return await response.json();
}

async function fetchPolicies(labId) {
    const response = await fetch(`${API_CONFIG.BASE_URL}/labs/${labId}/policies`, {
        headers: getHeaders()
    });
    if (!response.ok) return null;
    return await response.json();
}

async function fetchHours(labId) {
    const response = await fetch(`${API_CONFIG.BASE_URL}/labs/${labId}/hours`, {
        headers: getHeaders()
    });
    if (!response.ok) return null;
    return await response.json();
}

async function fetchHistory(labId) {
    const response = await fetch(`${API_CONFIG.BASE_URL}/labs/${labId}/history`, {
        headers: getHeaders()
    });
    if (!response.ok) return [];
    return await response.json();
}

/**
 * Actualiza el formulario de perfil del laboratorio
 */
function updateLabProfile(lab) {
    if (!lab) return;
    
    document.getElementById('labNameInput').value = lab.name || '';
    document.getElementById('labCodeInput').value = lab.code || '';
    document.getElementById('labLocationInput').value = lab.location || '';
    document.getElementById('labDescriptionInput').value = lab.description || '';
    document.getElementById('labDepartmentSelect').value = lab.department_id || '';
    
    // Deshabilitar campos en modo vista
    setFormReadOnly(true);
}

/**
 * Actualiza la tabla de contactos
 */
function updateContactsTable() {
    const tbody = document.getElementById('contactsTableBody');
    
    if (contacts.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">No hay contactos registrados</td></tr>';
        return;
    }
    
    tbody.innerHTML = contacts.map(contact => `
        <tr>
            <td>${escapeHtml(contact.name || '')}</td>
            <td>${escapeHtml(contact.role || contact.position || '')}</td>
            <td>${escapeHtml(contact.phone || '-')}</td>
            <td>${escapeHtml(contact.email || '')}</td>
            <td>
                <button class="btn btn-sm btn-outline" onclick="editContact(${contact.id})">✏️ Editar</button>
                <button class="btn btn-sm btn-danger" onclick="deleteContact(${contact.id})">🗑️ Eliminar</button>
            </td>
        </tr>
    `).join('');
}

/**
 * Actualiza la tabla de recursos fijos
 */
function updateFixedResourcesTable() {
    const tbody = document.getElementById('fixedResourcesTableBody');
    
    if (fixedResources.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">No hay equipos registrados</td></tr>';
        return;
    }
    
    tbody.innerHTML = fixedResources.map(resource => {
        const statusClass = getStatusClass(resource.status);
        const lastMaintenance = resource.last_maintenance_date 
            ? new Date(resource.last_maintenance_date).toLocaleDateString('es-CR')
            : '-';
        
        return `
            <tr>
                <td>${escapeHtml(resource.inventory_code || '')}</td>
                <td>${escapeHtml(resource.name || '')}</td>
                <td><span class="badge ${statusClass}">${escapeHtml(resource.status || '')}</span></td>
                <td>${lastMaintenance}</td>
                <td>
                    <button class="btn btn-sm btn-outline" onclick="editFixedResource(${resource.id})">✏️ Editar</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteFixedResource(${resource.id})">🗑️ Eliminar</button>
                </td>
            </tr>
        `;
    }).join('');
}

/**
 * Actualiza la tabla de consumibles
 */
function updateConsumablesTable() {
    const tbody = document.getElementById('consumablesTableBody');
    
    if (consumables.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">No hay materiales registrados</td></tr>';
        return;
    }
    
    tbody.innerHTML = consumables.map(consumable => {
        const quantity = parseFloat(consumable.qty_available || consumable.quantity || 0);
        const reorderPoint = parseFloat(consumable.reorder_point || 0);
        let status = 'normal';
        let statusText = 'Normal';
        let statusClass = 'badge-success';
        
        if (quantity === 0) {
            status = 'out';
            statusText = 'Agotado';
            statusClass = 'badge-error';
        } else if (quantity <= reorderPoint) {
            status = 'low';
            statusText = 'Bajo Stock';
            statusClass = 'badge-warning';
        }
        
        return `
            <tr>
                <td>${escapeHtml(consumable.name || '')}</td>
                <td>${quantity.toFixed(2)}</td>
                <td>${escapeHtml(consumable.unit || '')}</td>
                <td>${reorderPoint.toFixed(2)}</td>
                <td><span class="badge ${statusClass}">${statusText}</span></td>
                <td>
                    <button class="btn btn-sm btn-outline" onclick="editConsumable(${consumable.id})">✏️ Editar</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteConsumable(${consumable.id})">🗑️ Eliminar</button>
                </td>
            </tr>
        `;
    }).join('');
}

/**
 * Actualiza el formulario de políticas
 */
function updatePoliciesForm(policies, hours) {
    if (!policies && !hours) return;
    
    // Políticas - Parsear texto de academic_requirements y safety_requirements
    if (policies) {
        // Intentar parsear academic_requirements (formato: "Cursos previos: ...\nInducción: ...\nCertificaciones: ...")
        const academicText = policies.academic_requirements || '';
        const coursesMatch = academicText.match(/Cursos previos:\s*(.+?)(?:\n|$)/);
        const inductionMatch = academicText.match(/Inducción obligatoria:\s*(Sí|No)/);
        const certsMatch = academicText.match(/Certificaciones:\s*(.+?)(?:\n|$)/);
        
        document.getElementById('requiredCourses').value = coursesMatch ? coursesMatch[1].trim() : '';
        document.getElementById('inductionRequired').checked = inductionMatch ? inductionMatch[1] === 'Sí' : false;
        document.getElementById('requiredCertifications').value = certsMatch ? certsMatch[1].trim() : '';
        
        // Parsear safety_requirements
        const safetyText = policies.safety_requirements || '';
        const ppeMatch = safetyText.match(/EPP requerido:\s*(Sí|No)/);
        const riskMatch = safetyText.match(/Nivel de riesgo:\s*(.+?)(?:\n|$)/);
        const restrictionsMatch = safetyText.match(/Restricciones:\s*(.+?)(?:\n|$)/);
        
        document.getElementById('ppeRequired').checked = ppeMatch ? ppeMatch[1] === 'Sí' : false;
        document.getElementById('riskLevel').value = riskMatch ? riskMatch[1].trim() : 'Bajo';
        document.getElementById('safetyRestrictions').value = restrictionsMatch ? restrictionsMatch[1].trim() : '';
        
        document.getElementById('maxCapacity').value = policies.capacity_max || '';
    }
    
    // Horarios - La API devuelve un array de objetos
    if (hours && Array.isArray(hours)) {
        // Extraer días únicos y horarios
        const uniqueDays = [...new Set(hours.map(h => h.day_of_week))];
        const firstHour = hours[0];
        
        document.querySelectorAll('input[name="days"]').forEach(checkbox => {
            checkbox.checked = uniqueDays.includes(checkbox.value);
        });
        
        if (firstHour) {
            document.getElementById('openingTime').value = firstHour.opens ? firstHour.opens.substring(0, 5) : '';
            document.getElementById('closingTime').value = firstHour.closes ? firstHour.closes.substring(0, 5) : '';
        }
    }
}

/**
 * Actualiza la tabla de historial
 */
function updateHistoryTable() {
    const tbody = document.getElementById('historyTableBody');
    
    if (history.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center">No hay historial registrado</td></tr>';
        return;
    }
    
    tbody.innerHTML = history.map(entry => {
        const date = new Date(entry.created_at || entry.date).toLocaleString('es-CR');
        return `
            <tr>
                <td>${date}</td>
                <td>${escapeHtml(entry.user_name || entry.user || 'Sistema')}</td>
                <td><span class="badge badge-info">${escapeHtml(entry.action || '')}</span></td>
                <td>${escapeHtml(entry.detail || entry.description || '-')}</td>
            </tr>
        `;
    }).join('');
}

/**
 * Configura los event listeners
 */
function setupEventListeners() {
    // Botones de modo edición
    document.getElementById('btnEditMode').addEventListener('click', () => {
        setEditMode(true);
    });
    
    document.getElementById('btnSaveChanges').addEventListener('click', async () => {
        await saveLabProfile();
    });
    
    document.getElementById('btnCancelEdit').addEventListener('click', () => {
        setEditMode(false);
        updateLabProfile(currentLabData);
    });
    
    // Contactos
    document.getElementById('btnAddContact').addEventListener('click', () => {
        openContactModal();
    });
    
    document.getElementById('btnSaveContact').addEventListener('click', async () => {
        await saveContact();
    });
    
    // Recursos fijos
    document.getElementById('btnAddFixedResource').addEventListener('click', () => {
        openFixedResourceModal();
    });
    
    document.getElementById('btnSaveFixedResource').addEventListener('click', async () => {
        await saveFixedResource();
    });
    
    // Consumibles
    document.getElementById('btnAddConsumable').addEventListener('click', () => {
        openConsumableModal();
    });
    
    document.getElementById('btnSaveConsumable').addEventListener('click', async () => {
        await saveConsumable();
    });
    
    // Políticas
    document.getElementById('policiesForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await savePolicies();
    });
    
    // Historial
    document.getElementById('btnFilterHistory').addEventListener('click', () => {
        filterHistory();
    });
    
    document.getElementById('btnClearHistoryFilters').addEventListener('click', () => {
        clearHistoryFilters();
    });
    
    document.getElementById('btnExportPDF').addEventListener('click', () => {
        exportHistory('pdf');
    });
    
    document.getElementById('btnExportExcel').addEventListener('click', () => {
        exportHistory('excel');
    });
    
    // Filtros
    document.getElementById('filterFixedStatus').addEventListener('change', filterFixedResources);
    document.getElementById('searchFixedResource').addEventListener('input', filterFixedResources);
    document.getElementById('filterConsumableStatus').addEventListener('change', filterConsumables);
    document.getElementById('searchConsumable').addEventListener('input', filterConsumables);
}

/**
 * Inicializa el sistema de tabs
 */
function initializeTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.getAttribute('data-tab');
            
            // Remover active de todos
            tabButtons.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            // Agregar active al seleccionado
            btn.classList.add('active');
            document.getElementById(`tab-${targetTab}`).classList.add('active');
        });
    });
}

/**
 * Modo edición
 */
function setEditMode(enabled) {
    isEditMode = enabled;
    setFormReadOnly(!enabled);
    
    document.getElementById('btnEditMode').style.display = enabled ? 'none' : 'inline-block';
    document.getElementById('btnSaveChanges').style.display = enabled ? 'inline-block' : 'none';
    document.getElementById('btnCancelEdit').style.display = enabled ? 'inline-block' : 'none';
}

function setFormReadOnly(readonly) {
    const form = document.getElementById('labProfileForm');
    const inputs = form.querySelectorAll('input, textarea, select');
    inputs.forEach(input => {
        input.disabled = readonly;
    });
}

/**
 * Guarda el perfil del laboratorio
 */
async function saveLabProfile() {
    try {
        const form = document.getElementById('labProfileForm');
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);
        
        // Validaciones
        if (!data.name || !data.code || !data.location || !data.department_id) {
            showAlert('Por favor completa todos los campos obligatorios', 'error');
            return;
        }
        
        showLoading(true);
        
        const response = await fetch(`${API_CONFIG.BASE_URL}/labs/${currentLabId}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify(data)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al guardar');
        }
        
        const updatedLab = await response.json();
        currentLabData = updatedLab;
        
        showAlert('Perfil actualizado correctamente', 'success');
        setEditMode(false);
        updateLabProfile(updatedLab);
        
        showLoading(false);
    } catch (error) {
        console.error('Error guardando perfil:', error);
        showAlert(error.message || 'Error al guardar el perfil', 'error');
        showLoading(false);
    }
}

/**
 * Contactos
 */
function openContactModal(contactId = null) {
    const modal = document.getElementById('contactModal');
    const form = document.getElementById('contactForm');
    const title = document.getElementById('contactModalTitle');
    
    if (contactId) {
        const contact = contacts.find(c => c.id === contactId);
        if (contact) {
            title.textContent = 'Editar Contacto';
            document.getElementById('contactId').value = contact.id;
            document.getElementById('contactName').value = contact.name || '';
            document.getElementById('contactPosition').value = contact.role || contact.position || '';
            document.getElementById('contactPhone').value = contact.phone || '';
            document.getElementById('contactEmail').value = contact.email || '';
        }
    } else {
        title.textContent = 'Agregar Contacto';
        form.reset();
        document.getElementById('contactId').value = '';
    }
    
    modal.style.display = 'block';
}

window.editContact = function(contactId) {
    openContactModal(contactId);
};

async function saveContact() {
    try {
        const form = document.getElementById('contactForm');
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);
        const contactId = data.id;
        
        // Validaciones
        if (!data.name || !data.position || !data.email) {
            showAlert('Por favor completa todos los campos obligatorios', 'error');
            return;
        }
        
        // Validar correo institucional
        if (!data.email.match(/@(tec\.ac\.cr|estudiantec\.cr)$/)) {
            showAlert('El correo debe ser institucional del TEC (@tec.ac.cr o @estudiantec.cr)', 'error');
            return;
        }
        
        showLoading(true);
        
        // La API espera 'role' en lugar de 'position'
        const apiData = {
            name: data.name,
            role: data.position,  // Mapear position a role
            phone: data.phone || null,
            email: data.email
        };
        
        const url = contactId
            ? `${API_CONFIG.BASE_URL}/labs/${currentLabId}/contacts/${contactId}`
            : `${API_CONFIG.BASE_URL}/labs/${currentLabId}/contacts`;
        
        const method = contactId ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method,
            headers: getHeaders(),
            body: JSON.stringify(apiData)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al guardar contacto');
        }
        
        await loadLabData(currentLabId);
        closeModal('contactModal');
        showAlert('Contacto guardado correctamente', 'success');
        
        showLoading(false);
    } catch (error) {
        console.error('Error guardando contacto:', error);
        showAlert(error.message || 'Error al guardar el contacto', 'error');
        showLoading(false);
    }
}

window.deleteContact = async function(contactId) {
    if (!confirm('¿Está seguro de eliminar este contacto?')) return;
    
    try {
        showLoading(true);
        
        const response = await fetch(`${API_CONFIG.BASE_URL}/labs/${currentLabId}/contacts/${contactId}`, {
            method: 'DELETE',
            headers: getHeaders()
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al eliminar contacto');
        }
        
        await loadLabData(currentLabId);
        showAlert('Contacto eliminado correctamente', 'success');
        
        showLoading(false);
    } catch (error) {
        console.error('Error eliminando contacto:', error);
        showAlert(error.message || 'Error al eliminar el contacto', 'error');
        showLoading(false);
    }
};

/**
 * Recursos Fijos
 */
function openFixedResourceModal(resourceId = null) {
    const modal = document.getElementById('fixedResourceModal');
    const form = document.getElementById('fixedResourceForm');
    const title = document.getElementById('fixedResourceModalTitle');
    
    if (resourceId) {
        const resource = fixedResources.find(r => r.id === resourceId);
        if (resource) {
            title.textContent = 'Editar Equipo';
            document.getElementById('fixedResourceId').value = resource.id;
            document.getElementById('fixedResourceCode').value = resource.inventory_code || '';
            document.getElementById('fixedResourceName').value = resource.name || '';
            document.getElementById('fixedResourceDescription').value = resource.description || '';
            document.getElementById('fixedResourceStatus').value = resource.status || 'Disponible';
            if (resource.last_maintenance_date) {
                document.getElementById('fixedResourceLastMaintenance').value = 
                    resource.last_maintenance_date.substring(0, 10);
            }
        }
    } else {
        title.textContent = 'Agregar Equipo';
        form.reset();
        document.getElementById('fixedResourceId').value = '';
    }
    
    modal.style.display = 'block';
}

window.editFixedResource = function(resourceId) {
    openFixedResourceModal(resourceId);
};

async function saveFixedResource() {
    try {
        const form = document.getElementById('fixedResourceForm');
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);
        const resourceId = data.id;
        
        // Validaciones
        if (!data.inventory_code || !data.name || !data.status) {
            showAlert('Por favor completa todos los campos obligatorios', 'error');
            return;
        }
        
        showLoading(true);
        
        const url = resourceId
            ? `${API_CONFIG.BASE_URL}/labs/${currentLabId}/resources-fixed/${resourceId}`
            : `${API_CONFIG.BASE_URL}/labs/${currentLabId}/resources-fixed`;
        
        const method = resourceId ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method,
            headers: getHeaders(),
            body: JSON.stringify(data)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al guardar equipo');
        }
        
        await loadLabData(currentLabId);
        closeModal('fixedResourceModal');
        showAlert('Equipo guardado correctamente', 'success');
        
        showLoading(false);
    } catch (error) {
        console.error('Error guardando equipo:', error);
        showAlert(error.message || 'Error al guardar el equipo', 'error');
        showLoading(false);
    }
}

window.deleteFixedResource = async function(resourceId) {
    if (!confirm('¿Está seguro de eliminar este equipo?')) return;
    
    try {
        showLoading(true);
        
        const response = await fetch(`${API_CONFIG.BASE_URL}/labs/${currentLabId}/resources-fixed/${resourceId}`, {
            method: 'DELETE',
            headers: getHeaders()
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al eliminar equipo');
        }
        
        await loadLabData(currentLabId);
        showAlert('Equipo eliminado correctamente', 'success');
        
        showLoading(false);
    } catch (error) {
        console.error('Error eliminando equipo:', error);
        showAlert(error.message || 'Error al eliminar el equipo', 'error');
        showLoading(false);
    }
};

/**
 * Consumibles
 */
function openConsumableModal(consumableId = null) {
    const modal = document.getElementById('consumableModal');
    const form = document.getElementById('consumableForm');
    const title = document.getElementById('consumableModalTitle');
    
    if (consumableId) {
        const consumable = consumables.find(c => c.id === consumableId);
        if (consumable) {
            title.textContent = 'Editar Material Consumible';
            document.getElementById('consumableId').value = consumable.id;
            document.getElementById('consumableName').value = consumable.name || '';
            document.getElementById('consumableQuantity').value = consumable.qty_available || consumable.quantity || 0;
            document.getElementById('consumableUnit').value = consumable.unit || 'unidades';
            document.getElementById('consumableReorderPoint').value = consumable.reorder_point || 0;
            document.getElementById('consumableDescription').value = consumable.description || '';
        }
    } else {
        title.textContent = 'Agregar Material Consumible';
        form.reset();
        document.getElementById('consumableId').value = '';
    }
    
    modal.style.display = 'block';
}

window.editConsumable = function(consumableId) {
    openConsumableModal(consumableId);
};

async function saveConsumable() {
    try {
        const form = document.getElementById('consumableForm');
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);
        const consumableId = data.id;
        
        // Validaciones
        if (!data.name || !data.quantity || !data.unit || !data.reorder_point) {
            showAlert('Por favor completa todos los campos obligatorios', 'error');
            return;
        }
        
        // Validar valores numéricos
        if (parseFloat(data.quantity) < 0 || parseFloat(data.reorder_point) < 0) {
            showAlert('Las cantidades no pueden ser negativas', 'error');
            return;
        }
        
        showLoading(true);
        
        const url = consumableId
            ? `${API_CONFIG.BASE_URL}/labs/${currentLabId}/consumables/${consumableId}`
            : `${API_CONFIG.BASE_URL}/labs/${currentLabId}/consumables`;
        
        const method = consumableId ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method,
            headers: getHeaders(),
            body: JSON.stringify(data)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al guardar material');
        }
        
        await loadLabData(currentLabId);
        closeModal('consumableModal');
        showAlert('Material guardado correctamente', 'success');
        
        showLoading(false);
    } catch (error) {
        console.error('Error guardando material:', error);
        showAlert(error.message || 'Error al guardar el material', 'error');
        showLoading(false);
    }
}

window.deleteConsumable = async function(consumableId) {
    if (!confirm('¿Está seguro de eliminar este material?')) return;
    
    try {
        showLoading(true);
        
        const response = await fetch(`${API_CONFIG.BASE_URL}/labs/${currentLabId}/consumables/${consumableId}`, {
            method: 'DELETE',
            headers: getHeaders()
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al eliminar material');
        }
        
        await loadLabData(currentLabId);
        showAlert('Material eliminado correctamente', 'success');
        
        showLoading(false);
    } catch (error) {
        console.error('Error eliminando material:', error);
        showAlert(error.message || 'Error al eliminar el material', 'error');
        showLoading(false);
    }
};

/**
 * Políticas
 */
async function savePolicies() {
    try {
        const form = document.getElementById('policiesForm');
        const formData = new FormData(form);
        
        // Obtener días seleccionados
        const days = Array.from(document.querySelectorAll('input[name="days"]:checked'))
            .map(cb => cb.value);
        
        // Datos de políticas - La API espera academic_requirements y safety_requirements como texto
        const academicRequirements = [
            `Cursos previos: ${formData.get('required_courses') || 'Ninguno'}`,
            `Inducción obligatoria: ${formData.get('induction_required') === 'on' ? 'Sí' : 'No'}`,
            `Certificaciones: ${formData.get('required_certifications') || 'Ninguna'}`
        ].join('\n');
        
        const safetyRequirements = [
            `EPP requerido: ${formData.get('ppe_required') === 'on' ? 'Sí' : 'No'}`,
            `Nivel de riesgo: ${formData.get('risk_level') || 'Bajo'}`,
            `Restricciones: ${formData.get('safety_restrictions') || 'Ninguna'}`
        ].join('\n');
        
        const policiesData = {
            academic_requirements: academicRequirements,
            safety_requirements: safetyRequirements,
            capacity_max: parseInt(formData.get('max_capacity')) || 1
        };
        
        // Datos de horarios - La API espera un array de objetos con day_of_week, opens, closes
        const openingTime = formData.get('opening_time') || '08:00';
        const closingTime = formData.get('closing_time') || '17:00';
        
        const hoursArray = days.map(day => ({
            day_of_week: day,
            opens: openingTime,
            closes: closingTime
        }));
        
        showLoading(true);
        
        // Guardar en paralelo
        const [policiesRes, hoursRes] = await Promise.all([
            fetch(`${API_CONFIG.BASE_URL}/labs/${currentLabId}/policies`, {
                method: 'PUT',
                headers: getHeaders(),
                body: JSON.stringify(policiesData)
            }),
            fetch(`${API_CONFIG.BASE_URL}/labs/${currentLabId}/hours`, {
                method: 'PUT',
                headers: getHeaders(),
                body: JSON.stringify({ hours: hoursArray })  // El controlador espera { hours: [...] }
            })
        ]);
        
        if (!policiesRes.ok || !hoursRes.ok) {
            throw new Error('Error al guardar políticas');
        }
        
        showAlert('Políticas guardadas correctamente', 'success');
        await loadLabData(currentLabId);
        
        showLoading(false);
    } catch (error) {
        console.error('Error guardando políticas:', error);
        showAlert('Error al guardar las políticas', 'error');
        showLoading(false);
    }
}

/**
 * Historial
 */
function filterHistory() {
    const dateFrom = document.getElementById('filterHistoryDateFrom').value;
    const dateTo = document.getElementById('filterHistoryDateTo').value;
    const action = document.getElementById('filterHistoryAction').value;
    const user = document.getElementById('filterHistoryUser').value.toLowerCase();
    
    let filtered = [...history];
    
    if (dateFrom) {
        filtered = filtered.filter(h => new Date(h.created_at || h.date) >= new Date(dateFrom));
    }
    
    if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59);
        filtered = filtered.filter(h => new Date(h.created_at || h.date) <= toDate);
    }
    
    if (action) {
        filtered = filtered.filter(h => (h.action || '').includes(action));
    }
    
    if (user) {
        filtered = filtered.filter(h => 
            (h.user_name || h.user || '').toLowerCase().includes(user)
        );
    }
    
    // Actualizar tabla con datos filtrados
    const tbody = document.getElementById('historyTableBody');
    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center">No se encontraron resultados</td></tr>';
        return;
    }
    
    tbody.innerHTML = filtered.map(entry => {
        const date = new Date(entry.created_at || entry.date).toLocaleString('es-CR');
        return `
            <tr>
                <td>${date}</td>
                <td>${escapeHtml(entry.user_name || entry.user || 'Sistema')}</td>
                <td><span class="badge badge-info">${escapeHtml(entry.action || '')}</span></td>
                <td>${escapeHtml(entry.detail || entry.description || '-')}</td>
            </tr>
        `;
    }).join('');
}

function clearHistoryFilters() {
    document.getElementById('filterHistoryDateFrom').value = '';
    document.getElementById('filterHistoryDateTo').value = '';
    document.getElementById('filterHistoryAction').value = '';
    document.getElementById('filterHistoryUser').value = '';
    updateHistoryTable();
}

function filterFixedResources() {
    const status = document.getElementById('filterFixedStatus').value;
    const search = document.getElementById('searchFixedResource').value.toLowerCase();
    
    let filtered = [...fixedResources];
    
    if (status) {
        filtered = filtered.filter(r => r.status === status);
    }
    
    if (search) {
        filtered = filtered.filter(r => 
            (r.inventory_code || '').toLowerCase().includes(search) ||
            (r.name || '').toLowerCase().includes(search)
        );
    }
    
    const tbody = document.getElementById('fixedResourcesTableBody');
    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">No se encontraron resultados</td></tr>';
        return;
    }
    
    tbody.innerHTML = filtered.map(resource => {
        const statusClass = getStatusClass(resource.status);
        const lastMaintenance = resource.last_maintenance_date 
            ? new Date(resource.last_maintenance_date).toLocaleDateString('es-CR')
            : '-';
        
        return `
            <tr>
                <td>${escapeHtml(resource.inventory_code || '')}</td>
                <td>${escapeHtml(resource.name || '')}</td>
                <td><span class="badge ${statusClass}">${escapeHtml(resource.status || '')}</span></td>
                <td>${lastMaintenance}</td>
                <td>
                    <button class="btn btn-sm btn-outline" onclick="editFixedResource(${resource.id})">✏️ Editar</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteFixedResource(${resource.id})">🗑️ Eliminar</button>
                </td>
            </tr>
        `;
    }).join('');
}

function filterConsumables() {
    const status = document.getElementById('filterConsumableStatus').value;
    const search = document.getElementById('searchConsumable').value.toLowerCase();
    
    let filtered = [...consumables];
    
    if (status) {
        filtered = filtered.filter(c => {
            const quantity = parseFloat(c.qty_available || c.quantity || 0);
            const reorderPoint = parseFloat(c.reorder_point || 0);
            
            if (status === 'out') return quantity === 0;
            if (status === 'low') return quantity > 0 && quantity <= reorderPoint;
            if (status === 'normal') return quantity > reorderPoint;
            return true;
        });
    }
    
    if (search) {
        filtered = filtered.filter(c => 
            (c.name || '').toLowerCase().includes(search)
        );
    }
    
    const tbody = document.getElementById('consumablesTableBody');
    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">No se encontraron resultados</td></tr>';
        return;
    }
    
    tbody.innerHTML = filtered.map(consumable => {
        const quantity = parseFloat(consumable.qty_available || consumable.quantity || 0);
        const reorderPoint = parseFloat(consumable.reorder_point || 0);
        let status = 'normal';
        let statusText = 'Normal';
        let statusClass = 'badge-success';
        
        if (quantity === 0) {
            status = 'out';
            statusText = 'Agotado';
            statusClass = 'badge-error';
        } else if (quantity <= reorderPoint) {
            status = 'low';
            statusText = 'Bajo Stock';
            statusClass = 'badge-warning';
        }
        
        return `
            <tr>
                <td>${escapeHtml(consumable.name || '')}</td>
                <td>${quantity.toFixed(2)}</td>
                <td>${escapeHtml(consumable.unit || '')}</td>
                <td>${reorderPoint.toFixed(2)}</td>
                <td><span class="badge ${statusClass}">${statusText}</span></td>
                <td>
                    <button class="btn btn-sm btn-outline" onclick="editConsumable(${consumable.id})">✏️ Editar</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteConsumable(${consumable.id})">🗑️ Eliminar</button>
                </td>
            </tr>
        `;
    }).join('');
}

async function exportHistory(format) {
    try {
        if (!currentLabId) {
            showAlert('No hay laboratorio seleccionado', 'error');
            return;
        }
        
        showLoading(true);
        
        // Aplicar filtros si existen antes de exportar
        const dateFrom = document.getElementById('filterHistoryDateFrom').value;
        const dateTo = document.getElementById('filterHistoryDateTo').value;
        const action = document.getElementById('filterHistoryAction').value;
        const user = document.getElementById('filterHistoryUser').value;
        
        // Construir query params
        const params = new URLSearchParams();
        if (dateFrom) params.append('dateFrom', dateFrom);
        if (dateTo) params.append('dateTo', dateTo);
        if (action) params.append('action', action);
        if (user) params.append('user', user);
        
        const queryString = params.toString();
        const endpoint = format === 'excel'
            ? `${API_CONFIG.BASE_URL}/labs/${currentLabId}/history/export/excel${queryString ? '?' + queryString : ''}`
            : `${API_CONFIG.BASE_URL}/labs/${currentLabId}/history/export/pdf${queryString ? '?' + queryString : ''}`;
        
        const response = await fetch(endpoint, {
            method: 'GET',
            headers: getHeaders()
        });
        
        if (!response.ok) {
            let errorMessage = 'Error al generar el archivo';
            try {
                const error = await response.json();
                errorMessage = error.error || errorMessage;
            } catch (e) {
                // Si no es JSON, usar el texto de respuesta
                const text = await response.text();
                if (text) errorMessage = text;
            }
            throw new Error(errorMessage);
        }
        
        // Obtener el blob
        const blob = await response.blob();
        
        // Verificar que el blob no esté vacío
        if (blob.size === 0) {
            throw new Error('El archivo generado está vacío');
        }
        
        // Crear URL temporal y descargar
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        
        // Obtener nombre del archivo del header Content-Disposition o usar uno por defecto
        const contentDisposition = response.headers.get('Content-Disposition');
        let filename = `historial_lab_${currentLabId}_${Date.now()}.${format === 'excel' ? 'xlsx' : 'pdf'}`;
        
        if (contentDisposition) {
            const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
            if (filenameMatch && filenameMatch[1]) {
                filename = filenameMatch[1].replace(/['"]/g, '');
            }
        }
        
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        showAlert(`Archivo ${format.toUpperCase()} generado y descargado correctamente`, 'success');
        showLoading(false);
    } catch (error) {
        console.error('Error exportando historial:', error);
        showAlert(error.message || `Error al exportar el historial en formato ${format.toUpperCase()}`, 'error');
        showLoading(false);
    }
}

/**
 * Utilidades
 */
function getHeaders() {
    const headers = {
        'Content-Type': 'application/json'
    };
    
    const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    return headers;
}

function showAlert(message, type = 'info') {
    const container = document.getElementById('alertContainer');
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;
    
    container.innerHTML = '';
    container.appendChild(alert);
    
    setTimeout(() => {
        alert.remove();
    }, 5000);
}

function showLoading(show) {
    // Implementar indicador de carga si es necesario
    if (show) {
        document.body.style.cursor = 'wait';
    } else {
        document.body.style.cursor = 'default';
    }
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function getStatusClass(status) {
    const statusMap = {
        'Disponible': 'badge-success',
        'En mantenimiento': 'badge-warning',
        'Inactivo': 'badge-error'
    };
    return statusMap[status] || 'badge-secondary';
}

// Cerrar modales al hacer clic fuera
window.onclick = function(event) {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
};

// Exportar logout para uso global
window.logout = logout;

