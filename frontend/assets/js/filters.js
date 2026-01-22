
export function setupSearch(leads, renderCallback) {
    const searchInput = document.querySelector('input[placeholder="Buscar leads..."]');

    if (!searchInput) return;

    searchInput.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        applyFilters(leads, term, renderCallback);
    });
}

// Global filter state
let currentSort = 'date_desc'; // date_desc, date_asc, name_asc
let currentDateRange = 'all'; // all, 7days, 30days
let currentStage = 'all';
let currentSource = 'all';

export function setupFilterButton(leads, renderCallback) {
    const btn = document.getElementById('filterBtn');
    if (!btn) return;

    btn.addEventListener('click', () => {
        const content = `
            <div class="space-y-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Ordenar por</label>
                    <select id="filterSort" class="block w-full border-gray-300 rounded-md shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm p-2 border">
                        <option value="date_desc" ${currentSort === 'date_desc' ? 'selected' : ''}>Mais recentes</option>
                        <option value="date_asc" ${currentSort === 'date_asc' ? 'selected' : ''}>Mais antigos</option>
                        <option value="name_asc" ${currentSort === 'name_asc' ? 'selected' : ''}>Nome (A-Z)</option>
                    </select>
                </div>
                 <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Estágio</label>
                    <select id="filterStage" class="block w-full border-gray-300 rounded-md shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm p-2 border">
                        <option value="all" ${currentStage === 'all' ? 'selected' : ''}>Todos</option>
                        <option value="novo" ${currentStage === 'novo' ? 'selected' : ''}>Novo</option>
                        <option value="contato" ${currentStage === 'contato' ? 'selected' : ''}>Contato</option>
                        <option value="proposta" ${currentStage === 'proposta' ? 'selected' : ''}>Proposta</option>
                        <option value="fechado" ${currentStage === 'fechado' ? 'selected' : ''}>Fechado</option>
                    </select>
                </div>
                 <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Origem</label>
                    <select id="filterSource" class="block w-full border-gray-300 rounded-md shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm p-2 border">
                        <option value="all" ${currentSource === 'all' ? 'selected' : ''}>Todas</option>
                        <option value="manual" ${currentSource === 'manual' ? 'selected' : ''}>Manual</option>
                        <option value="google" ${currentSource === 'google' ? 'selected' : ''}>Google</option>
                        <option value="linkedin" ${currentSource === 'linkedin' ? 'selected' : ''}>LinkedIn</option>
                        <option value="indicacao" ${currentSource === 'indicacao' ? 'selected' : ''}>Indicação</option>
                        <option value="site" ${currentSource === 'site' ? 'selected' : ''}>Site</option>
                        <option value="importacao" ${currentSource === 'importacao' ? 'selected' : ''}>Importação</option>
                    </select>
                </div>
                 <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Data de Criação</label>
                    <select id="filterDate" class="block w-full border-gray-300 rounded-md shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm p-2 border">
                        <option value="all" ${currentDateRange === 'all' ? 'selected' : ''}>Todo o período</option>
                        <option value="7days" ${currentDateRange === '7days' ? 'selected' : ''}>Últimos 7 dias</option>
                        <option value="30days" ${currentDateRange === '30days' ? 'selected' : ''}>Últimos 30 dias</option>
                    </select>
                </div>
            </div>
        `;

        if (window.openModal) {
            window.openModal('Filtrar Leads', content, () => {
                const sortDetail = document.getElementById('filterSort').value;
                const dateDetail = document.getElementById('filterDate').value;
                const stageDetail = document.getElementById('filterStage').value;
                const sourceDetail = document.getElementById('filterSource').value;

                currentSort = sortDetail;
                currentDateRange = dateDetail;
                currentStage = stageDetail;
                currentSource = sourceDetail;

                const searchVal = document.querySelector('input[placeholder="Buscar leads..."]')?.value.toLowerCase() || '';

                applyFilters(leads, searchVal, renderCallback);
                window.closeModal();
            });
        } else {
            console.error("openModal not found");
        }
    });
}

function applyFilters(allLeads, searchTerm, renderCallback) {
    let filtered = allLeads.filter(lead => {
        // Search Term
        const matchesTerm = (
            (lead.name && lead.name.toLowerCase().includes(searchTerm)) ||
            (lead.company && lead.company.toLowerCase().includes(searchTerm)) ||
            (lead.email && lead.email.toLowerCase().includes(searchTerm))
        );

        // Date Logic
        let matchesDate = true;
        if (currentDateRange !== 'all') {
            const date = new Date(lead.created_at);
            const now = new Date();
            const diffTime = Math.abs(now - date);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (currentDateRange === '7days' && diffDays > 7) matchesDate = false;
            if (currentDateRange === '30days' && diffDays > 30) matchesDate = false;
        }

        // Stage Logic
        let matchesStage = true;
        if (currentStage !== 'all') {
            matchesStage = lead.status === currentStage;
        }

        // Source Logic
        let matchesSource = true;
        if (currentSource !== 'all') {
            const leadSource = (lead.source || 'manual').toLowerCase();
            matchesSource = leadSource === currentSource;
        }

        return matchesTerm && matchesDate && matchesStage && matchesSource;
    });

    // Sorting
    filtered.sort((a, b) => {
        if (currentSort === 'date_desc') {
            return new Date(b.created_at) - new Date(a.created_at);
        }
        if (currentSort === 'date_asc') {
            return new Date(a.created_at) - new Date(b.created_at);
        }
        if (currentSort === 'name_asc') {
            return (a.name || '').localeCompare(b.name || '');
        }
        return 0;
    });

    renderCallback(filtered);
}
