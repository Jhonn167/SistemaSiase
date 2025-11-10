const RENDER_BACKEND_URL = "https://sistemasiase.onrender.com";
const esLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const API_URL = esLocal ? 'http://localhost:3000' : RENDER_BACKEND_URL;

console.log("Modo de API:", API_URL);

let materiasDisponibles = [];
let materiasInscritas = [];
const MAX_CREDITOS = 45;
let usuarioActual = null;

// --- Funciones de Utilidad ---
function formatTime(timeString) {
    if (!timeString) return '00:00';
    const [hour, minute] = timeString.split(':');
    return `${hour}:${minute}`;
}


async function cargarDatosAlumno(idUsuario) {
    try {
        const response = await fetch(`${API_URL}/api/alumnos/usuario/${idUsuario}`);
        const data = await response.json();
        if (data.exito) {
            document.getElementById('studentName').innerText = data.datos.NombreCompleto;
            document.getElementById('studentId').innerText = data.datos.Matricula;
            usuarioActual.id_alumno = data.datos.ID_Alumno;
        } else {
            document.getElementById('studentName').innerText = "Error al cargar nombre";
        }
    } catch (error) {
        console.error("Error al cargar datos del alumno:", error);
    }
}

async function cargarMateriasDelServidor() {
    const grid = document.getElementById('materiasGrid');
    grid.innerHTML = '<p>Cargando materias desde el servidor...</p>';
    try {
        const response = await fetch(`${API_URL}/api/materias`);
        if (!response.ok) throw new Error(`Error del servidor: ${response.status}`);
        const materiasDelServidor = await response.json();

        materiasDisponibles = materiasDelServidor.map(materia => {
            const dias = []; const horas = {};
            materia.horarios.forEach(h => {
                if (!dias.includes(h.dia)) dias.push(h.dia);
                const horaKey = `${formatTime(h.horaInicio)}-${formatTime(h.horaFin)}`;
                horas[horaKey] = true;
            });
            const diasStr = dias.map(d => d.substring(0, 3)).join('-');
            const horasStr = Object.keys(horas).join(', ');
            const primerHorario = materia.horarios[0] || { horaInicio: '00:00:00', horaFin: '00:00:00' };

            return {
                id: materia.id, nombre: materia.nombre, codigo: materia.codigo,
                creditos: materia.creditos, profesor: materia.profesor,
                horario: `${diasStr} ${horasStr}`, aula: materia.aula,
                cuposDisponibles: materia.cuposDisponibles, cuposTotales: materia.cuposTotales,
                dias: dias, horaInicio: formatTime(primerHorario.horaInicio),
                horaFin: formatTime(primerHorario.horaFin)
            };
        });
    } catch (error) {
        console.error('Error al cargar materias:', error);
        grid.innerHTML = `<p style="color: red;">Error al cargar materias.</p>`;
    }
}


async function cargarInscripciones(idAlumno) {
    console.log("Cargando inscripciones para el alumno:", idAlumno);
    try {
        const response = await fetch(`${API_URL}/api/inscripciones/alumno/${idAlumno}`);
        const data = await response.json();

        if (data.exito && data.gruposInscritos.length > 0) {
            materiasInscritas = [];
            data.gruposInscritos.forEach(idGrupo => {
                const materia = materiasDisponibles.find(m => m.id === idGrupo);
                if (materia) {
                    materiasInscritas.push(materia);
                }
            });
            console.log("Inscripciones cargadas:", materiasInscritas);
        } else {
            console.log("El alumno no tiene materias inscritas.");
            materiasInscritas = [];
        }
    } catch (error) {
        console.error("Error al cargar inscripciones:", error);
    }
    updateResumenInscripcion();
}


function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');

    if (screenId === 'materiasScreen') {
        renderMaterias();
    } else if (screenId === 'horarioScreen') {
        renderHorario();
    } else if (screenId === 'resumenScreen') {
        renderResumen();
    }

    else if (screenId === 'adminAlumnosScreen') {
        cargarAdminAlumnos();
    }
    else if (screenId === 'adminProfesoresScreen') {
        cargarAdminProfesores();
    }
    else if (screenId === 'adminMateriasScreen') {
        cargarAdminMaterias();
    }
    else if (screenId === 'adminGruposScreen') {
        poblarSelectsGrupos();
        cargarAdminGrupos();
    }
    else if (screenId === 'adminCalificacionesScreen') {
        poblarSelectGruposParaCalificar();
    }
}

