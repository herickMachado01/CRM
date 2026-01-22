
import { fetchLeads, updateLeadStatus, createLead, deleteLead } from './leads.js';
import { ui } from './ui.js';
import { checkSession, logout } from './auth.js';
import { setupSearch, setupFilterButton } from './filters.js';
import { exportLeadsToCSV } from './export.js';
import { supabase } from './supabase.js';

// Ensure session is valid
checkSession();

let leads = [];
let draggingCard = null;

// Initial load
initKanban();

async function initKanban() {
    // Fetch data
    leads = await fetchLeads();
    // Cache original leads for filtering
    const originalLeads = [...leads];

    renderBoard(leads); // Pass specific leads to render
    setupDragAndDrop();

    // Setup Filters
    setupSearch(originalLeads, (filteredLeads) => {
        renderBoard(filteredLeads);
    });

    setupFilterButton(originalLeads, (filteredLeads) => {
        renderBoard(filteredLeads);
    });


    addExportButton();
    setupNewLeadModal();
    setupImportModal();

    setupLogout();
}

function setupImportModal() {
    const btn = document.getElementById('importLeadBtn');
    if (!btn) return;

    let parsedLeads = [];

    btn.addEventListener('click', () => {
        parsedLeads = []; // Reset

        const content = `
            <div class="space-y-4">
                <div class="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:bg-gray-50 transition-colors cursor-pointer" id="modal-drop-zone">
                    <svg class="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                        <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                    </svg>
                    <div class="mt-1 text-sm text-gray-600">
                        <span class="font-medium text-brand-600 hover:text-brand-500">Clique para upload</span> ou arraste o arquivo
                    </div>
                    <p class="text-xs text-gray-500">XLSX ou CSV até 5MB</p>
                    <input id="modal-file-upload" type="file" class="hidden" accept=".csv, .xlsx, .xls">
                </div>
                
                <div id="file-info" class="hidden flex items-center justify-between bg-blue-50 p-3 rounded-lg border border-blue-100">
                    <div class="flex items-center">
                        <svg class="h-5 w-5 text-blue-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span id="filename-display" class="text-sm font-medium text-blue-900 truncate max-w-[200px]"></span>
                    </div>
                    <span id="lead-count-badge" class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    </span>
                </div>
            </div>
        `;

        openModal('Importar Leads', content, async () => {
            if (parsedLeads.length === 0) {
                ui.showToast('Selecione um arquivo válido primeiro', 'error');
                return;
            }
            await processImportBatch(parsedLeads);
        });

        // Setup File Interactions
        const dropZone = document.getElementById('modal-drop-zone');
        const fileInput = document.getElementById('modal-file-upload');
        const confirmBtn = document.getElementById('modalConfirmBtn');

        if (confirmBtn) confirmBtn.innerText = "Confirmar Importação";

        dropZone.onclick = () => fileInput.click();

        fileInput.onchange = (e) => handleFile(e.target.files[0]);

        dropZone.ondragover = (e) => { e.preventDefault(); dropZone.classList.add('border-brand-500', 'bg-brand-50'); };
        dropZone.ondragleave = (e) => { e.preventDefault(); dropZone.classList.remove('border-brand-500', 'bg-brand-50'); };
        dropZone.ondrop = (e) => {
            e.preventDefault();
            dropZone.classList.remove('border-brand-500', 'bg-brand-50');
            handleFile(e.dataTransfer.files[0]);
        };

        function handleFile(file) {
            if (!file) return;

            ui.setLoading('modalConfirmBtn', true); // Visual feedback

            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                    const json = XLSX.utils.sheet_to_json(firstSheet);

                    if (json.length === 0) throw new Error("Arquivo vazio");

                    parsedLeads = normalizeData(json);

                    // Update UI
                    document.getElementById('file-info').classList.remove('hidden');
                    document.getElementById('filename-display').innerText = file.name;
                    document.getElementById('lead-count-badge').innerText = `${parsedLeads.length} leads`;

                    if (confirmBtn) {
                        confirmBtn.innerText = `Importar ${parsedLeads.length} Leads`;
                        confirmBtn.classList.remove('opacity-50', 'cursor-not-allowed');
                    }
                    ui.showToast(`${parsedLeads.length} leads identificados`, 'success');

                } catch (err) {
                    console.error(err);
                    ui.showToast('Erro ao ler arquivo: ' + err.message, 'error');
                    parsedLeads = [];
                    document.getElementById('file-info').classList.add('hidden');
                } finally {
                    ui.setLoading('modalConfirmBtn', false);
                }
            };
            reader.readAsArrayBuffer(file);
        }
    });
}

