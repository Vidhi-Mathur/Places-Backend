const multer = require('multer')
const { v4: uuidv4 } = require('uuid');

const MIME_TYPE = {
    //Maping certain looking mimetypes to these extentions
    'image/png': 'png',
    'image/jpg': 'jpg',
    'image/jpeg': 'jpeg'
}

//Group of middlewares
const fileUpload = multer({
    limits: 50000,
    storage: multer.diskStorage({
        //Function determining destination of uploaded files and their names
        destination: (req, file, cb) => {
            cb(null, 'uploads/images')
        },
        filename: (req, file, cb) => {
            //Extracting ext.
            const extension = MIME_TYPE[file.mimetype]
            //First argument being error/ null and setting file name
            cb(null, uuidv4() + '.' + extension)
        }
    }),
    filefilter: (req, file, cb) => {
/* !MIME_TYPE[file.mimetype] is a logical NOT operation. It will return true if MIME_TYPE[file.mimetype] is false (e.g., undefined) and false if it's truthy. !!MIME_TYPE[file.mimetype] is a double logical NOT operation. It effectively converts the result of MIME_TYPE[file.mimetype] into a boolean value. If MIME_TYPE[file.mimetype] exists, it will become true, otherwise false. */
        let isValid = !!MIME_TYPE[file.mimetype]
        let error = isValid? null: new Error('Invalid file')
        cb(error, isValid)
    }
})


module.exports = fileUpload