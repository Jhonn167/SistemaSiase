const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const app = express();
const port = 3000;


const allowedOrigins = [
    'https://sistemasiase.onrender.com', 
    'http://localhost:3000',             
    'http://localhost:5500',             
    'http://127.0.0.1:5500',               
    'https://sistema-siase.vercel.app',
];

const corsOptions = {
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) === -1) {
            const msg = 'La política de CORS para este sitio no permite acceso desde el origen especificado.';
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    }
};
app.use(cors(corsOptions)); 
app.use(express.json()); 
app.use(express.static('frontend')); 


const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '16112002', 
    database: process.env.DB_DATABASE || 'proyecto_escuela',
    port: process.env.DB_PORT || 3306, 
    ssl: { "rejectUnauthorized": true }, 

    ssl: { "rejectUnauthorized": true },
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

console.log("Conectando a la base de datos MySQL...");

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    console.log(`Intento de login para: ${email}`);
    const query = `SELECT ID_Usuario, Email, Rol, PasswordHash FROM Usuarios WHERE Email = ?`;
    try {
        const [rows] = await pool.promise().query(query, [email]);
        if (rows.length === 0) {
            return res.status(404).json({ exito: false, mensaje: 'Usuario no encontrado' });
        }
        const usuario = rows[0];
        if (password === usuario.PasswordHash) {
            console.log(`Login exitoso para ${usuario.Email}, Rol: ${usuario.Rol}`);
            res.json({
                exito: true,
                rol: usuario.Rol,
                idUsuario: usuario.ID_Usuario,
                email: usuario.Email
            });
        } else {
            console.log("Contraseña incorrecta");
            res.status(401).json({ exito: false, mensaje: 'Contraseña incorrecta' });
        }
    } catch (error) {
        console.error("Error en la consulta de login:", error);
        res.status(500).json({ exito: false, mensaje: 'Error del servidor' });
    }
});


// GET (Singular)
app.get('/api/alumnos/usuario/:idUsuario', async (req, res) => {
    const { idUsuario } = req.params;
    const query = `SELECT ID_Alumno, Matricula, NombreCompleto, Carrera FROM Alumnos WHERE ID_Usuario = ?`;
    try {
        const [rows] = await pool.promise().query(query, [idUsuario]);
        if (rows.length === 0) {
            return res.status(404).json({ exito: false, mensaje: 'Datos de alumno no encontrados' });
        }
        res.json({ exito: true, datos: rows[0] }); 
    } catch (error) {
        console.error("Error al consultar datos del alumno:", error);
        res.status(500).json({ exito: false, mensaje: 'Error del servidor' });
    }
});

// GET (Plural) 
app.get('/api/alumnos', async (req, res) => {
    console.log("Petición para GET /api/alumnos (todos)");
    const query = `
        SELECT A.ID_Alumno, A.Matricula, A.NombreCompleto, U.Email, A.Carrera, U.ID_Usuario
        FROM Alumnos AS A
        JOIN Usuarios AS U ON A.ID_Usuario = U.ID_Usuario
        ORDER BY A.NombreCompleto;
    `;
    try {
        const [rows] = await pool.promise().query(query);
        res.json({ exito: true, alumnos: rows });
    } catch (error) {
        console.error("Error al consultar todos los alumnos:", error);
        res.status(500).json({ exito: false, mensaje: 'Error del servidor' });
    }
});

// POST (Crear)
app.post('/api/alumnos', async (req, res) => {
    const { nombre, email, matricula, password, carrera } = req.body;
    const connection = await pool.promise().getConnection();
    try {
        await connection.beginTransaction(); 
        const queryUsuario = `INSERT INTO Usuarios (Email, PasswordHash, Rol) VALUES (?, ?, 'Alumno')`;
        const [resultUsuario] = await connection.query(queryUsuario, [email, password]);
        const idUsuarioNuevo = resultUsuario.insertId;
        const queryAlumno = `INSERT INTO Alumnos (Matricula, ID_Usuario, NombreCompleto, Carrera) VALUES (?, ?, ?, ?)`;
        await connection.query(queryAlumno, [matricula, idUsuarioNuevo, nombre, carrera]);
        await connection.commit();
        res.status(201).json({ exito: true, mensaje: 'Alumno creado exitosamente' });
    } catch (error) {
        await connection.rollback();
        console.error("Error al crear alumno:", error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ exito: false, mensaje: 'El Email o la Matrícula ya existen.' });
        }
        res.status(500).json({ exito: false, mensaje: 'Error del servidor al crear alumno' });
    } finally {
        connection.release();
    }
});