document.getElementById('loginForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const loginErrorDiv = document.getElementById('loginError');
    loginErrorDiv.textContent = '';

    try {
        const response = await fetch(`${API_URL}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email, password: password })
        });
        const data = await response.json();

        if (data.exito) {
            usuarioActual = data;

            if (usuarioActual.rol === 'Alumno') {
                await cargarDatosAlumno(usuarioActual.idUsuario);
                await cargarMateriasDelServidor();
                await cargarInscripciones(usuarioActual.id_alumno);
                showScreen('menuScreen');

            } else if (usuarioActual.rol === 'Profesor' || usuarioActual.rol === 'Admin') {
                document.getElementById('adminName').innerText = usuarioActual.email;
                showScreen('adminMenuScreen');
            } else {
                loginErrorDiv.textContent = `Rol [${usuarioActual.rol}] no reconocido.`;
            }
        } else {
            loginErrorDiv.textContent = data.mensaje;
        }
    } catch (error) {
        console.error('Error en el login:', error);
        loginErrorDiv.textContent = 'No se pudo conectar al servidor.';
    }
});

function renderMaterias() {
    const grid = document.getElementById('materiasGrid');
    grid.innerHTML = '';
    if (materiasDisponibles.length === 0) {
        grid.innerHTML = '<p>No hay materias disponibles para mostrar.</p>';
        return;
    }

    materiasDisponibles.forEach(materia => {
        const isInscrita = materiasInscritas.some(m => m.id === materia.id);
        const cupoClass = materia.cuposDisponibles === 0 ? 'cupo-lleno' : materia.cuposDisponibles <= 5 ? 'cupo-limitado' : 'cupo-disponible';
        const cupoText = materia.cuposDisponibles === 0 ? 'Sin cupo' : `${materia.cuposDisponibles}/${materia.cuposTotales} disponibles`;

        const card = document.createElement('div');
        card.className = 'materia-card';
        card.innerHTML = `
            <div class="materia-header">
                <div class="materia-info"><h3>${materia.nombre}</h3><p>${materia.codigo}</p></div>
                <div class="materia-creditos">${materia.creditos} créditos</div>
            </div>
            <div class="materia-details">
                <div class="detail-item"><span class="detail-label">Profesor</span><span class="detail-value">${materia.profesor}</span></div>
                <div class="detail-item"><span class="detail-label">Horario</span><span class="detail-value">${materia.horario}</span></div>
                <div class="detail-item"><span class="detail-label">Aula</span><span class="detail-value">${materia.aula}</span></div>
                <div class="detail-item"><span class="detail-label">Cupos</span><span class="detail-value"><span class="cupo-indicator ${cupoClass}">${cupoText}</span></span></div>
            </div>
            <button class="btn btn-inscribir" onclick="inscribirMateria(${materia.id})" ${(isInscrita || materia.cuposDisponibles === 0 ? ' disabled' : '')}>
                ${(isInscrita ? 'Inscrita' : materia.cuposDisponibles === 0 ? 'Sin cupo' : 'Inscribir')}
            </button>`;
        grid.appendChild(card);
    });
    updateResumenInscripcion();
}

async function inscribirMateria(idGrupo) {
    const materia = materiasDisponibles.find(m => m.id === idGrupo);
    const creditosActuales = materiasInscritas.reduce((sum, m) => sum + m.creditos, 0);

    if (creditosActuales + materia.creditos > MAX_CREDITOS) {
        showAlert('No puedes inscribir esta materia. Excederías el límite de créditos.', 'danger');
        return;
    }
    const hayTraslape = materiasInscritas.some(m => {
        return m.dias.some(dia => materia.dias.includes(dia)) &&
            !(materia.horaFin <= m.horaInicio || materia.horaInicio >= m.horaFin);
    });
    if (hayTraslape) {
        showAlert('Esta materia se traslapa con otra ya inscrita en tu horario.', 'danger');
        return;
    }


    try {
        const response = await fetch(`${API_URL}/api/inscripciones`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id_alumno: usuarioActual.id_alumno,
                id_grupo: materia.id
            })
        });
        const data = await response.json();
        if (response.ok) {
            materiasInscritas.push(materia);
            showAlert(`✓ Materia inscrita correctamente: ${materia.nombre}`, 'success');
            renderMaterias();
        } else {
            showAlert(data.mensaje || 'Error al inscribir la materia.', 'danger');
        }
    } catch (error) {
        console.error("Error en fetch de inscribir:", error);
        showAlert('No se pudo conectar al servidor para inscribir.', 'danger');
    }
}

function showAlert(message, type = 'danger') {
    const alertContainer = document.getElementById('alertContainer');
    alertContainer.innerHTML = `<div class="alert alert-${type}">${message}</div>`;
    setTimeout(() => {
        alertContainer.innerHTML = '';
    }, 3000);
}

function updateResumenInscripcion() {
    const creditosActuales = materiasInscritas.reduce((sum, m) => sum + m.creditos, 0);
    document.getElementById('creditosActuales').textContent = creditosActuales;
    document.getElementById('materiasCount').textContent = materiasInscritas.length;
}

function renderHorario() {
    const tbody = document.getElementById('horarioBody');
    tbody.innerHTML = '';
    const horas = ['07:00-09:00', '09:00-11:00', '11:00-13:00', '13:00-15:00', '15:00-17:00', '17:00-19:00'];
    const dias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
    horas.forEach(function (hora) {
        const row = document.createElement('tr');
        let html = `<td><strong>${hora}</strong></td>`;
        dias.forEach(function (dia) {
            const materia = materiasInscritas.find(function (m) {
                return m.dias.includes(dia) && m.horario.includes(hora.split('-')[0]);
            });
            if (materia) {
                html += `<td><div class="horario-ocupado"><strong>${materia.nombre}</strong><br>${materia.aula}<br>${materia.profesor}</div></td>`;
            } else {
                html += '<td></td>';
            }
        });
        row.innerHTML = html;
        tbody.appendChild(row);
    });
}

function renderResumen() {
    document.getElementById('resumenMaterias').textContent = materiasInscritas.length;
    const totalCreditos = materiasInscritas.reduce((sum, m) => sum + m.creditos, 0);
    document.getElementById('resumenCreditos').textContent = totalCreditos;
    const list = document.getElementById('resumenMateriasList');
    list.innerHTML = '';
    if (materiasInscritas.length === 0) {
        list.innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">No tienes materias inscritas</p>';
        return;
    }
    materiasInscritas.forEach(function (materia) {
        const div = document.createElement('div');
        div.className = 'materia-seleccionada';
        div.innerHTML = `<div><h4 style="margin-bottom: 5px;">${materia.nombre} (${materia.codigo})</h4><p style="color: #666; font-size: 13px;">${materia.profesor} | ${materia.horario} | ${materia.creditos} créditos</p></div>
        <button class="btn-eliminar" onclick="eliminarMateria(${materia.id})">Eliminar</button>`;
        list.appendChild(div);
    });
}

async function eliminarMateria(idGrupo) {
    if (!confirm("¿Estás seguro de que quieres dar de baja esta materia? Esta acción es permanente.")) {
        return;
    }
    console.log(`Intentando eliminar grupo: ${idGrupo} para alumno: ${usuarioActual.id_alumno}`);
    try {
        const response = await fetch(`${API_URL}/api/inscripciones`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id_alumno: usuarioActual.id_alumno,
                id_grupo: idGrupo
            })
        });
        const data = await response.json();
        if (response.ok) {
            materiasInscritas = materiasInscritas.filter(m => m.id !== idGrupo);
            alert(data.mensaje);
            renderResumen();
            renderHorario();
        } else {
            alert(`Error: ${data.mensaje}`);
        }
    } catch (error) {
        console.error("Error en fetch de eliminar:", error);
        alert('No se pudo conectar al servidor para eliminar la materia.');
    }
}


function logout() {
    materiasInscritas = [];
    materiasDisponibles = [];
    usuarioActual = null;
    showScreen('loginScreen');
    document.getElementById('loginForm').reset();
    document.getElementById('loginError').textContent = '';
}


const modal = document.getElementById('editModal');
const modalTitle = document.getElementById('modalTitle');
const modalBody = document.getElementById('modalBody');

function abrirModal() {
    modal.classList.add('show');
}
function cerrarModal() {
    modal.classList.remove('show');
    modalTitle.innerText = 'Editar';
    modalBody.innerHTML = '';
}
window.onclick = function (event) {
    if (event.target == modal) {
        cerrarModal();
    }
}

// --- Gestión de Alumnos ---

async function cargarAdminAlumnos() {
    const tablaBody = document.getElementById('tablaAlumnosBody');
    tablaBody.innerHTML = '<tr><td colspan="5" style="text-align: center;">Cargando...</td></tr>';
    try {
        const response = await fetch(`${API_URL}/api/alumnos`);
        const data = await response.json();
        if (data.exito) {
            tablaBody.innerHTML = '';
            if (data.alumnos.length === 0) {
                tablaBody.innerHTML = '<tr><td colspan="5" style="text-align: center;">No hay alumnos registrados.</td></tr>';
                return;
            }
            data.alumnos.forEach(alumno => {
                const row = document.createElement('tr');
                const alumnoDataString = JSON.stringify(alumno).replace(/"/g, '&quot;');

                row.innerHTML = `
                    <td>${alumno.Matricula}</td>
                    <td>${alumno.NombreCompleto}</td>
                    <td>${alumno.Email}</td>
                    <td>${alumno.Carrera || 'N/A'}</td>
                    <td style="display: flex; gap: 5px;">
                        <button class="btn" style="font-size: 12px; padding: 5px 8px; background-color: #555;" onclick="abrirModalEditarAlumno(${alumnoDataString})">Editar</button>
                        <button class="btn-eliminar" style="font-size: 12px; padding: 5px 8px;" onclick="borrarAlumno(${alumno.ID_Alumno})">Borrar</button>
                    </td>
                `;
                tablaBody.appendChild(row);
            });
        } else {
            tablaBody.innerHTML = `<tr><td colspan="5" style="color: red; text-align: center;">${data.mensaje}</td></tr>`;
        }
    } catch (error) {
        console.error("Error al cargar alumnos:", error);
        tablaBody.innerHTML = '<tr><td colspan="5" style="color: red; text-align: center;">No se pudo conectar al servidor.</td></tr>';
    }
}

document.getElementById('formCrearAlumno').addEventListener('submit', async function (e) {
    e.preventDefault();
    const errorDiv = document.getElementById('adminAlumnoError');
    const exitoDiv = document.getElementById('adminAlumnoExito');
    errorDiv.style.display = 'none';
    exitoDiv.style.display = 'none';
    const alumno = {
        nombre: document.getElementById('adminNombre').value,
        email: document.getElementById('adminEmail').value,
        matricula: document.getElementById('adminMatricula').value,
        password: document.getElementById('adminPassword').value,
        carrera: document.getElementById('adminCarrera').value
    };
    try {
        const response = await fetch(`${API_URL}/api/alumnos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(alumno)
        });
        const data = await response.json();
        if (response.ok) {
            exitoDiv.textContent = data.mensaje || '¡Alumno creado!';
            exitoDiv.style.display = 'block';
            document.getElementById('formCrearAlumno').reset();
            cargarAdminAlumnos();
        } else {
            errorDiv.textContent = data.mensaje || 'Error al crear alumno.';
            errorDiv.style.display = 'block';
        }
    } catch (error) {
        errorDiv.textContent = 'No se pudo conectar al servidor.';
        errorDiv.style.display = 'block';
    }
});


