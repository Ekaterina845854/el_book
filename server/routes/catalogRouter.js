const Router = require('express').Router
const router = new Router()
const catalogController = require('../controllers/catalogController')
const authMiddleware = require('../middleware/authMiddleware')
const checkRole = require('../middleware/checkRole')

// П2: просмотр каталога — авторизованные пользователи
router.get('/categories', authMiddleware, catalogController.showCategories)
router.get('/categories/:categoryId/books', authMiddleware, catalogController.getBooksByCategory)
router.get('/books', authMiddleware, catalogController.getAllBooks)
router.get('/books/:bookId', authMiddleware, catalogController.getInfoAboutBook)

// П3: поиск книги в поисковой строке
router.get('/search', authMiddleware, catalogController.findBook)

// П10 (Admin): управление категориями
router.post('/categories', checkRole('ADMIN'), catalogController.createCategory)

module.exports = router
