import Paciente from "../models/paciente.js";
import Cita from "../models/cita.js";
import Usuario from "../models/usuario.js"; 
import fs from 'fs'; 
import path from 'path'; 

export function borrarArchivoFisico(nombreArchivo) {
    if (!nombreArchivo || nombreArchivo === 'perfil_default.png') {
        return; 
    }
    
    const rutaArchivo = path.join(process.cwd(), 'web', 'images', nombreArchivo);
    
    try {
        if (fs.existsSync(rutaArchivo)) {
            fs.unlinkSync(rutaArchivo);
            console.log(`Archivo eliminado: ${nombreArchivo}`);
        }
    } catch (error) {
        console.error(`Error al borrar el archivo físico ${nombreArchivo}:`, error);
    }
}

export async function actualizarFotoPerfil(userId, nombreArchivo) {
    const user = await Usuario.findById(userId);
    if (!user) return;
    
    borrarArchivoFisico(user.fotoPerfil);
    
    await Usuario.findByIdAndUpdate(userId, { fotoPerfil: nombreArchivo });
}

export async function obtenerDoctores() {
    const doctoresBD = await Usuario.find({ role: 'administrador' }).select('username'); 
    return doctoresBD;
}

export async function obtenerTodosUsuarios() {
    const usuariosBD = await Usuario.find().select('-password'); 
    return usuariosBD;
}

export async function actualizarRolUsuario(userId, nuevoRol) {
    const usuarioActualizado = await Usuario.findByIdAndUpdate(
        userId, 
        { role: nuevoRol }, 
        { new: true }
    );
    return usuarioActualizado;
}

export async function buscarPacientesPorNombre(nombreBusqueda) {
    if (!nombreBusqueda) return [];
    
    const regex = new RegExp(nombreBusqueda, 'i');
    
    const pacientesEncontrados = await Paciente.find({
        $or: [
            { firstName: regex },
            { lastName: regex },
        ]
    }).select('-__v'); 
    
    return pacientesEncontrados;
}

export async function crearPaciente(datosPaciente) {
    const paciente = new Paciente(datosPaciente);
    const respuestaMongo = await paciente.save();
    return respuestaMongo;
}

export async function obtenerPacientes(query = {}) {
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

export async function crearCita(datosCita) {
    const cita = new Cita(datosCita);
    const respuestaMongo = await cita.save();
    return respuestaMongo;
}

export async function obtenerCitasPorDoctor(doctorUsername) {
    const citasBD = await Cita.find({ dentist: doctorUsername }).populate('paciente');
    return citasBD;
}

export async function obtenerCitasPorPaciente(pacienteId) {
    const citasBD = await Cita.find({ paciente: pacienteId }).populate('paciente');
    return citasBD;
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