function abrirModalEditarAlumno(alumno) {
    console.log("Editando alumno:", alumno);
    modalTitle.innerText = 'Editar Alumno';
    modalBody.innerHTML = `
        <form id="formEditarAlumno">
            <input type="hidden" id="editAlumnoId" value="${alumno.ID_Alumno}">
            <input type="hidden" id="editUsuarioId" value="${alumno.ID_Usuario}">
            <div class="form-group">
                <label for="editAlumnoNombre">Nombre Completo</label>
                <input type="text" id="editAlumnoNombre" class="form-control" value="${alumno.NombreCompleto}" required>
            </div>
            <div class="form-row">
                <div class="form-group" style="flex: 1;">
                    <label for="editAlumnoMatricula">Matrícula</label>
                    <input type="text" id="editAlumnoMatricula" class="form-control" value="${alumno.Matricula}" required>
                </div>
                <div class="form-group" style="flex: 1;">
                    <label for="editAlumnoCarrera">Carrera</label>
                    <input type="text" id="editAlumnoCarrera" class="form-control" value="${alumno.Carrera || ''}">
                </div>
            </div>
            <div class="form-group">
                <label for="editAlumnoEmail">Email (Usuario)</label>
                <input type="email" id="editAlumnoEmail" class="form-control" value="${alumno.Email}" required>
            </div>
            <p style="font-size: 12px; color: #666;">(La edición de contraseña se debe hacer en un módulo separado)</p>
            <div id="editAlumnoError" class="alert alert-danger" style="display: none; margin-top: 15px;"></div>
            <button type="submit" class="btn" style="margin-top: 20px;">Guardar Cambios</button>
        </form>
    `;

    document.getElementById('formEditarAlumno').addEventListener('submit', guardarCambiosAlumno);
    abrirModal();
}

