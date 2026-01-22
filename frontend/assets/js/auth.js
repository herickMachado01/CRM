
import { supabase } from './supabase.js';
import { ui } from './ui.js';

export async function login(email, password) {
    ui.setLoading('submitBtn', true);

    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) throw error;

        ui.showToast('Login realizado com sucesso!', 'success');

        // Redirect to dashboard after short delay
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1000);

    } catch (error) {
        console.error('Login error:', error);
        ui.showToast(error.message || 'Erro ao realizar login', 'error');
    } finally {
        ui.setLoading('submitBtn', false);
    }
}

// ... login function exists above ...

export async function signUp(email, password) {
    ui.setLoading('submitBtn', true);

    try {
        const { data, error } = await supabase.auth.signUp({
            email,
            password
        });

        if (error) throw error;

        ui.showToast('Conta criada com sucesso!', 'success');

        // Automatically logs in usually, check session and redirect
        if (data.session) {
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1000);
        } else {
            // Case where email confirmation might be ON (user said "Não é necessário", but if supabase enforces it...)
            // Assuming auto-confirm is enabled or handled.
            ui.showToast('Verifique seu email se necessário.', 'info');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 2000);
        }

    } catch (error) {
        console.error('Sign Up error:', error);
        ui.showToast(error.message || 'Erro ao criar conta', 'error');
    } finally {
        ui.setLoading('submitBtn', false);
    }
}

export async function recoverPassword(email) {
    ui.setLoading('recoverSubmitBtn', true);

    try {
        const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin + '/reset-password.html', // Ensure this page exists or points to a valid handler
        });

        if (error) throw error;

        ui.showToast('Email de recuperação enviado!', 'success');
        return { error: null };

    } catch (error) {
        console.error('Recover Password error:', error);
        ui.showToast(error.message || 'Erro ao enviar email', 'error');
        return { error };
    } finally {
        ui.setLoading('recoverSubmitBtn', false);
    }
}

export async function checkSession() {
    const { data: { session } } = await supabase.auth.getSession();

    const path = window.location.pathname;
    const isPublic = path.endsWith('index.html') || path.endsWith('signup.html') || path === '/';

    if (isPublic) {
        if (session) {
            window.location.href = 'dashboard.html';
        }
    } else {
        // If on protected page and no session, redirect to login
        if (!session) {
            window.location.href = 'index.html';
        }
    }
}

export async function logout() {
    const { error } = await supabase.auth.signOut();
    if (error) {
        ui.showToast('Erro ao sair', 'error');
    } else {
        window.location.href = 'index.html';
    }
}

// Initial session check
// checkSession(); // Commented out to prevent redirect loop while testing without credentials
