import { Router } from "express";
import * as opBD from "../bd/opBD.js";
import { convertirFechaISO } from "./rutas.js"; 
import Usuario from "../models/usuario.js"; 

const rutasC = Router();

// ===================================
// RUTAS GET (VISTAS)
// ===================================

// RUTA: Mostrar la tabla de Citas y el formulario de agregar/buscar
rutasC.get("/citas", async (req, res) => {
    try {
        const userId = req.session.userId;
        const userRole = req.session.role;
        const searchTerm = req.query.q || ''; // ⬅️ Captura el término de búsqueda
        
        let citasBD;
        let resultadosBusqueda = [];

        if (userRole === 'administrador') {
            // 🔥 LÓGICA DE BÚSQUEDA Y AGENDA PARA ADMINISTRADOR
            if (searchTerm) {
                // Si hay término de búsqueda, busca pacientes
                resultadosBusqueda = await opBD.buscarPacientesPorNombre(searchTerm);
                citasBD = []; // No cargamos citas si estamos buscando pacientes
            } else {
                // Si no hay búsqueda, muestra la agenda personal del doctor
                const user = await Usuario.findById(userId);
                const doctorUsername = user ? user.username : null; 
                citasBD = doctorUsername ? await opBD.obtenerCitasPorDoctor(doctorUsername) : [];
            }
        } else {
            // PACIENTE (Normal): Solo ve SUS citas
            citasBD = await opBD.obtenerCitasPorPaciente(userId); 
        }
        
        const doctoresBD = await opBD.obtenerDoctores();
        
        res.render("citas", {
            titulo: "Gestión de Citas",
            citasBD: citasBD,
            currentUserId: userId,
            userRole: userRole,
            doctores: doctoresBD,
            // 🔥 Pasamos el término y resultados para la vista condicional
            busqueda: { 
                term: searchTerm,
                resultados: resultadosBusqueda
            }
        });
    } catch (error) {
        console.error("Error al obtener citas:", error);
        res.status(500).send("Error interno del servidor al obtener citas.");
    }
});

// RUTA: Vista para modificar una Cita
rutasC.get("/citas/editar/:id", async (req, res) => {
    const { id } = req.params;
    try {
        const cita = await opBD.buscarPorID(id, 'citas');
        if (cita) {
            const dbDate = new Date(cita.date);
            const fechaString = dbDate.toLocaleDateString('es-ES', { year: 'numeric', month: '2-digit', day: '2-digit' });
            const horaString = dbDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false });
            
            res.render("editarCita", {
                titulo: "Modificar Cita",
                cita: cita,
                fechaString: fechaString,
                horaString: horaString
            });
        } else {
            res.status(404).send("Cita no encontrada.");
        }
    } catch (error) {
        console.error("Error al obtener cita para editar:", error);
        res.status(500).send("Error interno del servidor.");
    }
});


// ===================================
// RUTAS API (CRUD)
// ===================================

// API POST: Crear nueva Cita
rutasC.post("/api/citas", async (req, res) => {
    const { paciente, dentist, date, time } = req.body; 
    
    const fechaCompleta = convertirFechaISO(date, time); 

    try {
        if (!fechaCompleta) {
             return res.redirect("/citas"); 
        }
        
        const nuevaCita = await opBD.crearCita({
            paciente: paciente,
            dentist: dentist,
            date: fechaCompleta
        });
        res.redirect("/citas"); 
    } catch (error) {
        console.error("Error al crear cita:", error);
        res.redirect("/citas");
    }
});

// API POST: Actualizar Cita
rutasC.post("/api/citas/editar/:id", async (req, res) => {
    const { id } = req.params;
    const { paciente, dentist, date, time } = req.body; 
    
    const fechaCompleta = convertirFechaISO(date, time);

    try {
        if (!fechaCompleta) {
             return res.redirect("/citas"); 
        }
        
        const citaActualizada = await opBD.actualizarCita(id, {
            paciente: paciente,
            dentist: dentist,
            date: fechaCompleta
        });
        if (citaActualizada) {
            res.redirect("/citas"); 
        } else {
            res.status(404).send("Cita no encontrada para actualizar.");
        }
    } catch (error) {
        console.error("Error al actualizar cita:", error);
        res.redirect("/citas");
    }
});

// API POST: Borrar Cita
rutasC.post("/api/citas/borrar/:id", async (req, res) => {
    const { id } = req.params;
    try {
        const citaEliminada = await opBD.eliminarCita(id);
        if (citaEliminada) {
            res.redirect("/citas"); 
        } else {
            res.status(404).send("Cita no encontrada para eliminar.");
        }
    } catch (error) {
        console.error("Error al eliminar cita:", error);
        res.redirect("/citas");
    }
});

export default rutasC;