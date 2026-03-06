// ========== ROUTER ==========

const views = {
    login: 'views/login.html',
    dashboard: 'views/dashboard.html',
    estudiantes: 'views/estudiantes.html'
};

async function loadView(viewName) {
    const app = document.getElementById('app');
    
    try {
        const response = await fetch(views[viewName]);
        const html = await response.text();
        app.innerHTML = html;
    } catch (error) {
        console.error('Error cargando vista:', error);
        app.innerHTML = '<p style="color: red;">Error cargando la vista</p>';
    }
}

function hideAllSections() {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
}

function showLogin() {
    hideAllSections();
    document.getElementById('login-section')?.classList.add('active');
}

function showDashboard() {
    hideAllSections();
    document.getElementById('dashboard-section')?.classList.add('active');
    console.log('Dashboard mostrado');
    if (typeof loadEventos === 'function') loadEventos();
}

function showEstudiantes() {
    hideAllSections();
    document.getElementById('estudiantes-section')?.classList.add('active');
    if (typeof loadEstudiantes === 'function') loadEstudiantes();
}

function showCreateEvent() {
    hideAllSections();
    document.getElementById('create-event-section')?.classList.add('active');
}
