import multer from "multer"

export function subirArchivo() {
    const storage = multer.diskStorage({
        destination: "./web/images", 
        filename: function(req, file, cb) {
            const extension = file.originalname.split('.').pop();
            const nombreArchivo = Date.now() + '_' + req.session.userId + '.' + extension;
            cb(null, nombreArchivo);
        }
    })
    const upload = multer({ storage }).single("fotoPerfil");
    return upload;
}