// PUT (Actualizar)
app.put('/api/alumnos/:idAlumno', async (req, res) => {
    const { idAlumno } = req.params;
    const { nombre, email, matricula, carrera, idUsuario } = req.body;
    console.log(`Petición para PUT /api/alumnos/${idAlumno}`);

    if (!idUsuario) {
        return res.status(400).json({ exito: false, mensaje: 'Falta el ID_Usuario.' });
    }

    const connection = await pool.promise().getConnection();
    try {
        await connection.beginTransaction();

        // 1. Actualizar la tabla Alumnos
        const queryAlumno = `
            UPDATE Alumnos 
            SET NombreCompleto = ?, Matricula = ?, Carrera = ?
            WHERE ID_Alumno = ?`;
        await connection.query(queryAlumno, [nombre, matricula, carrera, idAlumno]);
        
        // 2. Actualizar la tabla Usuarios
        const queryUsuario = `
            UPDATE Usuarios 
            SET Email = ?
            WHERE ID_Usuario = ?`;
        await connection.query(queryUsuario, [email, idUsuario]);

        // 3. Confirmar cambios
        await connection.commit();
        res.json({ exito: true, mensaje: 'Alumno actualizado exitosamente' });

    } catch (error) {
        await connection.rollback();
        console.error("Error al actualizar alumno:", error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ exito: false, mensaje: 'El Email o la Matrícula ya existen en otro registro.' });
        }
        res.status(500).json({ exito: false, mensaje: 'Error del servidor al actualizar alumno' });
    } finally {
        connection.release();
    }
});

// DELETE (Borrar)
app.delete('/api/alumnos/:idAlumno', async (req, res) => {
    const { idAlumno } = req.params;
    const connection = await pool.promise().getConnection();
    try {
        await connection.beginTransaction(); 
        const [rows] = await connection.query('SELECT ID_Usuario FROM Alumnos WHERE ID_Alumno = ?', [idAlumno]);
        if (rows.length === 0) {
            await connection.rollback();
            return res.status(404).json({ exito: false, mensaje: 'Alumno no encontrado.' });
        }
        const idUsuario = rows[0].ID_Usuario;
        const [inscripciones] = await connection.query('SELECT ID_Inscripcion FROM Inscripciones WHERE ID_Alumno = ?', [idAlumno]);
        if (inscripciones.length > 0) {
            const idsInscripciones = inscripciones.map(i => i.ID_Inscripcion);
            await connection.query('DELETE FROM Calificaciones WHERE ID_Inscripcion IN (?)', [idsInscripciones]);
            await connection.query('DELETE FROM Inscripciones WHERE ID_Alumno = ?', [idAlumno]);
        }
        await connection.query('DELETE FROM Alumnos WHERE ID_Alumno = ?', [idAlumno]);
        await connection.query('DELETE FROM Usuarios WHERE ID_Usuario = ?', [idUsuario]);
        await connection.commit();
        res.json({ exito: true, mensaje: 'Alumno eliminado exitosamente.' });
    } catch (error) {
        await connection.rollback();
        console.error("Error al borrar alumno:", error);
        res.status(500).json({ exito: false, mensaje: 'Error del servidor al borrar alumno' });
    } finally {
        connection.release();
    }
});

// GET (Plural)
app.get('/api/profesores', async (req, res) => {
    const query = `
        SELECT P.ID_Profesor, P.NombreCompleto, U.Email, P.CedulaProfesional, U.ID_Usuario
        FROM Profesores AS P
        JOIN Usuarios AS U ON P.ID_Usuario = U.ID_Usuario
        ORDER BY P.NombreCompleto;
    `;
    try {
        const [rows] = await pool.promise().query(query);
        res.json({ exito: true, profesores: rows });
    } catch (error) {
        console.error("Error al consultar todos los profesores:", error);
        res.status(500).json({ exito: false, mensaje: 'Error del servidor' });
    }
});

