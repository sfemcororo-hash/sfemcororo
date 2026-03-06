// ⚠️ IMPORTANTE: En producción, usa variables de entorno
// Para desarrollo local, puedes dejar estas credenciales
const SUPABASE_URL = 'https://fjselqntjcrhrkvugbca.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqc2VscW50amNyaHJrdnVnYmNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3MzQyMTAsImV4cCI6MjA4ODMxMDIxMH0._dcOllU3A4AkMdwORavJKn2veFTAao5EuPEE58x5E-Q';

var supabase;
var currentUser = null;
var currentProfile = null;

window.addEventListener('DOMContentLoaded', async () => {
    const { createClient } = window.supabase;
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    
    // Verificar sesión existente
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        await loadUserProfile();
        showDashboard();
    } else {
        showLogin();
    }
});

async function loadUserProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    
    const { data: profile } = await supabase
        .from('perfiles')
        .select('*')
        .eq('id', user.id)
        .single();
    
    currentUser = user;
    currentProfile = profile;
    return profile;
}
