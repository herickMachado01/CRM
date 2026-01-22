
import { fetchLeads } from './leads.js';
import { ui } from './ui.js';

export async function exportLeadsToCSV() {
    ui.showToast('Gerando exportação...', 'info');

    const leads = await fetchLeads();

    if (!leads || leads.length === 0) {
        ui.showToast('Nenhum dado para exportar', 'error');
        return;
    }

    // CSV Header
    const headers = ['Nome', 'Email', 'Telefone', 'Empresa', 'Status', 'Origem', 'Data Criação'];

    // Map data to rows
    const rows = leads.map(lead => [

        `"${lead.name || ''}"`, // Wrap in quotes to handle commas
        lead.email || '',
        lead.phone || '',
        `"${lead.company || ''}"`,
        lead.status,
        lead.source || '',
        new Date(lead.created_at).toLocaleDateString()
    ]);

    // Combine
    const csvContent = [
        headers.join(','),
        ...rows.map(r => r.join(','))
    ].join('\n');

    // Create Blob and Download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.setAttribute('href', url);
    link.setAttribute('download', `leads_export_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    ui.showToast('Download iniciado!', 'success');
}
