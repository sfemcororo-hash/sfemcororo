// ========== BIBLIOTECA - LÓGICA PRINCIPAL ==========

// Verificar sesión al cargar
window.addEventListener('DOMContentLoaded', async function () {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (!user) {
        window.location.href = '../index.html';
        return;
    }
    await tursodb.initializeData();
});

function volverDashboard() {
    sessionStorage.setItem('fromModule', '1');
    window.location.href = '../index.html';
}