async function guardarCambiosAlumno(e) {
    e.preventDefault();
    const errorDiv = document.getElementById('editAlumnoError');
    errorDiv.style.display = 'none';
    const idAlumno = document.getElementById('editAlumnoId').value;
    const alumnoActualizado = {
        idUsuario: document.getElementById('editUsuarioId').value,
        nombre: document.getElementById('editAlumnoNombre').value,
        email: document.getElementById('editAlumnoEmail').value,
        matricula: document.getElementById('editAlumnoMatricula').value,
        carrera: document.getElementById('editAlumnoCarrera').value
    };

    try {
        const response = await fetch(`${API_URL}/api/alumnos/${idAlumno}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(alumnoActualizado)
        });
        const data = await response.json();

        if (response.ok) {
            alert(data.mensaje);
            cerrarModal();
            cargarAdminAlumnos();
        } else {
            errorDiv.textContent = data.mensaje || 'Error al actualizar.';
            errorDiv.style.display = 'block';
        }
    } catch (error) {
        errorDiv.textContent = 'No se pudo conectar al servidor.';
        errorDiv.style.display = 'block';
    }
}


async function borrarAlumno(idAlumno) {
    if (!confirm(`¿Estás seguro de que quieres borrar al alumno con ID ${idAlumno}? Esta acción es PERMANENTE y borrará también sus inscripciones y su usuario.`)) {
        return;
    }
    try {
        const response = await fetch(`${API_URL}/api/alumnos/${idAlumno}`, {
            method: 'DELETE'
        });
        const data = await response.json();
        if (response.ok) {
            alert(data.mensaje);
            cargarAdminAlumnos();
        } else {
            alert(`Error: ${data.mensaje}`);
        }
    } catch (error) {
        console.error("Error al borrar alumno:", error);
        alert("No se pudo conectar al servidor para borrar al alumno.");
    }
}


// --- Gestión de Profesores ---

async function cargarAdminProfesores() {
    const tablaBody = document.getElementById('tablaProfesoresBody');
    tablaBody.innerHTML = '<tr><td colspan="4" style="text-align: center;">Cargando...</td></tr>';
    try {
        const response = await fetch(`${API_URL}/api/profesores`);
        const data = await response.json();
        if (data.exito) {
            tablaBody.innerHTML = '';
            if (data.profesores.length === 0) {
                tablaBody.innerHTML = '<tr><td colspan="4" style="text-align: center;">No hay profesores registrados.</td></tr>';
                return;
            }
            data.profesores.forEach(profesor => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${profesor.NombreCompleto}</td>
                    <td>${profesor.Email}</td>
                    <td>${profesor.CedulaProfesional || 'N/A'}</td>
                    <td style="display: flex; gap: 5px;">
                        <button class="btn" style="font-size: 12px; padding: 5px 8px; background-color: #555;">Editar</button>
                        <button class="btn-eliminar" style="font-size: 12px; padding: 5px 8px;" onclick="borrarProfesor(${profesor.ID_Profesor})">Borrar</button>
                    </td>
                `;
                tablaBody.appendChild(row);
            });
        } else {
            tablaBody.innerHTML = `<tr><td colspan="4" style="color: red; text-align: center;">${data.mensaje}</td></tr>`;
        }
    } catch (error) {
        console.error("Error al cargar profesores:", error);
        tablaBody.innerHTML = '<tr><td colspan="4" style="color: red; text-align: center;">No se pudo conectar al servidor.</td></tr>';
    }
}

