const Router = require('express').Router
const router = new Router()
const userLibraryController = require('../controllers/userLibraryController')
const authMiddleware = require('../middleware/authMiddleware')

// П5: просмотреть свою библиотеку
router.get('/', authMiddleware, userLibraryController.showUserLibrary)

// П4: добавить книгу в свою библиотеку
router.post('/:bookId', authMiddleware, userLibraryController.addBookInUserLibrary)

// П5: доступные действия с книгой (читать/скачать/оценить)
router.get('/:bookId/actions', authMiddleware, userLibraryController.chooseAction)

// Удалить книгу из библиотеки
router.delete('/:bookId', authMiddleware, userLibraryController.removeBook)

module.exports = router