// POST (Crear)
app.post('/api/profesores', async (req, res) => {
    const { nombre, email, cedula, password } = req.body;
    const connection = await pool.promise().getConnection();
    try {
        await connection.beginTransaction();
        const queryUsuario = `INSERT INTO Usuarios (Email, PasswordHash, Rol) VALUES (?, ?, 'Profesor')`;
        const [resultUsuario] = await connection.query(queryUsuario, [email, password]);
        const idUsuarioNuevo = resultUsuario.insertId;
        const queryProfesor = `INSERT INTO Profesores (ID_Usuario, NombreCompleto, CedulaProfesional) VALUES (?, ?, ?)`;
        await connection.query(queryProfesor, [idUsuarioNuevo, nombre, cedula]);
        await connection.commit();
        res.status(201).json({ exito: true, mensaje: 'Profesor creado exitosamente' });
    } catch (error) {
        await connection.rollback();
        console.error("Error al crear profesor:", error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ exito: false, mensaje: 'El Email ya existe.' });
        }
        res.status(500).json({ exito: false, mensaje: 'Error del servidor al crear profesor' });
    } finally {
        connection.release();
    }
});

// DELETE (Borrar)
app.delete('/api/profesores/:idProfesor', async (req, res) => {
    const { idProfesor } = req.params;
    const connection = await pool.promise().getConnection();
    try {
        await connection.beginTransaction();
        const [gruposAsignados] = await connection.query('SELECT 1 FROM Grupos WHERE ID_Profesor = ? LIMIT 1', [idProfesor]);
        if (gruposAsignados.length > 0) {
            await connection.rollback();
            return res.status(409).json({ exito: false, mensaje: 'No se puede borrar al profesor, está asignado a uno o más grupos.' });
        }
        const [rows] = await connection.query('SELECT ID_Usuario FROM Profesores WHERE ID_Profesor = ?', [idProfesor]);
        if (rows.length === 0) {
            await connection.rollback();
            return res.status(404).json({ exito: false, mensaje: 'Profesor no encontrado.' });
        }
        const idUsuario = rows[0].ID_Usuario;
        await connection.query('DELETE FROM Profesores WHERE ID_Profesor = ?', [idProfesor]);
        await connection.query('DELETE FROM Usuarios WHERE ID_Usuario = ?', [idUsuario]);
        await connection.commit();
        res.json({ exito: true, mensaje: 'Profesor eliminado exitosamente.' });
    } catch (error) {
        await connection.rollback();
        console.error("Error al borrar profesor:", error);
        res.status(500).json({ exito: false, mensaje: 'Error del servidor al borrar profesor' });
    } finally {
        connection.release();
    }
});


// (POST, GET, DELETE para Inscripciones... sin cambios)
app.post('/api/inscripciones', async (req, res) => {
    const { id_alumno, id_grupo } = req.body;
    const query = `INSERT INTO Inscripciones (ID_Alumno, ID_Grupo, FechaInscripcion) VALUES (?, ?, NOW())`;
    try {
        await pool.promise().query(query, [id_alumno, id_grupo]);
        res.status(201).json({ exito: true, mensaje: 'Inscripción exitosa' });
    } catch (error) {
        console.error("Error al inscribir:", error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ exito: false, mensaje: 'El alumno ya está inscrito en este grupo.' });
        }
        res.status(500).json({ exito: false, mensaje: 'Error del servidor al inscribir' });
    }
});
app.get('/api/inscripciones/alumno/:idAlumno', async (req, res) => {
    const { idAlumno } = req.params;
    const query = `SELECT ID_Grupo FROM Inscripciones WHERE ID_Alumno = ?`;
    try {
        const [rows] = await pool.promise().query(query, [idAlumno]);
        const idsDeGruposInscritos = rows.map(r => r.ID_Grupo);
        res.json({ exito: true, gruposInscritos: idsDeGruposInscritos });
    } catch (error) {
        console.error("Error al consultar inscripciones:", error);
        res.status(500).json({ exito: false, mensaje: 'Error del servidor' });
    }
});
app.delete('/api/inscripciones', async (req, res) => {
    const { id_alumno, id_grupo } = req.body;
    if (!id_alumno || !id_grupo) {
        return res.status(400).json({ exito: false, mensaje: 'Faltan IDs de alumno o grupo.' });
    }
    const query = `DELETE FROM Inscripciones WHERE ID_Alumno = ? AND ID_Grupo = ?`;
    try {
        const [result] = await pool.promise().query(query, [id_alumno, id_grupo]);
        if (result.affectedRows > 0) {
            res.json({ exito: true, mensaje: 'Materia dada de baja exitosamente' });
        } else {
            res.status(404).json({ exito: false, mensaje: 'Inscripción no encontrada, no se borró nada.' });
        }
    } catch (error) {
        console.error("Error al eliminar inscripción:", error);
        res.status(500).json({ exito: false, mensaje: 'Error del servidor al eliminar' });
    }
});



