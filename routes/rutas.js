import { Router } from "express"; 
import * as opBD from "../bd/opBD.js"; 
import rutasP from "./rutasP.js";
import rutasC from "./rutasC.js"; 
import Usuario from "../models/usuario.js"; 
import { subirArchivo } from "../middlewares/subirArchivos.js"; // ⬅️ NUEVO: Importar middleware de Multer

const router = Router(); 

// ===================================================
// MIDDLEWARE DE AUTENTICACIÓN Y AUTORIZACIÓN 
// ===================================================

function verificarAutenticacion(req, res, next) {
    if (req.session.userId) {
        res.locals.role = req.session.role; 
        next(); 
    } else {
        res.redirect('/login'); 
    }
}

function verificarAdministrador(req, res, next) {
    if (req.session.role === 'administrador') {
        next(); 
    } else {
        res.redirect('/'); 
    }
}

function convertirFechaISO(fechaString) {
    if (!fechaString) return null;
    const partes = fechaString.split('/');
    if (partes.length === 3) {
        const dia = partes[0];
        const mes = partes[1];
        const anio = partes[2];
        const fechaISO = new Date(`${anio}-${mes}-${dia}T00:00:00.000Z`);
        if (!isNaN(fechaISO)) {
            return fechaISO;
        }
    }
    return fechaString; 
}


// ===================================================
// RUTAS DE AUTENTICACIÓN (LOGIN, LOGOUT)
// ===================================================

// Vista del formulario de Login
router.get("/login", (req, res) => {
    if (req.session.userId) return res.redirect('/perfil');
    res.render("login", { titulo: "Iniciar Sesión", error: null });
});

// Procesar el Login
router.post("/login", async (req, res) => {
    const { username, password } = req.body;
    
    const user = await Usuario.findOne({ username });

    if (user && user.password === password) { 
        req.session.userId = user._id;
        req.session.role = user.role;
        return res.redirect('/perfil'); 
    } else {
        return res.render("login", { titulo: "Iniciar Sesión", error: "Usuario o Contraseña incorrectos." });
    }
});

// Cerrar Sesión (Logout)
router.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error("Error al cerrar sesión:", err);
            return res.redirect('/');
        }
        res.clearCookie(process.env.NOMBRE_COOKIE, {path:"/"}); 
        res.redirect('/login'); 
    });
});


// ===================================================
// RUTAS PROTEGIDAS Y GESTIÓN DE PERFIL (NUEVO)
// ===================================================

// RUTA DE PERFIL/SESIÓN (Requiere autenticación)
router.get("/perfil", verificarAutenticacion, async (req, res) => {
    try {
        // Obtenemos todos los datos del usuario, incluyendo fotoPerfil
        const user = await Usuario.findById(req.session.userId); 

        if (!user) {
            return res.redirect('/logout'); 
        }

        res.render("perfil", { 
            titulo: "Mi Perfil",
            user: user // Pasamos el objeto completo a la vista
        });
    } catch (error) {
        console.error("Error al cargar el perfil:", error);
        res.redirect('/');
    }
});

// 🎯 NUEVA RUTA: Actualizar la foto de perfil (POST)
router.post("/perfil/actualizarFoto", verificarAutenticacion, subirArchivo(), async (req, res) => {
    try {
        const userId = req.session.userId;
        
        // req.file contiene la información del archivo subido por multer
        if (!req.file) {
            return res.redirect('/perfil');
        }
        
        // Llama a la función de la BD que borra la foto anterior y guarda el nuevo nombre
        await opBD.actualizarFotoPerfil(userId, req.file.filename);
        
        res.redirect('/perfil');
    } catch (error) {
        console.error("Error al subir foto:", error);
        res.redirect('/perfil');
    }
});


// ===================================================
// RUTAS DE ACCESO PÚBLICO y MONTAJE
// ===================================================

// RUTA HOME 
router.get("/", (req, res) => {
    res.locals.role = req.session.role || null; 
    const isAdmin = req.session.role === 'administrador'; 
    res.render("home", { titulo: "Panel Principal", isAdmin: isAdmin });
});

router.get('/estado', (req, res) => res.send({estado: 'ok', proyecto: 'Clinica Dental Backend'}));

// RUTA ADMINISTRADOR DE EJEMPLO
router.get("/admin/usuarios", verificarAdministrador, (req, res) => {
    res.send("<h1>Panel de Administración de Usuarios</h1><p>Solo visible para administradores.</p><a href='/'>Volver</a>");
});

// RUTA REPORTE (Acceso exclusivo para administradores)
router.get("/reporte", verificarAdministrador, async (req, res) => {
    try {
        const citasBD = await opBD.obtenerCitas();
        const pacientesBD = await opBD.obtenerPacientes();
        res.render("reporte", { titulo: "Reporte General", citasBD: citasBD, pacientesBD: pacientesBD });
    } catch (error) {
        console.error("Error al generar el reporte:", error);
        res.redirect("/"); 
    }
});

// MONTAJE DE RUTAS CRUD (Los archivos rutasP y rutasC contienen toda la lógica)
router.use('/', rutasP); 
router.use('/', rutasC); 


export default router;