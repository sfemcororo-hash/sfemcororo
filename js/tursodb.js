// ADAPTADOR TURSO - Base de datos en la nube
class TursoDB {
    constructor() {
        this.dbUrl = 'https://sfemcororo-sfemcororo.aws-us-east-1.turso.io';
        this.authToken = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJnaWQiOiJkYjIyYTE4ZC1kYTUxLTQwMTUtOTcyYS05YWUxODY3NGEyNmQiLCJpYXQiOjE3NzMxODg1NDgsInJpZCI6IjNlMzZmY2I1LTZiN2MtNGMxNi05MjIyLWNiYzJkMmE3NjgzNSJ9.5heqiZARkmz9IvWF8GeV-5Jb9RWIJePjbgLrxYjIYMG4otOuAiW-2WeKpEUvqsXbk2oh5V6M4s_-_9sxAaIZDQ';
        
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
            
            if (data.results && data.results[0] && data.results[0].response) {
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
                
                let insertData;
                
                if (tableName === 'usuarios') {
                    // Para usuarios, usar AUTOINCREMENT
                    insertData = { ...data, created_at: new Date().toISOString() };
                } else if (tableName === 'asistencias') {
                    const id = Date.now().toString();
                    insertData = { id, ...data, timestamp: new Date().toISOString() };
                } else {
                    const id = Date.now().toString();
                    insertData = { id, ...data, created_at: new Date().toISOString() };
                }
                
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
        // Eliminar tablas obsoletas
        await this.query(`DROP TABLE IF EXISTS perfiles`);
        await this.query(`DROP TABLE IF EXISTS estudiantes_old`);
        
        // Verificar si existe admin
        const adminExists = await this.query('SELECT id FROM usuarios WHERE email = ?', ['admin@escuela.com']);
        if (!adminExists.rows || adminExists.rows.length === 0) {
            // Crear admin por defecto solo si no existe
            await this.query(`
                INSERT INTO usuarios (ci, nombre, apellido_paterno, apellido_materno, email, password, especialidad, codigo_unico, rol) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, ['79310777', 'Admin', 'Sistema', 'Principal', 'admin@escuela.com', 'Admin123!', 'ADMINISTRACIÓN', 'ADM001', 'admin']);
        }
        
        // Verificar si la tabla estudiantes existe y tiene la estructura correcta
        const tableInfo = await this.query(`PRAGMA table_info(estudiantes)`);
        const hasAnioFormacion = tableInfo.rows.some(col => col.name === 'anio_formacion');
        const hasPassword = tableInfo.rows.some(col => col.name === 'password');
        
        if (!hasAnioFormacion || !hasPassword) {
            console.log('Actualizando estructura de tabla estudiantes...');
            
            // Crear nueva tabla con estructura correcta incluyendo password
            await this.query(`
                CREATE TABLE IF NOT EXISTS estudiantes_nueva (
                    id TEXT PRIMARY KEY,
                    codigo_unico TEXT UNIQUE NOT NULL,
                    dni TEXT NOT NULL,
                    nombre TEXT NOT NULL,
                    apellido_paterno TEXT NOT NULL,
                    apellido_materno TEXT,
                    especialidad TEXT NOT NULL,
                    anio_formacion TEXT NOT NULL,
                    celular TEXT,
                    email TEXT,
                    password TEXT NOT NULL DEFAULT 'estudiante123',
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP
                )
            `);
            
            // Migrar datos existentes si los hay
            const existingData = await this.query(`SELECT COUNT(*) as count FROM estudiantes`);
            if (existingData.rows[0]?.count > 0) {
                await this.query(`
                    INSERT INTO estudiantes_nueva (id, codigo_unico, dni, nombre, apellido_paterno, apellido_materno, especialidad, anio_formacion, celular, email, password, created_at)
                    SELECT id, codigo_unico, dni, nombre, apellido_paterno, apellido_materno, especialidad, 
                           CASE 
                               WHEN anio = 1 THEN 'PRIMERO'
                               WHEN anio = 2 THEN 'SEGUNDO'
                               WHEN anio = 3 THEN 'TERCERO'
                               WHEN anio = 4 THEN 'CUARTO'
                               WHEN anio = 5 THEN 'QUINTO'
                               ELSE COALESCE(anio_formacion, 'PRIMERO')
                           END as anio_formacion,
                           celular, email, 
                           COALESCE(password, 'estudiante123') as password,
                           created_at
                    FROM estudiantes
                `);
            }
            
            // Renombrar tablas
            await this.query(`DROP TABLE IF EXISTS estudiantes_old`);
            await this.query(`ALTER TABLE estudiantes RENAME TO estudiantes_old`);
            await this.query(`ALTER TABLE estudiantes_nueva RENAME TO estudiantes`);
            
            console.log('Estructura de tabla estudiantes actualizada correctamente con columna password');
        } else {
            // Crear tabla con estructura correcta si no existe
            await this.query(`
                CREATE TABLE IF NOT EXISTS estudiantes (
                    id TEXT PRIMARY KEY,
                    codigo_unico TEXT UNIQUE NOT NULL,
                    dni TEXT NOT NULL,
                    nombre TEXT NOT NULL,
                    apellido_paterno TEXT NOT NULL,
                    apellido_materno TEXT,
                    especialidad TEXT NOT NULL,
                    anio_formacion TEXT NOT NULL,
                    celular TEXT,
                    email TEXT,
                    password TEXT NOT NULL DEFAULT 'estudiante123',
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP
                )
            `);
        }
        
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
                timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // Insertar usuario admin si no existe (legacy - ya no se usa)
        const oldAdminExists = await this.query('SELECT id FROM usuarios WHERE id = ?', ['1']);
        if (oldAdminExists.rows && oldAdminExists.rows.length > 0) {
            // Eliminar admin legacy
            await this.query('DELETE FROM usuarios WHERE id = ?', ['1']);
        }
    }
}

// Reemplazar con TursoDB
const supabase = new TursoDB();
const tursodb = new TursoDB();
supabase.initializeData();
tursodb.initializeData();