app.get('/api/materias', async (req, res) => {
    console.log("¡Recibí una petición para /api/materias!");
    const query = `
        SELECT 
            G.ID_Grupo AS id, M.Nombre AS nombre, M.ClaveMateria AS codigo,
            M.Creditos AS creditos, P.NombreCompleto AS profesor,
            CASE 
                WHEN H.DiaSemana = 1 THEN 'Lunes' WHEN H.DiaSemana = 2 THEN 'Martes'
                WHEN H.DiaSemana = 3 THEN 'Miércoles' WHEN H.DiaSemana = 4 THEN 'Jueves'
                WHEN H.DiaSemana = 5 THEN 'Viernes' WHEN H.DiaSemana = 6 THEN 'Sábado'
                WHEN H.DiaSemana = 7 THEN 'Domingo' ELSE 'Día'
            END AS dia,
            H.Hora_Inicio AS horaInicio, H.Hora_Fin AS horaFin, G.Aula AS aula,
            G.CupoMaximo AS cuposTotales,
            (G.CupoMaximo - (SELECT COUNT(*) FROM Inscripciones WHERE ID_Grupo = G.ID_Grupo)) AS cuposDisponibles
        FROM Grupos AS G
        JOIN Materias AS M ON G.ID_Materia = M.ID_Materia
        JOIN Profesores AS P ON G.ID_Profesor = P.ID_Profesor
        JOIN Horarios AS H ON G.ID_Grupo = H.ID_Grupo
        JOIN Periodos_Escolares AS PE ON G.ID_Periodo = PE.ID_Periodo
        WHERE PE.Estatus = 'Activo' 
        ORDER BY G.ID_Grupo, H.DiaSemana;
    `;
    try {
        const [rows] = await pool.promise().query(query);
        const materias = {};
        rows.forEach(row => {
            if (!materias[row.id]) {
                materias[row.id] = {
                    id: row.id, nombre: row.nombre, codigo: row.codigo,
                    creditos: row.creditos, profesor: row.profesor, aula: row.aula,
                    cuposDisponibles: Number(row.cuposDisponibles),
                    cuposTotales: row.cuposTotales, horarios: [] 
                };
            }
            materias[row.id].horarios.push({
                dia: row.dia, horaInicio: row.horaInicio, horaFin: row.horaFin
            });
        });
        const materiasArray = Object.values(materias);
        res.json(materiasArray);
    } catch (error) {
        console.error("Error al consultar la base de datos:", error);
        res.status(500).json({ error: 'Error al obtener los datos de las materias' });
    }
});


// GET (Plural)
app.get('/api/catalogo/materias', async (req, res) => {
    const query = `
        SELECT ID_Materia, ClaveMateria, Nombre, Creditos
        FROM Materias
        ORDER BY Nombre;
    `;
    try {
        const [rows] = await pool.promise().query(query);
        res.json({ exito: true, materias: rows });
    } catch (error) {
        console.error("Error al consultar catálogo de materias:", error);
        res.status(500).json({ exito: false, mensaje: 'Error del servidor' });
    }
});

// GET (Singular)
app.get('/api/catalogo/materias/:idMateria', async (req, res) => {
    const { idMateria } = req.params;
    const query = `SELECT ID_Materia, ClaveMateria, Nombre, Creditos FROM Materias WHERE ID_Materia = ?`;
    try {
        const [rows] = await pool.promise().query(query, [idMateria]);
        if (rows.length === 0) {
            return res.status(404).json({ exito: false, mensaje: 'Materia no encontrada' });
        }
        res.json({ exito: true, materia: rows[0] });
    } catch (error) {
        console.error("Error al consultar materia:", error);
        res.status(500).json({ exito: false, mensaje: 'Error del servidor' });
    }
});

// POST (Crear)
app.post('/api/catalogo/materias', async (req, res) => {
    const { nombre, clave, creditos } = req.body;
    const query = `INSERT INTO Materias (ClaveMateria, Nombre, Creditos) VALUES (?, ?, ?)`;
    try {
        await pool.promise().query(query, [clave, nombre, creditos]);
        res.status(201).json({ exito: true, mensaje: 'Materia creada exitosamente' });
    } catch (error) {
        console.error("Error al crear materia:", error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ exito: false, mensaje: 'La Clave de Materia ya existe.' });
        }
        res.status(500).json({ exito: false, mensaje: 'Error del servidor al crear materia' });
    }
});

