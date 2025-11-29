import { Router } from "express"; 
import * as opBD from "../bd/opBD.js"; 
import rutasC from "./rutasC.js"; 
import Usuario from "../models/usuario.js"; 
import { subirArchivo } from "../middlewares/subirArchivos.js";

const router = Router(); 

// ===================================================
// UTILIDAD: CONVERSIÓN DE FECHA Y HORA 
// ===================================================

export function convertirFechaISO(fechaString, horaString) {
    if (!fechaString || !horaString) return null;
    
    const partesFecha = fechaString.split('/');
    if (partesFecha.length !== 3) return null;

    const dia = partesFecha[0];
    const mes = partesFecha[1];
    const anio = partesFecha[2];

    // Corregido: Usa la hora local sin la Z
    const fechaISO = new Date(`${anio}-${mes}-${dia}T${horaString}:00`); 

    if (isNaN(fechaISO.getTime())) {
        return null; 
    }
    return fechaISO;
}


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


// ===================================================
// RUTAS DE AUTENTICACIÓN (LOGIN, REGISTRO, LOGOUT)
// ===================================================

router.get("/login", (req, res) => {
    if (req.session.userId) return res.redirect('/perfil');
    res.render("login", { titulo: "Iniciar Sesión", error: null });
});

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

router.get("/registro", (req, res) => {
    res.render("registro", { titulo: "Registro", error: null });
});

// Procesar el Registro (Crea usuarios con rol 'normal' sin crear el registro de paciente aquí)
router.post("/registro", async (req, res) => {
    const { username, password } = req.body;
    
    try {
        const userExists = await Usuario.findOne({ username });
        if (userExists) {
            return res.render("registro", { titulo: "Registro", error: "Este nombre de usuario ya está registrado." });
        }
        
        const newUser = new Usuario({
            username: username,
            password: password,
            role: 'normal' 
        });
        await newUser.save();
        
        // 🔥 BLOQUE ELIMINADO: La creación del paciente ya NO ocurre aquí.
        // Ocurrirá en la ruta Home si no existe (router.get("/")).
        
        req.session.userId = newUser._id;
        req.session.role = newUser.role;
        return res.redirect('/perfil');
        
    } catch (error) {
        console.error("Error al registrar nuevo usuario:", error);
        return res.render("registro", { titulo: "Registro", error: "Error interno al registrarse." });
    }
});

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
// RUTAS PROTEGIDAS Y GESTIÓN DE PERFIL/FOTO
// ===================================================

router.get("/perfil", verificarAutenticacion, async (req, res) => {
    try {
        const user = await Usuario.findById(req.session.userId); 

        if (!user) {
            return res.redirect('/logout'); 
        }

        res.render("perfil", { 
            titulo: "Mi Perfil",
            user: user 
        });
    } catch (error) {
        console.error("Error al cargar el perfil:", error);
        res.redirect('/');
    }
});

router.post("/perfil/actualizarFoto", verificarAutenticacion, subirArchivo(), async (req, res) => {
    try {
        const userId = req.session.userId;
        
        if (!req.file) {
            return res.redirect('/perfil');
        }
        
        await opBD.actualizarFotoPerfil(userId, req.file.filename);
        
        res.redirect('/perfil');
    } catch (error) {
        console.error("Error al subir foto:", error);
        res.redirect('/perfil');
    }
});


// ===================================================
// RUTAS DE ADMINISTRACIÓN: GESTIÓN DE ROLES
// ===================================================

router.get("/admin/usuarios", verificarAutenticacion, verificarAdministrador, async (req, res) => {
    try {
        const todosUsuarios = await opBD.obtenerTodosUsuarios(); 
        res.render("adminUsuarios", { 
            titulo: "Gestión de Roles",
            usuariosBD: todosUsuarios,
            usuarioActualId: req.session.userId.toString() 
        });
    } catch (error) {
        console.error("Error al obtener usuarios para admin:", error);
        res.redirect('/');
    }
});

router.post("/admin/actualizar-rol", verificarAutenticacion, verificarAdministrador, async (req, res) => {
    const { id, rol } = req.body; 
    
    try {
        if (id === req.session.userId.toString()) {
            return res.redirect('/admin/usuarios'); 
        }

        await opBD.actualizarRolUsuario(id, rol);
        res.redirect('/admin/usuarios'); 
    } catch (error) {
        console.error("Error al actualizar rol:", error);
        res.redirect('/admin/usuarios');
    }
});


// ===================================================
// RUTAS PÚBLICAS Y MONTAJE CRUD
// ===================================================

// RUTA HOME (Contiene la lógica de Sincronización)
router.get("/", async (req, res) => {
    res.locals.role = req.session.role || null; 
    const isAdmin = req.session.role === 'administrador'; 

    // ✅ LÓGICA DE SINCRONIZACIÓN: Crea el registro de paciente solo si no existe
    if (req.session.userId && !isAdmin) {
        const pacienteExiste = await opBD.buscarPorID(req.session.userId, 'pacientes');
        
        if (!pacienteExiste) {
            const user = await Usuario.findById(req.session.userId); 

            if (user) {
                await opBD.crearPaciente({
                    _id: user._id, 
                    firstName: user.username, 
                    lastName: '(Sincronizado)', 
                });
            }
        }
    }
    
    res.render("home", { titulo: "Panel Principal", isAdmin: isAdmin });
});

router.get('/estado', (req, res) => res.send({estado: 'ok', proyecto: 'Clinica Dental Backend'}));


// RUTA REPORTE (Acceso exclusivo para administradores)
router.get("/reporte", verificarAutenticacion, verificarAdministrador, async (req, res) => {
    try {
        const citasBD = await opBD.obtenerCitas();
        const pacientesBD = await opBD.obtenerPacientes();
        res.render("reporte", { titulo: "Reporte General", citasBD: citasBD, pacientesBD: pacientesBD });
    } catch (error) {
        console.error("Error al generar el reporte:", error);
        res.redirect("/"); 
    }
});


// 🎯 APLICACIÓN DE PROTECCIÓN: Middlewares para rutas CRUD
router.use('/citas', verificarAutenticacion);


// MONTAJE DE RUTAS CRUD (Solo Citas permanece)
router.use('/', rutasC); 


export default router;