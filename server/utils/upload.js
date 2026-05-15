const multer = require('multer')
const path = require('path')
const fs = require('fs')

const UPLOAD_DIR = 'uploads'
;['covers', 'fb2', 'docx', 'pdf', 'txt'].forEach(dir => {
    fs.mkdirSync(path.join(process.cwd(), UPLOAD_DIR, dir), { recursive: true })
})

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const map = {cover: 'covers', fb2: 'fb2', docx: 'docx', pdf: 'pdf', txt: 'txt'}
        const subdir = map[file.fieldname] || 'misc'
        cb(null, `${UPLOAD_DIR}/${subdir}`)
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase()
        cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`)
    },
})

const ALLOWED_EXT = {
    cover: ['.jpg', '.jpeg', '.png', '.webp', '.gif'],
    fb2: ['.fb2'],
    docx: ['.docx'],
    pdf: ['.pdf'],
    txt: ['.txt'],
}

const fileFilter = (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    const allowed = ALLOWED_EXT[file.fieldname]
    cb(null, !!(allowed && allowed.includes(ext)))
}

const upload = multer({storage, fileFilter, limits: {fileSize: 100 * 1024 * 1024}})

module.exports = upload