// PUT (Actualizar)
app.put('/api/catalogo/materias/:idMateria', async (req, res) => {
    const { idMateria } = req.params;
    const { nombre, clave, creditos } = req.body;
    const query = `
        UPDATE Materias 
        SET Nombre = ?, ClaveMateria = ?, Creditos = ? 
        WHERE ID_Materia = ?`;
    try {
        const [result] = await pool.promise().query(query, [nombre, clave, creditos, idMateria]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ exito: false, mensaje: 'Materia no encontrada, no se actualizó nada.' });
        }
        res.json({ exito: true, mensaje: 'Materia actualizada exitosamente' });
    } catch (error) {
        console.error("Error al actualizar materia:", error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ exito: false, mensaje: 'La Clave de Materia ya existe.' });
        }
        res.status(500).json({ exito: false, mensaje: 'Error del servidor al actualizar' });
    }
});

// DELETE (Borrar)
app.delete('/api/catalogo/materias/:idMateria', async (req, res) => {
    const { idMateria } = req.params;
    const [gruposAsignados] = await pool.promise().query('SELECT 1 FROM Grupos WHERE ID_Materia = ? LIMIT 1', [idMateria]);
    if (gruposAsignados.length > 0) {
        return res.status(409).json({ exito: false, mensaje: 'No se puede borrar la materia, está asignada a uno o más grupos.' });
    }
    try {
        await pool.promise().query('DELETE FROM Materias WHERE ID_Materia = ?', [idMateria]);
        res.json({ exito: true, mensaje: 'Materia eliminada exitosamente del catálogo.' });
    } catch (error) {
        console.error("Error al borrar materia:", error);
        res.status(500).json({ exito: false, mensaje: 'Error del servidor al borrar materia' });
    }
});

// GET (Leer Periodos)
app.get('/api/periodos', async (req, res) => {
    const query = `SELECT ID_Periodo, Nombre FROM Periodos_Escolares WHERE Estatus IN ('Activo', 'Futuro')`;
    try {
        const [rows] = await pool.promise().query(query);
        res.json({ exito: true, periodos: rows });
    } catch (error) {
        console.error("Error al consultar periodos:", error);
        res.status(500).json({ exito: false, mensaje: 'Error del servidor' });
    }
});

// GET (Leer Grupos)
app.get('/api/grupos', async (req, res) => {
    const query = `
        SELECT 
            G.ID_Grupo, M.Nombre AS Materia, P.NombreCompleto AS Profesor,
            G.ClaveGrupo, G.Aula, G.CupoMaximo,
            (SELECT COUNT(*) FROM Inscripciones WHERE ID_Grupo = G.ID_Grupo) AS Inscritos,
            GROUP_CONCAT(
                DISTINCT CASE 
                    WHEN H.DiaSemana = 1 THEN 'Lu' WHEN H.DiaSemana = 2 THEN 'Ma'
                    WHEN H.DiaSemana = 3 THEN 'Mi' WHEN H.DiaSemana = 4 THEN 'Ju'
                    WHEN H.DiaSemana = 5 THEN 'Vi' WHEN H.DiaSemana = 6 THEN 'Sa'
                    ELSE '?'
                END 
                ORDER BY H.DiaSemana SEPARATOR '-'
            ) AS Dias,
            TIME_FORMAT(MIN(H.Hora_Inicio), '%H:%i') AS HoraInicio,
            TIME_FORMAT(MIN(H.Hora_Fin), '%H:%i') AS HoraFin
        FROM Grupos AS G
        JOIN Materias AS M ON G.ID_Materia = M.ID_Materia
        JOIN Profesores AS P ON G.ID_Profesor = P.ID_Profesor
        LEFT JOIN Horarios AS H ON G.ID_Grupo = H.ID_Grupo
        JOIN Periodos_Escolares AS PE ON G.ID_Periodo = PE.ID_Periodo
        WHERE PE.Estatus = 'Activo'
        GROUP BY G.ID_Grupo
        ORDER BY M.Nombre, G.ClaveGrupo;
    `;
    try {
        const [rows] = await pool.promise().query(query);
        res.json({ exito: true, grupos: rows });
    } catch (error) {
        console.error("Error al consultar grupos:", error);
        res.status(500).json({ exito: false, mensaje: 'Error del servidor' });
    }
});

