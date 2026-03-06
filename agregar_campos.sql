-- Agregar nuevos campos a la tabla estudiantes
ALTER TABLE estudiantes 
ADD COLUMN especialidad TEXT,
ADD COLUMN anio INTEGER;

-- Actualizar estudiantes existentes con datos de ejemplo
UPDATE estudiantes SET especialidad = 'Ingeniería de Sistemas', anio = 3 WHERE codigo_unico = 'EST001';
UPDATE estudiantes SET especialidad = 'Ingeniería Industrial', anio = 2 WHERE codigo_unico = 'EST002';
UPDATE estudiantes SET especialidad = 'Ingeniería Civil', anio = 4 WHERE codigo_unico = 'EST003';
UPDATE estudiantes SET especialidad = 'Ingeniería de Sistemas', anio = 1 WHERE codigo_unico = 'EST004';
UPDATE estudiantes SET especialidad = 'Ingeniería Electrónica', anio = 3 WHERE codigo_unico = 'EST005';