document.getElementById('formCrearProfesor').addEventListener('submit', async function (e) {
    e.preventDefault();
    const errorDiv = document.getElementById('adminProfesorError');
    const exitoDiv = document.getElementById('adminProfesorExito');
    errorDiv.style.display = 'none';
    exitoDiv.style.display = 'none';
    const profesor = {
        nombre: document.getElementById('adminProfNombre').value,
        email: document.getElementById('adminProfEmail').value,
        cedula: document.getElementById('adminProfCedula').value,
        password: document.getElementById('adminProfPassword').value
    };
    try {
        const response = await fetch(`${API_URL}/api/profesores`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(profesor)
        });
        const data = await response.json();
        if (response.ok) {
            exitoDiv.textContent = data.mensaje || '¡Profesor creado!';
            exitoDiv.style.display = 'block';
            document.getElementById('formCrearProfesor').reset();
            cargarAdminProfesores();
        } else {
            errorDiv.textContent = data.mensaje || 'Error al crear profesor.';
            errorDiv.style.display = 'block';
        }
    } catch (error) {
        errorDiv.textContent = 'No se pudo conectar al servidor.';
        errorDiv.style.display = 'block';
    }
});

async function borrarProfesor(idProfesor) {
    if (!confirm(`¿Estás seguro de que quieres borrar al profesor con ID ${idProfesor}? Esta acción es PERMANENTE.`)) {
        return;
    }
    try {
        const response = await fetch(`${API_URL}/api/profesores/${idProfesor}`, {
            method: 'DELETE'
        });
        const data = await response.json();
        if (response.ok) {
            alert(data.mensaje);
            cargarAdminProfesores();
        } else {
            alert(`Error: ${data.mensaje}`);
        }
    } catch (error) {
        console.error("Error al borrar profesor:", error);
        alert("No se pudo conectar al servidor para borrar al profesor.");
    }
}

// --- Gestión de Materias ---

