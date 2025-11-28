import 'dotenv/config'; 
import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import session from 'express-session';

import conectarBD from './bd/bd.js'; 
import rutas from "./routes/rutas.js"; 

conectarBD(); 

const app = express();

// Middlewares y Configuración EJS
app.set("view engine", "ejs"); 
app.use(express.urlencoded({extended:true}));
app.use(express.json()); 
app.use(cors());         
app.use(morgan('dev'));  

// Middleware para servir archivos estáticos (las imágenes de perfil)
app.use(express.static('web')); // ⬅️ ¡ACCESO ESTÁTICO A LA CARPETA 'web'!

// CONFIGURACIÓN DE SESIONES
app.use(session({
  secret: process.env.SECRET_SESSION, 
  name: process.env.NOMBRE_COOKIE,   
  resave: false,
  saveUninitialized: true, 
  cookie:{
    secure: false, 
    path: "/"
  }
}));

// Router Principal
app.use("/", rutas); 

const PORT = process.env.PORT || 3000;

app.listen(PORT, function(){
  console.log(`Servidor corriendo en el puerto: ${PORT}`);
  console.log(`🔗 http://localhost:${PORT}`); 
});