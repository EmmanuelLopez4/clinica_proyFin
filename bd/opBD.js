import Paciente from "../models/paciente.js";
import Cita from "../models/cita.js";
import Usuario from "../models/usuario.js"; // Necesario para actualizar la foto
import fs from 'fs'; 
import path from 'path'; 

// ===================================
// LÓGICA DE GESTIÓN DE ARCHIVOS (NUEVO)
// ===================================

// 🎯 Función para borrar el archivo físico (CRUCIAL para liberar espacio)
export function borrarArchivoFisico(nombreArchivo) {
    if (!nombreArchivo || nombreArchivo === 'perfil_default.png') {
        return; 
    }
    
    // Construye la ruta completa del archivo
    // path.join usa el directorio actual (process.cwd), 'web', 'images', y el nombre
    const rutaArchivo = path.join(process.cwd(), 'web', 'images', nombreArchivo);
    
    try {
        if (fs.existsSync(rutaArchivo)) {
            fs.unlinkSync(rutaArchivo);
            console.log(`✅ Archivo eliminado: ${nombreArchivo}`);
        }
    } catch (error) {
        console.error(`❌ Error al borrar el archivo físico ${nombreArchivo}:`, error);
    }
}

// 🎯 Función para actualizar la foto de perfil del usuario
export async function actualizarFotoPerfil(userId, nombreArchivo) {
    // 1. Obtener el usuario actual para saber si ya tenía una foto
    const user = await Usuario.findById(userId);
    if (!user) return;
    
    // 2. Borrar la foto anterior (si existe y no es la de defecto)
    borrarArchivoFisico(user.fotoPerfil);
    
    // 3. Actualizar el campo en la BD con el nuevo nombre
    await Usuario.findByIdAndUpdate(userId, { fotoPerfil: nombreArchivo });
}


// ===================================
// CRUD: PACIENTES
// ===================================

export async function crearPaciente(datosPaciente) {
    const paciente = new Paciente(datosPaciente);
    const respuestaMongo = await paciente.save();
    return respuestaMongo;
}

export async function obtenerPacientes(query = {}) {
    if (query.q) {
        const busqueda = new RegExp(query.q, 'i');
        const pacientesBD = await Paciente.find({
            $or: [
                { firstName: busqueda },
                { lastName: busqueda },
                { phone: busqueda },
                { email: busqueda }
            ]
        });
        return pacientesBD;
    }
    
    const pacientesBD = await Paciente.find();
    return pacientesBD;
}

export async function actualizarPaciente(id, datosActualizados) {
    const pacienteBD = await Paciente.findByIdAndUpdate(id, datosActualizados, { new: true });
    return pacienteBD;
}

export async function eliminarPaciente(id) {
    const pacienteBD = await Paciente.findByIdAndDelete(id);
    return pacienteBD;
}


// ===================================
// CRUD: CITAS Y AUXILIARES
// ===================================

export async function crearCita(datosCita) {
    const cita = new Cita(datosCita);
    const respuestaMongo = await cita.save();
    return respuestaMongo;
}

export async function obtenerCitas() {
    const citasBD = await Cita.find().populate('paciente');
    return citasBD;
}

export async function actualizarCita(id, datosActualizados) {
    const citaBD = await Cita.findByIdAndUpdate(id, datosActualizados, { new: true });
    return citaBD;
}

export async function eliminarCita(id) {
    const citaBD = await Cita.findByIdAndDelete(id);
    return citaBD;
}

export async function buscarPorID(id, coleccion) {
    if (coleccion === 'pacientes') {
        return await Paciente.findById(id);
    }
    if (coleccion === 'citas') {
        return await Cita.findById(id).populate('paciente'); 
    }
    if (coleccion === 'usuarios') {
        return await Usuario.findById(id); 
    }
    return null;
}