// POST (Crear Grupo y Horario)
app.post('/api/grupos', async (req, res) => {
    const { idMateria, idProfesor, idPeriodo, clave, cupo, aula, dias, horaInicio, horaFin } = req.body;
    const connection = await pool.promise().getConnection();
    try {
        await connection.beginTransaction(); 
        const queryGrupo = `
            INSERT INTO Grupos (ID_Materia, ID_Profesor, ID_Periodo, ClaveGrupo, CupoMaximo, Aula)
            VALUES (?, ?, ?, ?, ?, ?)`;
        const [resultGrupo] = await connection.query(queryGrupo, [idMateria, idProfesor, idPeriodo, clave, cupo, aula]);
        const idGrupoNuevo = resultGrupo.insertId;
        if (dias && dias.length > 0) {
            const queryHorario = `INSERT INTO Horarios (ID_Grupo, DiaSemana, Hora_Inicio, Hora_Fin) VALUES ?`;
            const horariosData = dias.map(dia => [idGrupoNuevo, dia, horaInicio, horaFin]);
            await connection.query(queryHorario, [horariosData]);
        } else {
            throw new Error("No se seleccionaron días para el horario.");
        }
        await connection.commit();
        res.status(201).json({ exito: true, mensaje: 'Grupo y horarios creados exitosamente' });
    } catch (error) {
        await connection.rollback();
        console.error("Error al crear grupo:", error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ exito: false, mensaje: 'Esa clave de grupo ya existe para ese periodo.' });
        }
        res.status(500).json({ exito: false, mensaje: error.message || 'Error del servidor al crear grupo' });
    } finally {
        connection.release();
    }
});


// GET (Leer alumnos por grupo)
app.get('/api/inscripciones/grupo/:idGrupo', async (req, res) => {
    const { idGrupo } = req.params;
    console.log(`Petición de alumnos para calificar en Grupo ID: ${idGrupo}`);
    const query = `
        SELECT 
            A.Matricula, 
            A.NombreCompleto, 
            I.ID_Inscripcion,
            C.CalificacionFinal,
            C.Estatus
        FROM Inscripciones AS I
        JOIN Alumnos AS A ON I.ID_Alumno = A.ID_Alumno
        LEFT JOIN Calificaciones AS C ON I.ID_Inscripcion = C.ID_Inscripcion
        WHERE I.ID_Grupo = ?
        ORDER BY A.NombreCompleto;
    `;
    try {
        const [alumnos] = await pool.promise().query(query, [idGrupo]);
        res.json({ exito: true, alumnos: alumnos });
    } catch (error) {
        console.error("Error al consultar alumnos del grupo:", error);
        res.status(500).json({ exito: false, mensaje: 'Error del servidor' });
    }
});

app.post('/api/calificaciones', async (req, res) => {
    const calificaciones = req.body;
    console.log("Petición para POST /api/calificaciones (guardar)");
    if (!calificaciones || calificaciones.length === 0) {
        return res.status(400).json({ exito: false, mensaje: 'No se enviaron calificaciones.' });
    }
    const connection = await pool.promise().getConnection();
    try {
        await connection.beginTransaction();
        const query = `
            INSERT INTO Calificaciones (ID_Inscripcion, CalificacionFinal, Estatus) 
            VALUES ?
            ON DUPLICATE KEY UPDATE 
                CalificacionFinal = VALUES(CalificacionFinal), 
                Estatus = VALUES(Estatus)
        `;
        const values = calificaciones.map(cal => {
            const calificacionNum = parseFloat(cal.calificacion);
            const estatus = calificacionNum >= 70 ? 'Aprobado' : 'Reprobado';
            return [cal.id_inscripcion, calificacionNum, estatus];
        });
        await connection.query(query, [values]);
        await connection.commit();
        res.status(201).json({ exito: true, mensaje: 'Calificaciones guardadas exitosamente' });
    } catch (error) {
        await connection.rollback();
        console.error("Error al guardar calificaciones:", error);
        res.status(500).json({ exito: false, mensaje: 'Error del servidor al guardar calificaciones' });
    } finally {
        connection.release();
    }
});

app.listen(port, () => {
    console.log(`¡Servidor backend corriendo en http://localhost:${port}`);
});