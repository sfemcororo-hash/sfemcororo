// ADAPTADOR TURSO - Base de datos en la nube
class TursoDB {
    constructor() {
        this.dbUrl = 'https://sfemcororo-sfemcororo.aws-us-east-1.turso.io';
        this.authToken = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzI4MDY5NDIsImlkIjoiMDE5Y2MzODMtZjQwMS03MTc5LWJiMTAtY2IxMmUzYTI2YmUyIiwicmlkIjoiY2JhZTZjZjEtMTA0My00MWE1LTgwNWYtYmIzODY2ODc3MWY2In0.8f6HBSmVJGdfGQXjFu4_W5aFZ8RxNHIkm_T-5cLPoW99Kf0CBgQC0AtyfjLnynrQslryutioPCL1ZgcU4fMRBQ';
        
        this.auth = {
            signInWithPassword: async ({ email, password }) => {
                const result = await this.query(`SELECT * FROM usuarios WHERE email = ? AND password = ?`, [email, password]);
                
                if (result.rows && result.rows.length > 0) {
                    const user = result.rows[0];
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
    
    async query(sql, params = []) {
        try {
            const response = await fetch(`${this.dbUrl}/v2/pipeline`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.authToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    requests: [{
                        type: 'execute',
                        stmt: {
                            sql: sql,
                            args: params.map(p => ({ type: 'text', value: String(p) }))
                        }
                    }]
                })
            });
            
            const data = await response.json();
            
            if (data.results && data.results[0]) {
                const result = data.results[0].response.result;
                return {
                    rows: result.rows?.map(row => {
                        const obj = {};
                        result.cols.forEach((col, i) => {
                            obj[col.name] = row[i]?.value || row[i];
                        });
                        return obj;
                    }) || [],
                    error: null
                };
            }
            
            return { rows: [], error: null };
        } catch (error) {
            console.error('Turso query error:', error);
            return { rows: [], error };
        }
    }
    
    from(tableName) {
        const self = this;
        return {
            select: (fields = '*') => ({
                eq: (field, value) => ({
                    single: async () => {
                        const result = await self.query(`SELECT ${fields} FROM ${tableName} WHERE ${field} = ? LIMIT 1`, [value]);
                        return { data: result.rows[0] || null, error: result.error };
                    },
                    maybeSingle: async () => {
                        const result = await self.query(`SELECT ${fields} FROM ${tableName} WHERE ${field} = ? LIMIT 1`, [value]);
                        return { data: result.rows[0] || null, error: result.error };
                    },
                    order: (orderField, options = {}) => ({
                        then: async (callback) => {
                            const orderDir = options.ascending === false ? 'DESC' : 'ASC';
                            const result = await self.query(`SELECT ${fields} FROM ${tableName} WHERE ${field} = ? ORDER BY ${orderField} ${orderDir}`, [value]);
                            const response = { data: result.rows, error: result.error };
                            return callback ? callback(response) : response;
                        }
                    })
                }),
                order: (field, options = {}) => ({
                    then: async (callback) => {
                        const orderDir = options.ascending === false ? 'DESC' : 'ASC';
                        const result = await self.query(`SELECT ${fields} FROM ${tableName} ORDER BY ${field} ${orderDir}`);
                        const response = { data: result.rows, error: result.error };
                        return callback ? callback(response) : response;
                    }
                }),
                then: async (callback) => {
                    const result = await self.query(`SELECT ${fields} FROM ${tableName}`);
                    const response = { data: result.rows, error: result.error };
                    return callback ? callback(response) : response;
                }
            }),
            
            insert: async (data) => {
                const fields = Object.keys(data);
                const values = Object.values(data);
                const placeholders = fields.map(() => '?').join(', ');
                
                const id = Date.now().toString();
                const insertData = { id, ...data, created_at: new Date().toISOString() };
                const insertFields = Object.keys(insertData);
                const insertValues = Object.values(insertData);
                const insertPlaceholders = insertFields.map(() => '?').join(', ');
                
                const result = await self.query(
                    `INSERT INTO ${tableName} (${insertFields.join(', ')}) VALUES (${insertPlaceholders})`,
                    insertValues
                );
                
                return { data: insertData, error: result.error };
            }
        };
    }
    
    // Inicializar datos
    async initializeData() {
        // Crear tablas si no existen
        await this.query(`
            CREATE TABLE IF NOT EXISTS usuarios (
                id TEXT PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                nombre TEXT NOT NULL,
                rol TEXT NOT NULL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        await this.query(`
            CREATE TABLE IF NOT EXISTS perfiles (
                id TEXT PRIMARY KEY,
                email TEXT NOT NULL,
                nombre TEXT NOT NULL,
                rol TEXT NOT NULL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        await this.query(`
            CREATE TABLE IF NOT EXISTS estudiantes (
                id TEXT PRIMARY KEY,
                codigo_unico TEXT UNIQUE NOT NULL,
                dni TEXT UNIQUE NOT NULL,
                nombre TEXT NOT NULL,
                apellido_paterno TEXT NOT NULL,
                apellido_materno TEXT,
                celular TEXT,
                email TEXT,
                especialidad TEXT NOT NULL,
                anio INTEGER NOT NULL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        await this.query(`
            CREATE TABLE IF NOT EXISTS eventos (
                id TEXT PRIMARY KEY,
                nombre TEXT NOT NULL,
                fecha_inicio TEXT NOT NULL,
                fecha_fin TEXT NOT NULL,
                hora_inicio TEXT NOT NULL,
                hora_fin TEXT NOT NULL,
                imagen_url TEXT,
                usuario_id TEXT NOT NULL,
                activo INTEGER DEFAULT 1,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        await this.query(`
            CREATE TABLE IF NOT EXISTS asistencias (
                id TEXT PRIMARY KEY,
                estudiante_id TEXT NOT NULL,
                evento_id TEXT NOT NULL,
                timestamp TEXT DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // Insertar usuario admin si no existe
        const adminExists = await this.query('SELECT id FROM usuarios WHERE email = ?', ['admin@escuela.com']);
        if (adminExists.rows.length === 0) {
            await this.query(
                'INSERT INTO usuarios (id, email, password, nombre, rol) VALUES (?, ?, ?, ?, ?)',
                ['1', 'admin@escuela.com', 'Admin123!', 'Administrador', 'admin']
            );
            
            await this.query(
                'INSERT INTO perfiles (id, email, nombre, rol) VALUES (?, ?, ?, ?)',
                ['1', 'admin@escuela.com', 'Administrador', 'admin']
            );
        }
    }
}

// Reemplazar con TursoDB
const supabase = new TursoDB();
supabase.initializeData();