async function cargarAdminMaterias() {
    const tablaBody = document.getElementById('tablaMateriasBody');
    tablaBody.innerHTML = '<tr><td colspan="4" style="text-align: center;">Cargando...</td></tr>';
    try {
        const response = await fetch(`${API_URL}/api/catalogo/materias`);
        const data = await response.json();
        if (data.exito) {
            tablaBody.innerHTML = '';
            if (data.materias.length === 0) {
                tablaBody.innerHTML = '<tr><td colspan="4" style="text-align: center;">No hay materias registradas.</td></tr>';
                return;
            }
            data.materias.forEach(materia => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${materia.ClaveMateria}</td>
                    <td>${materia.Nombre}</td>
                    <td>${materia.Creditos}</td>
                    <td style="display: flex; gap: 5px;">
                        <button class="btn" style="font-size: 12px; padding: 5px 8px; background-color: #555;" onclick="abrirModalEditarMateria(${materia.ID_Materia})">Editar</button>
                        <button class="btn-eliminar" style="font-size: 12px; padding: 5px 8px;" onclick="borrarMateria(${materia.ID_Materia})">Borrar</button>
                    </td>
                `;
                tablaBody.appendChild(row);
            });
        } else {
            tablaBody.innerHTML = `<tr><td colspan="4" style="color: red; text-align: center;">${data.mensaje}</td></tr>`;
        }
    } catch (error) {
        console.error("Error al cargar materias:", error);
        tablaBody.innerHTML = '<tr><td colspan="4" style="color: red; text-align: center;">No se pudo conectar al servidor.</td></tr>';
    }
}

document.getElementById('formCrearMateria').addEventListener('submit', async function (e) {
    e.preventDefault();
    const errorDiv = document.getElementById('adminMateriaError');
    const exitoDiv = document.getElementById('adminMateriaExito');
    errorDiv.style.display = 'none';
    exitoDiv.style.display = 'none';
    const materia = {
        nombre: document.getElementById('adminMateriaNombre').value,
        clave: document.getElementById('adminMateriaClave').value,
        creditos: document.getElementById('adminMateriaCreditos').value
    };
    try {
        const response = await fetch(`${API_URL}/api/catalogo/materias`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(materia)
        });
        const data = await response.json();
        if (response.ok) {
            exitoDiv.textContent = data.mensaje || '¡Materia creada!';
            exitoDiv.style.display = 'block';
            document.getElementById('formCrearMateria').reset();
            cargarAdminMaterias();
        } else {
            errorDiv.textContent = data.mensaje || 'Error al crear materia.';
            errorDiv.style.display = 'block';
        }
    } catch (error) {
        errorDiv.textContent = 'No se pudo conectar al servidor.';
        errorDiv.style.display = 'block';
    }
});
async function borrarMateria(idMateria) {
    if (!confirm(`¿Estás seguro de que quieres borrar la materia con ID ${idMateria}? Esta acción es PERMANENTE.`)) {
        return;
    }
    try {
        const response = await fetch(`${API_URL}/api/catalogo/materias/${idMateria}`, {
            method: 'DELETE'
        });
        const data = await response.json();
        if (response.ok) {
            alert(data.mensaje);
            cargarAdminMaterias();
            alert(`Error: ${data.mensaje}`);
        }
    } catch (error) {
        console.error("Error al borrar materia:", error);
        alert("No se pudo conectar al servidor para borrar la materia.");
    }
}

async function abrirModalEditarMateria(idMateria) {
    console.log("Editando materia:", idMateria);
    modalTitle.innerText = 'Editar Materia';
    try {
        const response = await fetch(`${API_URL}/api/catalogo/materias/${idMateria}`);
        const data = await response.json();
        if (!data.exito) {
            alert(data.mensaje);
            return;
        }
        const materia = data.materia;
        modalBody.innerHTML = `
            <form id="formEditarMateria">
                <input type="hidden" id="editMateriaId" value="${materia.ID_Materia}">
                <div class="form-group">
                    <label for="editMateriaNombre">Nombre de la Materia</label>
                    <input type="text" id="editMateriaNombre" class="form-control" value="${materia.Nombre}" required>
                </div>
                <div class="form-row">
                    <div class="form-group" style="flex: 1;">
                        <label for="editMateriaClave">Clave de Materia</label>
                        <input type="text" id="editMateriaClave" class="form-control" value="${materia.ClaveMateria}" required>
                    </div>
                    <div class="form-group" style="flex: 1;">
                        <label for="editMateriaCreditos">Créditos</label>
                        <input type="number" id="editMateriaCreditos" class="form-control" value="${materia.Creditos}" required>
                    </div>
                </div>
                <div id="editMateriaError" class="alert alert-danger" style="display: none; margin-top: 15px;"></div>
                <button type="submit" class="btn" style="margin-top: 20px;">Guardar Cambios</button>
            </form>
        `;
        document.getElementById('formEditarMateria').addEventListener('submit', guardarCambiosMateria);
        abrirModal();
    } catch (error) {
        console.error("Error al abrir modal:", error);
        alert("No se pudieron cargar los datos para editar.");
    }
}

async function guardarCambiosMateria(e) {
    e.preventDefault();
    const errorDiv = document.getElementById('editMateriaError');
    errorDiv.style.display = 'none';
    const idMateria = document.getElementById('editMateriaId').value;
    const materiaActualizada = {
        nombre: document.getElementById('editMateriaNombre').value,
        clave: document.getElementById('editMateriaClave').value,
        creditos: document.getElementById('editMateriaCreditos').value
    };
    try {
        const response = await fetch(`${API_URL}/api/catalogo/materias/${idMateria}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(materiaActualizada)
        });
        const data = await response.json();
        if (response.ok) {
            alert(data.mensaje);
            cerrarModal();
            cargarAdminMaterias();
        } else {
            errorDiv.textContent = data.mensaje || 'Error al actualizar.';
            errorDiv.style.display = 'block';
        }
    } catch (error) {
        errorDiv.textContent = 'No se pudo conectar al servidor.';
        errorDiv.style.display = 'block';
    }
}


// --- Gestión de Grupos ---

