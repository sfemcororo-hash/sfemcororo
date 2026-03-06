// ADAPTADOR LOCALSTORAGE - Reemplaza Supabase temporalmente
class LocalDB {
    constructor() {
        this.auth = {
            signInWithPassword: async ({ email, password }) => {
                const usuarios = this.getTable('usuarios');
                const user = usuarios.find(u => u.email === email && u.password === password);
                
                if (user) {
                    localStorage.setItem('currentUser', JSON.stringify(user));
                    return { data: { user }, error: null };
                }
                return { data: null, error: { message: 'Credenciales incorrectas' } };
            },
            
            signOut: async () => {
                localStorage.removeItem('currentUser');
                return { error: null };
            },
            
            getUser: async () => {
                const user = localStorage.getItem('currentUser');
                return { data: { user: user ? JSON.parse(user) : null } };
            },
            
            getSession: async () => {
                const user = localStorage.getItem('currentUser');
                return { data: { session: user ? { user: JSON.parse(user) } : null } };
            }
        };
    }
    
    getTable(tableName) {
        const data = localStorage.getItem(tableName);
        return data ? JSON.parse(data) : [];
    }
    
    saveTable(tableName, data) {
        localStorage.setItem(tableName, JSON.stringify(data));
    }
    
    from(tableName) {
        const self = this;
        return {
            select: (fields = '*') => {
                const data = self.getTable(tableName);
                return {
                    eq: (field, value) => ({
                        single: async () => {
                            const item = data.find(item => item[field] === value);
                            return { data: item || null, error: null };
                        },
                        maybeSingle: async () => {
                            const item = data.find(item => item[field] === value);
                            return { data: item || null, error: null };
                        },
                        order: (orderField, options = {}) => ({
                            then: async (callback) => {
                                const filtered = data.filter(item => item[field] === value);
                                const sorted = filtered.sort((a, b) => {
                                    if (options.ascending === false) {
                                        return b[orderField] > a[orderField] ? 1 : -1;
                                    }
                                    return a[orderField] > b[orderField] ? 1 : -1;
                                });
                                const result = { data: sorted, error: null };
                                return callback ? callback(result) : result;
                            }
                        })
                    }),
                    order: (field, options = {}) => ({
                        then: async (callback) => {
                            const sorted = [...data].sort((a, b) => {
                                if (options.ascending === false) {
                                    return b[field] > a[field] ? 1 : -1;
                                }
                                return a[field] > b[field] ? 1 : -1;
                            });
                            const result = { data: sorted, error: null };
                            return callback ? callback(result) : result;
                        }
                    }),
                    // Para consultas sin filtros
                    then: async (callback) => {
                        const result = { data, error: null };
                        return callback ? callback(result) : result;
                    }
                };
            },
            
            insert: async (newData) => {
                const data = this.getTable(tableName);
                const id = Date.now().toString();
                const item = { id, ...newData, created_at: new Date().toISOString() };
                data.push(item);
                this.saveTable(tableName, data);
                return { data: item, error: null };
            },
            
            update: async (updateData) => ({
                eq: async (field, value) => {
                    const data = this.getTable(tableName);
                    const index = data.findIndex(item => item[field] === value);
                    if (index !== -1) {
                        data[index] = { ...data[index], ...updateData };
                        this.saveTable(tableName, data);
                        return { data: data[index], error: null };
                    }
                    return { data: null, error: { message: 'Item not found' } };
                }
            }),
            
            delete: async () => ({
                eq: async (field, value) => {
                    const data = this.getTable(tableName);
                    const filtered = data.filter(item => item[field] !== value);
                    this.saveTable(tableName, filtered);
                    return { error: null };
                }
            })
        };
    }
    
    // Inicializar datos de prueba
    initializeData() {
        // Usuario admin
        const usuarios = [{
            id: '1',
            email: 'admin@escuela.com',
            password: 'Admin123!',
            nombre: 'Administrador',
            rol: 'admin',
            created_at: new Date().toISOString()
        }];
        
        if (!localStorage.getItem('usuarios')) {
            this.saveTable('usuarios', usuarios);
        }
        
        // Inicializar tablas vacías
        if (!localStorage.getItem('estudiantes')) {
            this.saveTable('estudiantes', []);
        }
        if (!localStorage.getItem('eventos')) {
            this.saveTable('eventos', []);
        }
        if (!localStorage.getItem('asistencias')) {
            this.saveTable('asistencias', []);
        }
        if (!localStorage.getItem('perfiles')) {
            this.saveTable('perfiles', [{
                id: '1',
                email: 'admin@escuela.com',
                nombre: 'Administrador',
                rol: 'admin'
            }]);
        }
    }
}

// Reemplazar Supabase con LocalDB
const supabase = new LocalDB();
supabase.initializeData();