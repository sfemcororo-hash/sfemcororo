// ========== MÓDULO DE AUTENTICACIÓN ==========

let currentUser = null;

async function login() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorEl = document.getElementById('login-error');

    try {
        const { data, error } = await supabase
            .from('docentes')
            .select('*')
            .eq('email', email)
            .eq('password', password)
            .maybeSingle();

        if (error || !data) {
            errorEl.textContent = 'Credenciales incorrectas';
            return;
        }

        currentUser = data;
        showDashboard();
    } catch (err) {
        errorEl.textContent = 'Error de conexión';
    }
}

function logout() {
    currentUser = null;
    showLogin();
}

function getCurrentUser() {
    return currentUser;
}
