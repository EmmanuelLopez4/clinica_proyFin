import mongoose from "mongoose"

const usuarioSchema = new mongoose.Schema({
	username: {
		type: String,
		required: true,
		unique: true,
		trim: true,
	},
	password: {
		type: String, 
		required: true,
	},
	role: {
		type: String,
		enum: ['normal', 'administrador'],
		default: 'normal',
	},
    fotoPerfil: { 
        type: String,
        default: 'perfil_default.png' 
    }
})

export default mongoose.model("Usuario", usuarioSchema)