function normalizeData(json) {
    return json.map(row => {
        const keys = Object.keys(row);
        const getVal = (key) => {
            const actualKey = keys.find(k => k.toLowerCase().includes(key));
            return actualKey ? row[actualKey] : '';
        };
        return {
            name: getVal('nome') || getVal('name') || 'Sem Nome',
            email: getVal('email') || '',
            phone: getVal('telefone') || getVal('phone') || '',
            company: getVal('empresa') || getVal('company') || '',
            status: 'novo',
            source: 'importacao',
            created_at: new Date().toISOString()
        };
    });
}

async function processImportBatch(leadsToImport) {
    ui.setLoading('modalConfirmBtn', true);

    let success = 0;
    let errors = 0;

    // Parallel execution for speed
    const promises = leadsToImport.map(async (lead) => {
        // Assign user_id
        lead.user_id = (await supabase.auth.getUser()).data.user?.id;
        return createLead(lead);
    });

    const results = await Promise.all(promises);

    results.forEach(res => {
        if (res.error) errors++;
        else success++;
    });

    ui.setLoading('modalConfirmBtn', false);
    closeModal();
    ui.showToast(`Importação: ${success} sucessos, ${errors} falhas`, success > 0 ? 'success' : 'error');

    // Refresh
    leads = await fetchLeads();
    renderBoard(leads);
}




function setupLogout() {
    const btns = [document.getElementById('logoutBtn'), document.getElementById('logoutBtnMain')];

    btns.forEach(btn => {
        if (btn) {
            btn.addEventListener('click', logout);
        }
    });
}

function setupNewLeadModal() {
    const btn = document.getElementById('newLeadBtn');
    if (!btn) return;

    btn.addEventListener('click', () => {
        openModal('Novo Lead', getNewLeadForm(), async () => {
            await handleNewLeadSubmit();
        });
    });
}

function getNewLeadForm() {
    return `
        <form id="newLeadForm" class="space-y-4">
            <div>
                <label class="block text-sm font-medium text-gray-700">Nome</label>
                <input type="text" id="leadName" required class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm border p-2">
            </div>
            <div>
                 <label class="block text-sm font-medium text-gray-700">Email</label>
                 <input type="email" id="leadEmail" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm border p-2">
            </div>
            <div>
                 <label class="block text-sm font-medium text-gray-700">Empresa</label>
                 <input type="text" id="leadCompany" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm border p-2">
            </div>
            <div>
                 <label class="block text-sm font-medium text-gray-700">Telefone</label>
                 <input type="text" id="leadPhone" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm border p-2">
            </div>
            <div>
                 <label class="block text-sm font-medium text-gray-700">Origem</label>
                 <select id="leadSource" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm border p-2">
                    <option value="manual">Manual</option>
                    <option value="google">Google</option>
                    <option value="linkedin">LinkedIn</option>
                    <option value="indicacao">Indicação</option>
                    <option value="site">Site</option>
                 </select>
            </div>
        </form>
    `;
}

async function handleNewLeadSubmit() {
    const name = document.getElementById('leadName').value;
    const email = document.getElementById('leadEmail').value;
    const company = document.getElementById('leadCompany').value;
    const phone = document.getElementById('leadPhone').value;
    const source = document.getElementById('leadSource').value || 'manual';

    if (!name) {
        ui.showToast('Nome é obrigatório', 'error');
        return;
    }

    ui.setLoading('modalConfirmBtn', true);

    const { data, error } = await createLead({
        name,
        email,
        company,
        phone,
        source,
        status: 'novo',
        created_at: new Date(),
        user_id: (await supabase.auth.getUser()).data.user?.id
    });

    ui.setLoading('modalConfirmBtn', false);

    if (!error) {
        closeModal();
        ui.showToast('Lead criado com sucesso!');
        // Refresh board
        const newLeads = await fetchLeads(); // Fetch all again or push local
        // let's fetch to be safe with IDs and DB triggers
        leads = newLeads;
        renderBoard(leads);
    }
}