async function poblarSelectsGrupos() {
    const selMateria = document.getElementById('adminGrupoMateria');
    const selProfesor = document.getElementById('adminGrupoProfesor');
    const selPeriodo = document.getElementById('adminGrupoPeriodo');

    try {
        const [resMaterias, resProfesores, resPeriodos] = await Promise.all([
            fetch(`${API_URL}/api/catalogo/materias`),
            fetch(`${API_URL}/api/profesores`),
            fetch(`${API_URL}/api/periodos`)
        ]);
        const dataMaterias = await resMaterias.json();
        const dataProfesores = await resProfesores.json();
        const dataPeriodos = await resPeriodos.json();
        selMateria.innerHTML = '<option value="">-- Selecciona una materia --</option>';
        if (dataMaterias.exito) {
            dataMaterias.materias.forEach(m => {
                selMateria.innerHTML += `<option value="${m.ID_Materia}">${m.Nombre} (${m.ClaveMateria})</option>`;
            });
        }
        selProfesor.innerHTML = '<option value="">-- Selecciona un profesor --</option>';
        if (dataProfesores.exito) {
            dataProfesores.profesores.forEach(p => {
                selProfesor.innerHTML += `<option value="${p.ID_Profesor}">${p.NombreCompleto}</option>`;
            });
        }
        selPeriodo.innerHTML = '';
        if (dataPeriodos.exito && dataPeriodos.periodos.length > 0) {
            dataPeriodos.periodos.forEach(p => {
                selPeriodo.innerHTML += `<option value="${p.ID_Periodo}">${p.Nombre}</option>`;
            });
        } else {
            selPeriodo.innerHTML = '<option value="">-- No hay periodos activos --</option>';
        }

    } catch (error) {
        console.error("Error poblando selects de grupos:", error);
    }
}

async function cargarAdminGrupos() {
    const tablaBody = document.getElementById('tablaGruposBody');
    tablaBody.innerHTML = '<tr><td colspan="6" style="text-align: center;">Cargando...</td></tr>';

    try {
        const response = await fetch(`${API_URL}/api/grupos`);
        const data = await response.json();

        if (data.exito) {
            tablaBody.innerHTML = '';
            if (data.grupos.length === 0) {
                tablaBody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No hay grupos creados.</td></tr>';
                return;
            }
            data.grupos.forEach(grupo => {
                const row = document.createElement('tr');
                const cupoTexto = `${grupo.Inscritos || 0} / ${grupo.CupoMaximo}`;
                const horarioTexto = `${grupo.Dias || ''} ${grupo.HoraInicio || ''}-${grupo.HoraFin || ''}`;
                row.innerHTML = `
                    <td>${grupo.ClaveGrupo}</td>
                    <td>${grupo.Materia}</td>
                    <td>${grupo.Profesor}</td>
                    <td>${horarioTexto || 'N/A'}</td>
                    <td>${grupo.Aula || 'N/A'}</td>
                    <td>${cupoTexto}</td>
                `;
                tablaBody.appendChild(row);
            });
        } else {
            tablaBody.innerHTML = `<tr><td colspan="6" style="color: red; text-align: center;">${data.mensaje}</td></tr>`;
        }
    } catch (error) {
        console.error("Error al cargar grupos:", error);
        tablaBody.innerHTML = '<tr><td colspan="6" style="color: red; text-align: center;">No se pudo conectar al servidor.</td></tr>';
    }
}

document.getElementById('formCrearGrupo').addEventListener('submit', async function (e) {
    e.preventDefault();

    const errorDiv = document.getElementById('adminGrupoError');
    const exitoDiv = document.getElementById('adminGrupoExito');
    errorDiv.style.display = 'none';
    exitoDiv.style.display = 'none';

    const diasSeleccionados = [];
    document.querySelectorAll('input[name="adminGrupoDias"]:checked').forEach(checkbox => {
        diasSeleccionados.push(checkbox.value);
    });

    const grupo = {
        idMateria: document.getElementById('adminGrupoMateria').value,
        idProfesor: document.getElementById('adminGrupoProfesor').value,
        idPeriodo: document.getElementById('adminGrupoPeriodo').value,
        clave: document.getElementById('adminGrupoClave').value,
        cupo: document.getElementById('adminGrupoCupo').value,
        aula: document.getElementById('adminGrupoAula').value,
        dias: diasSeleccionados, // ¡¡ARRAY DE DÍAS!!
        horaInicio: document.getElementById('adminGrupoHoraInicio').value,
        horaFin: document.getElementById('adminGrupoHoraFin').value
    };

    if (!grupo.idMateria || !grupo.idProfesor || !grupo.idPeriodo) {
        errorDiv.textContent = 'Por favor, selecciona materia, profesor y periodo.';
        errorDiv.style.display = 'block';
        return;
    }
    if (grupo.dias.length === 0) {
        errorDiv.textContent = 'Por favor, selecciona al menos un día para el horario.';
        errorDiv.style.display = 'block';
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/grupos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(grupo)
        });
        const data = await response.json();

        if (response.ok) {
            exitoDiv.textContent = data.mensaje || '¡Grupo creado!';
            exitoDiv.style.display = 'block';
            document.getElementById('formCrearGrupo').reset();
            document.querySelectorAll('input[name="adminGrupoDias"]:checked').forEach(checkbox => {
                checkbox.checked = false;
            });
            cargarAdminGrupos();
        } else {
            errorDiv.textContent = data.mensaje || 'Error al crear grupo.';
            errorDiv.style.display = 'block';
        }
    } catch (error) {
        errorDiv.textContent = 'No se pudo conectar al servidor.';
        errorDiv.style.display = 'block';
    }
});

