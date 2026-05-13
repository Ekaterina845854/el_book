const Router = require('express').Router
const router = new Router()
const adminController = require('../controllers/adminController')
const checkRole = require('../middleware/checkRole')
const upload = require('../utils/upload')

const bookFiles = upload.fields([
    {name: 'cover', maxCount: 1},
    {name: 'fb2', maxCount: 1},
    {name: 'docx', maxCount: 1},
    {name: 'pdf', maxCount: 1},
    {name: 'txt', maxCount: 1},
])

// П10: получить форму добавления книги
router.get('/book-form', checkRole('ADMIN'), adminController.showBookForm)

// П10: добавить новую книгу в общую библиотеку
router.post('/books', checkRole('ADMIN'), bookFiles, adminController.newBook)

// П10: обновить книгу
router.patch('/books/:id', checkRole('ADMIN'), bookFiles, adminController.updateBook)

// Мягкое удаление (status = 'deleted')
router.delete('/books/:id', checkRole('ADMIN'), adminController.deleteBook)

module.exports = router