// Generic Modal Helpers
function openModal(title, content, onConfirm) {
    const overlay = document.getElementById('modalOverlay');
    const modalContent = document.getElementById('modalContent');

    document.getElementById('modalTitle').innerText = title;
    document.getElementById('modalBody').innerHTML = content;

    const footer = document.getElementById('modalFooter');
    footer.innerHTML = `
        <button type="button" id="modalConfirmBtn" class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-brand-600 text-base font-medium text-white hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 sm:ml-3 sm:w-auto sm:text-sm">
            Salvar
            <div id="loader" class="hidden ml-2 w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
        </button>
        <button type="button" onclick="document.getElementById('modalOverlay').classList.add('hidden')" class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm">
            Cancelar
        </button>
    `;

    document.getElementById('modalConfirmBtn').onclick = onConfirm;

    // Show
    overlay.classList.remove('hidden');
    // Simple animation logic
    setTimeout(() => {
        overlay.classList.remove('opacity-0');
        modalContent.classList.remove('opacity-0', 'translate-y-4', 'sm:translate-y-0', 'sm:scale-95');
    }, 10);
}

function closeModal() {
    const overlay = document.getElementById('modalOverlay');
    const modalContent = document.getElementById('modalContent');

    overlay.classList.add('opacity-0');
    modalContent.classList.add('opacity-0', 'translate-y-4', 'sm:translate-y-0', 'sm:scale-95');

    setTimeout(() => {
        overlay.classList.add('hidden');
    }, 300);
}

// Make closeModal global for the cancel button inline onclick
window.closeModal = closeModal;
window.openModal = openModal;


function addExportButton() {
    const toolbar = document.querySelector('.flex.items-center.space-x-4');
    if (toolbar) {
        const btn = document.createElement('button');
        btn.innerHTML = `
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4-4m0 0L8 8m4-4v12"/>
            </svg>
            Exportar
        `;
        btn.className = "px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 shadow-sm flex items-center ml-2";
        btn.onclick = exportLeadsToCSV;
        toolbar.appendChild(btn);
    }
}

function renderBoard(leadsToRender) {
    // Default to global if not passed (legacy safety, though initKanban passes it)
    const data = leadsToRender || leads;

    // Clear columns
    ['novo', 'contato', 'proposta', 'fechado'].forEach(status => {
        const col = document.getElementById(`col-${status}`);
        if (col) col.innerHTML = '';
        const counter = document.getElementById(`count-${status}`);
        if (counter) counter.innerText = '0';
    });

    // Render leads
    data.forEach(lead => {
        const cardHTML = createCardHTML(lead);
        const col = document.getElementById(`col-${lead.status}`);
        if (col) {
            col.insertAdjacentHTML('beforeend', cardHTML);
        }
    });

    updateCounters(data);

    // Re-attach event listeners to new cards if needed specific ones
    // But dragstart is bubbled or we can attach to document? 
    // HTML5 DnD usually requires events on the draggable element itself or delegated.
    // Let's attach to the cards we just created.
    document.querySelectorAll('[draggable="true"]').forEach(card => {
        card.addEventListener('dragstart', handleDragStart);
        card.addEventListener('dragend', handleDragEnd);
    });

    // Attach delete listeners
    document.querySelectorAll('.delete-lead-btn').forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            const id = btn.dataset.id;
            confirmDelete(id);
        };
    });
}

function createCardHTML(lead) {
    // Simple template replacement
    const date = new Date(lead.created_at).toLocaleDateString('pt-BR');

    return `
    <div class="bg-white p-4 rounded-lg shadow-sm border border-gray-200 cursor-move hover:shadow-md transition-shadow group mb-3" 
         draggable="true" 
         data-id="${lead.id}" 
         data-status="${lead.status}">
        <div class="flex justify-between items-start mb-2">
            <h4 class="text-sm font-semibold text-gray-900 group-hover:text-brand-600 transition-colors">${lead.name}</h4>
        </div>
        
        <p class="text-xs text-gray-500 mb-3 truncate">${lead.company || 'Sem empresa'}</p>
        
        <div class="flex items-center justify-between mt-2 pt-2 border-t border-gray-50">
            <div class="flex items-center text-xs text-gray-400">
                <svg class="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                </svg>
                ${date}
            </div>
            
                <button class="delete-lead-btn text-gray-400 hover:text-red-600 transition-colors p-1 rounded hover:bg-red-50" data-id="${lead.id}" title="Excluir">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                </button>
                 <a href="lead.html?id=${lead.id}" class="text-xs font-medium text-brand-600 hover:text-brand-700 bg-brand-50 px-2 py-1 rounded flex items-center">
                    Ver
                </a>
            </div>
        </div>
    </div>
    `;
}