async function poblarSelectGruposParaCalificar() {
    const select = document.getElementById('selectGrupoParaCalificar');
    select.innerHTML = '<option value="">Cargando grupos...</option>';
    document.getElementById('tablaCalificacionesBody').innerHTML = '<tr><td colspan="4" style="text-align: center;">Seleccione un grupo para comenzar</td></tr>';
    try {
        const response = await fetch(`${API_URL}/api/grupos`);
        const data = await response.json();
        select.innerHTML = '<option value="">-- Seleccione un grupo --</option>';
        if (data.exito && data.grupos.length > 0) {
            data.grupos.forEach(grupo => {
                select.innerHTML += `<option value="${grupo.ID_Grupo}">${grupo.ClaveGrupo} - ${grupo.Materia}</option>`;
            });
        } else {
            select.innerHTML = '<option value="">-- No hay grupos para calificar --</option>';
        }
    } catch (error) {
        console.error("Error al cargar grupos para calificar:", error);
        select.innerHTML = '<option value="">-- Error al cargar --</option>';
    }
}

document.getElementById('selectGrupoParaCalificar').addEventListener('change', (e) => {
    const idGrupo = e.target.value;
    document.getElementById('adminCalificacionesError').style.display = 'none';
    document.getElementById('adminCalificacionesExito').style.display = 'none';
    if (idGrupo) {
        cargarAlumnosParaCalificar(idGrupo);
    } else {
        document.getElementById('tablaCalificacionesBody').innerHTML = '<tr><td colspan="4" style="text-align: center;">Seleccione un grupo para comenzar</td></tr>';
    }
});


async function cargarAlumnosParaCalificar(idGrupo) {
    const tablaBody = document.getElementById('tablaCalificacionesBody');
    tablaBody.innerHTML = '<tr><td colspan="4" style="text-align: center;">Cargando alumnos...</td></tr>';
    try {
        const response = await fetch(`${API_URL}/api/inscripciones/grupo/${idGrupo}`);
        const data = await response.json();

        if (data.exito && data.alumnos.length > 0) {
            tablaBody.innerHTML = '';
            data.alumnos.forEach(alumno => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${alumno.Matricula}</td>
                    <td>${alumno.NombreCompleto}</td>
                    <td>
                        <input 
                            type="number" 
                            class="form-control calificacion-input" 
                            value="${alumno.CalificacionFinal || ''}" 
                            data-idinscripcion="${alumno.ID_Inscripcion}"
                            min="0" max="100"
                        >
                    </td>
                    <td>${alumno.Estatus || 'Cursando'}</td>
                `;
                tablaBody.appendChild(row);
            });
        } else if (data.alumnos.length === 0) {
            tablaBody.innerHTML = '<tr><td colspan="4" style="text-align: center;">No hay alumnos inscritos en este grupo.</td></tr>';
        } else {
            tablaBody.innerHTML = `<tr><td colspan="4" style="color: red; text-align: center;">${data.mensaje}</td></tr>`;
        }
    } catch (error) {
        console.error("Error al cargar alumnos del grupo:", error);
        tablaBody.innerHTML = '<tr><td colspan="4" style="color: red; text-align: center;">No se pudo conectar al servidor.</td></tr>';
    }
}

document.getElementById('formGuardarCalificaciones').addEventListener('submit', async function (e) {
    e.preventDefault();

    const errorDiv = document.getElementById('adminCalificacionesError');
    const exitoDiv = document.getElementById('adminCalificacionesExito');
    errorDiv.style.display = 'none';
    exitoDiv.style.display = 'none';
    const inputs = document.querySelectorAll('.calificacion-input');
    const calificacionesParaEnviar = [];

    let hayCalificacionesInvalidas = false;
    inputs.forEach(input => {
        const calificacion = input.value;
        if (calificacion !== '') {
            const calNum = parseFloat(calificacion);
            if (calNum < 0 || calNum > 100) {
                hayCalificacionesInvalidas = true;
            }
            calificacionesParaEnviar.push({
                id_inscripcion: input.dataset.idinscripcion,
                calificacion: calNum
            });
        }
    });

    if (hayCalificacionesInvalidas) {
        errorDiv.textContent = 'Error: Las calificaciones deben estar entre 0 y 100.';
        errorDiv.style.display = 'block';
        return;
    }
    if (calificacionesParaEnviar.length === 0) {
        errorDiv.textContent = 'No hay calificaciones nuevas para guardar.';
        errorDiv.style.display = 'block';
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/calificaciones`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(calificacionesParaEnviar)
        });

        const data = await response.json();

        if (response.ok) {
            exitoDiv.textContent = data.mensaje;
            exitoDiv.style.display = 'block';
            const idGrupoSeleccionado = document.getElementById('selectGrupoParaCalificar').value;
            cargarAlumnosParaCalificar(idGrupoSeleccionado);
        } else {
            errorDiv.textContent = data.mensaje;
            errorDiv.style.display = 'block';
        }

    } catch (error) {
        console.error("Error al guardar calificaciones:", error);
        errorDiv.textContent = 'No se pudo conectar al servidor.';
        errorDiv.style.display = 'block';
    }
});