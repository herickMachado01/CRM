
import { createLead } from './leads.js';
import { ui } from './ui.js';

let parsedData = [];

document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('file-upload');
    const dropZone = document.getElementById('drop-zone');
    const confirmBtn = document.getElementById('confirm-import-btn');

    if (fileInput) {
        fileInput.addEventListener('change', handleFileSelect);
    }

    if (dropZone) {
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('border-brand-500', 'bg-brand-50');
        });

        dropZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            dropZone.classList.remove('border-brand-500', 'bg-brand-50');
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('border-brand-500', 'bg-brand-50');
            const files = e.dataTransfer.files;
            if (files.length) handleFile(files[0]);
        });
    }

    if (confirmBtn) {
        confirmBtn.addEventListener('click', processImport);
    }
});

function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) handleFile(file);
}

function handleFile(file) {
    ui.showToast('Lendo arquivo...', 'info');

    const reader = new FileReader();

    reader.onload = (e) => {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });

            // Assume first sheet
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];

            // Parse to JSON
            const json = XLSX.utils.sheet_to_json(worksheet);

            if (json.length === 0) {
                ui.showToast('O arquivo está vazio', 'error');
                return;
            }

            parsedData = normalizeData(json);
            renderPreview(parsedData);

            document.getElementById('preview-area').classList.remove('hidden');
            ui.showToast(`Arquivo lido. ${parsedData.length} leads encontrados.`, 'success');

        } catch (err) {
            console.error(err);
            ui.showToast('Erro ao ler arquivo', 'error');
        }
    };

    reader.readAsArrayBuffer(file);
}

function normalizeData(json) {
    // Basic mapping - try to find columns case-insensitive
    return json.map(row => {
        // Create a normalized object with lowercase keys to help searching
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
            status: 'novo', // Default status
            created_at: new Date().toISOString()
        };
    });
}

function renderPreview(data) {
    const tbody = document.getElementById('preview-table-body');
    const countSpan = document.getElementById('preview-count');

    tbody.innerHTML = '';
    countSpan.textContent = data.length;

    // Show max 5 data points
    data.slice(0, 5).forEach(lead => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${lead.name}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${lead.email}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${lead.company}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                    ${lead.status}
                </span>
            </td>
        `;
        tbody.appendChild(tr);
    });

    if (data.length > 5) {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td colspan="4" class="px-6 py-4 text-center text-sm text-gray-500">... e mais ${data.length - 5} leads</td>`;
        tbody.appendChild(tr);
    }
}

async function processImport() {
    const btn = document.getElementById('confirm-import-btn');
    ui.setLoading('confirm-import-btn', true); // Note: custom handling needed as setLoading expects specific structure, but ui.js might just disable it if id matches, mostly.
    btn.disabled = true;
    btn.innerHTML = 'Importando...';

    let successCount = 0;
    let errorCount = 0;

    // Process in batches or one by one
    // For "Mini" CRM, one by one is fine but Promise.all is faster. 
    // Supabase has bulk insert, but createLead is singular.
    // Let's modify createLead or just use promise loop.

    // We will use a mock bulk insert logic if we were modifying leads.js, but here we just loop.

    const promises = parsedData.map(lead => createLead(lead));
    const results = await Promise.all(promises);

    results.forEach(res => {
        if (res.error) errorCount++;
        else successCount++;
    });

    ui.showToast(`Importação concluída: ${successCount} sucessos, ${errorCount} erros`, successCount > 0 ? 'success' : 'error');

    btn.disabled = false;
    btn.innerHTML = 'Importar Concluído';

    setTimeout(() => {
        btn.innerHTML = 'Confirmar Importação';
        // Reset or redirect?
        // window.location.href = 'dashboard.html';
    }, 2000);
}