function updateCounters(currentLeads) {
    const data = currentLeads || leads;
    ['novo', 'contato', 'proposta', 'fechado'].forEach(status => {
        const count = data.filter(l => l.status === status).length;
        const el = document.getElementById(`count-${status}`);
        if (el) el.innerText = count;
    });
}

// --- Drag and Drop Logic ---

function setupDragAndDrop() {
    const columns = document.querySelectorAll('.kanban-column');

    columns.forEach(col => {
        col.addEventListener('dragover', handleDragOver);
        col.addEventListener('dragleave', handleDragLeave);
        col.addEventListener('drop', handleDrop);
    });

    setupAutoScroll();
    setupRealtimeSubscription();
}

function setupRealtimeSubscription() {
    supabase
        .channel('public:leads')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, payload => {
            handleRealtimeUpdate(payload);
        })
        .subscribe();
}

function handleRealtimeUpdate(payload) {
    const { eventType, new: newRecord, old: oldRecord } = payload;

    if (eventType === 'INSERT') {
        // Add to local list if not exists
        if (!leads.find(l => l.id === newRecord.id)) {
            leads.unshift(newRecord); // Add to top

            // Check if current filter allows showing it?
            // For simplicity, we just check if it matches current global status search?
            // Or easier: Just invoke renderBoard with current global leads list refetched?
            // Actually, manipulating DOM directly is smoother.

            const cardHTML = createCardHTML(newRecord);
            const col = document.getElementById(`col-${newRecord.status}`);
            if (col) {
                col.insertAdjacentHTML('afterbegin', cardHTML);
                updateCounters();

                // Re-attach listeners to the specific new card
                const newCard = col.querySelector(`[data-id="${newRecord.id}"]`);
                if (newCard) {
                    newCard.addEventListener('dragstart', handleDragStart);
                    newCard.addEventListener('dragend', handleDragEnd);
                }
            }
        }
    }
    else if (eventType === 'UPDATE') {
        const index = leads.findIndex(l => l.id === newRecord.id);
        if (index > -1) {
            const oldStatus = leads[index].status;
            leads[index] = newRecord; // Update local model

            // If status changed, move card
            if (oldStatus !== newRecord.status) {
                const card = document.querySelector(`[data-id="${newRecord.id}"]`);
                if (card) card.remove(); // Remove from old col

                const newCol = document.getElementById(`col-${newRecord.status}`);
                if (newCol) {
                    const cardHTML = createCardHTML(newRecord);
                    newCol.insertAdjacentHTML('beforeend', cardHTML);
                    // Re-attach listeners
                    const newCard = newCol.querySelector(`[data-id="${newRecord.id}"]`);
                    if (newCard) {
                        newCard.addEventListener('dragstart', handleDragStart);
                        newCard.addEventListener('dragend', handleDragEnd);
                    }
                }
            } else {
                // Update content if needed (name, company) - Optional optimization
                // For now, simpler to replace the card to ensure all fields update
                const card = document.querySelector(`[data-id="${newRecord.id}"]`);
                if (card) {
                    card.outerHTML = createCardHTML(newRecord);
                    // Re-attach
                    const newCard = document.querySelector(`[data-id="${newRecord.id}"]`);
                    if (newCard) {
                        newCard.addEventListener('dragstart', handleDragStart);
                        newCard.addEventListener('dragend', handleDragEnd);
                    }
                }
            }
            updateCounters();
        }
    }
    else if (eventType === 'DELETE') {
        const index = leads.findIndex(l => l.id === oldRecord.id);
        if (index > -1) {
            leads.splice(index, 1);
            const card = document.querySelector(`[data-id="${oldRecord.id}"]`);
            if (card) card.remove();
            updateCounters();
        }
    }
}


