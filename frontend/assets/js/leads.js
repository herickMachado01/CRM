
import { supabase } from './supabase.js';
import { ui } from './ui.js';

// Table name: leads

export async function fetchLeads() {
    // Check if credentials are set (simple check based on placeholder)
    // Note: In a real app we might handle this differently, but for this demo:
    if (supabase.supabaseUrl.includes('YOUR_SUPABASE')) {
        console.warn('Using MOCK data for leads');
        return getMockLeads();
    }

    const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching leads:', error);
        ui.showToast('Erro ao carregar leads', 'error');
        return [];
    }

    return data;
}




export async function updateLeadStatus(id, newStatus) {
    if (supabase.supabaseUrl.includes('YOUR_SUPABASE')) {
        console.log(`[MOCK] Updated lead ${id} to ${newStatus}`);
        return { error: null };
    }

    const { error } = await supabase
        .from('leads')
        .update({ status: newStatus, updated_at: new Date() })
        .eq('id', id);

    if (error) {
        console.error('Error updating status:', error);
        ui.showToast('Erro ao atualizar status', 'error');
        return { error };
    }

    // Log interaction
    await addInteraction(id, 'status', `Status alterado para ${newStatus}`);

    return { error: null };
}

export async function updateLead(id, updates) {
    if (supabase.supabaseUrl.includes('YOUR_SUPABASE')) {
        console.log(`[MOCK] Updated lead ${id} with`, updates);
        return { error: null };
    }

    const { error } = await supabase
        .from('leads')
        .update({ ...updates, updated_at: new Date() })
        .eq('id', id);

    if (error) {
        console.error('Error updating lead:', error);
        ui.showToast('Erro ao atualizar lead', 'error');
        return { error };
    }

    // Log interaction
    const fieldMap = {
        name: 'Nome',
        company: 'Empresa',
        email: 'Email',
        phone: 'Telefone',
        notes: 'Notas',
        source: 'Origem'
    };

    // Filter out internal fields
    const changedFields = Object.keys(updates)
        .filter(k => k !== 'updated_at')
        .map(k => fieldMap[k] || k) // Translate if possible
        .join(', ');

    const description = changedFields ? `Editou: ${changedFields}` : 'Detalhes atualizados';
    await addInteraction(id, 'edit', description);

    return { error: null };
}

export async function addInteraction(leadId, type, description) {
    if (supabase.supabaseUrl.includes('YOUR_SUPABASE')) return;

    // Get current user to satisfy DB constraint
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase
        .from('interactions')
        .insert([{
            lead_id: leadId,
            user_id: user?.id,
            type, // 'call', 'email', 'meeting', 'note', 'status', 'edit'
            description,
            created_at: new Date()
        }]);

    if (error) {
        console.error('Error adding interaction:', error);
        // Alert user if interaction fails (e.g. missing table)
        ui.showToast('Erro ao salvar histórico: ' + error.message, 'error');
    }
}

export async function createLead(leadData) {
    if (supabase.supabaseUrl.includes('YOUR_SUPABASE')) {
        console.log(`[MOCK] Created lead`, leadData);
        ui.showToast('Lead criado (Mock)', 'success');
        return { data: leadData, error: null };
    }

    const { data, error } = await supabase
        .from('leads')
        .insert([leadData])
        .select();

    if (error) {
        ui.showToast('Erro ao criar lead', 'error');
        return { error };
    }

    if (data && data[0]) {
        await addInteraction(data[0].id, 'create', 'Lead criado');
    }

    return { data, error: null };
}

export async function deleteLead(id) {
    if (supabase.supabaseUrl.includes('YOUR_SUPABASE')) {
        console.log(`[MOCK] Deleted lead ${id}`);
        return { error: null };
    }

    const { error } = await supabase
        .from('leads')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error deleting lead:', error);
        ui.showToast('Erro ao excluir lead', 'error');
        return { error };
    }

    return { error: null };
}

export async function getLeadById(id) {
    if (supabase.supabaseUrl.includes('YOUR_SUPABASE')) {
        const lead = getMockLeads().find(l => l.id === id);
        if (lead) {
            lead.interactions = getMockInteractions(id);
        }
        return { data: lead, error: null };
    }

    // Fetch Lead
    const { data: lead, error: leadError } = await supabase
        .from('leads')
        .select('*')
        .eq('id', id)
        .single();

    if (leadError) {
        return { data: null, error: leadError };
    }

    // Fetch Interactions explicitly
    const { data: interactions, error: interactionsError } = await supabase
        .from('interactions')
        .select('*')
        .eq('lead_id', id)
        .order('created_at', { ascending: false });

    // Combine
    if (lead) {
        lead.interactions = interactions || [];
    }

    // If interactions table doesn't exist or error, we just return empty interactions
    if (interactionsError) {
        console.warn('Could not fetch interactions (table might be missing or permissions issue):', interactionsError);
        // We don't fail the whole request, just the history
    }

    return { data: lead, error: null };
}

function getMockInteractions(leadId) {
    return [
        { id: '101', type: 'note', description: 'Cliente interessado no plano premium', created_at: new Date().toISOString() },
        { id: '102', type: 'call', description: 'Ligação de apresentação realizada', created_at: new Date(Date.now() - 86400000).toISOString() }
    ];
}

// --- Mock Data Helper ---
function getMockLeads() {
    return [
        { id: '1', name: 'João Silva', company: 'Tech Corp', status: 'novo', created_at: new Date().toISOString() },
        { id: '2', name: 'Maria Souza', company: 'Design Studio', status: 'contato', created_at: new Date().toISOString() },
        { id: '3', name: 'Pedro Santos', company: 'Marketing Ltd', status: 'proposta', created_at: new Date().toISOString() },
        { id: '4', name: 'Ana Costa', company: 'Consultoria ABC', status: 'fechado', created_at: new Date().toISOString() },
        { id: '5', name: 'Lucas Lima', company: 'Soft House', status: 'novo', created_at: new Date().toISOString() }
    ];
}
