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

// Список всех книг для администратора
router.get('/books', checkRole('ADMIN'), adminController.getBooks)

// П10: добавить новую книгу в общую библиотеку
router.post('/books', checkRole('ADMIN'), bookFiles, adminController.newBook)

// П10: обновить книгу
router.patch('/books/:id', checkRole('ADMIN'), bookFiles, adminController.updateBook)

// Восстановление удалённой книги
router.patch('/books/:id/restore', checkRole('ADMIN'), adminController.restoreBook)

// Мягкое удаление (status = 'deleted')
router.delete('/books/:id', checkRole('ADMIN'), adminController.deleteBook)

module.exports = router