function setupAutoScroll() {
    // Auto-scroll logic for mobile/desktop dragging
    const main = document.querySelector('main');
    if (!main) return;

    let animationFrame;

    document.addEventListener('dragover', (e) => {
        // Only scroll if we are having a dragging card
        if (!draggingCard) return;

        const SCROLL_THRESHOLD = 100; // px from edge
        const SCROLL_SPEED = 10; // px per frame

        const rect = main.getBoundingClientRect();
        const y = e.clientY;

        cancelAnimationFrame(animationFrame);

        if (y < rect.top + SCROLL_THRESHOLD) {
            // Scroll Up
            scroll(-SCROLL_SPEED);
        } else if (y > rect.bottom - SCROLL_THRESHOLD) {
            // Scroll Down
            scroll(SCROLL_SPEED);
        }

        function scroll(amount) {
            main.scrollTop += amount;
            animationFrame = requestAnimationFrame(() => scroll(amount));
        }
    });

    document.addEventListener('dragend', () => {
        cancelAnimationFrame(animationFrame);
    });

    document.addEventListener('drop', () => {
        cancelAnimationFrame(animationFrame);
    });
}

function handleDragStart(e) {
    draggingCard = this;
    this.classList.add('opacity-50');
    e.dataTransfer.effectAllowed = 'move';
    // e.dataTransfer.setData('text/plain', this.dataset.id);
}

function handleDragEnd(e) {
    this.classList.remove('opacity-50');
    draggingCard = null;

    // Remove highlight from all columns
    document.querySelectorAll('.kanban-column').forEach(col => {
        col.classList.remove('bg-gray-100', 'ring-2', 'ring-brand-200');
    });
}

function handleDragOver(e) {
    e.preventDefault(); // Necessary to allow dropping
    this.classList.add('bg-gray-100', 'ring-2', 'ring-brand-200');
}

function handleDragLeave(e) {
    this.classList.remove('bg-gray-100', 'ring-2', 'ring-brand-200');
}

async function handleDrop(e) {
    e.preventDefault();
    this.classList.remove('bg-gray-100', 'ring-2', 'ring-brand-200');

    if (!draggingCard) return;

    const newStatus = this.dataset.status;
    const cardId = draggingCard.dataset.id;
    const oldStatus = draggingCard.dataset.status;

    if (newStatus === oldStatus) return;

    // Optimistic UI Update
    this.appendChild(draggingCard);
    draggingCard.dataset.status = newStatus;

    // Update local model
    const leadIndex = leads.findIndex(l => l.id == cardId); // loose equality for string/int safety
    if (leadIndex > -1) {
        leads[leadIndex].status = newStatus;
    }
    updateCounters();

    // Persist
    const { error } = await updateLeadStatus(cardId, newStatus);
    if (error) {
        // Revert (simplified)
        ui.showToast('Falha ao atualizar status', 'error');
        // Ideally move card back
    } else {
        ui.showToast('Status atualizado', 'success');
    }
}

function confirmDelete(id) {
    const content = `<p class="text-gray-600">Tem certeza que deseja excluir este lead? Esta ação não pode ser desfeita.</p>`;
    openModal('Excluir Lead', content, async () => {
        await handleDeleteConfirmed(id);
    });

    // Optional: Style the confirm button to red to indicate danger
    setTimeout(() => {
        const confirmBtn = document.getElementById('modalConfirmBtn');
        if (confirmBtn) {
            confirmBtn.classList.remove('bg-brand-600', 'hover:bg-brand-700');
            confirmBtn.classList.add('bg-red-600', 'hover:bg-red-700');
            confirmBtn.innerText = 'Excluir';
        }
    }, 10);
}

async function handleDeleteConfirmed(id) {
    ui.setLoading('modalConfirmBtn', true);
    const { error } = await deleteLead(id);
    ui.setLoading('modalConfirmBtn', false);

    if (!error) {
        closeModal();
        ui.showToast('Lead excluído permanentemente');
        // Update local state
        leads = leads.filter(l => String(l.id) !== String(id));
        renderBoard(leads);
    }
}
