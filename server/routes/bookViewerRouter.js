const Router = require('express').Router
const router = new Router()
const bookViewerController = require('../controllers/bookViewerController')
const authMiddleware = require('../middleware/authMiddleware')
const checkSubscription = require('../middleware/checkSubscription')

// П6: открыть книгу для просмотра (требует подписки)
router.get('/:bookId', authMiddleware, checkSubscription, bookViewerController.openBookText)

// П6: сохранить прогресс чтения (последняя страница)
router.post('/:bookId/progress', authMiddleware, bookViewerController.saveTextBook)

// П7: скачать книгу (требует подписки)
// ?confirm=undefined → предзапрос (размер файла)
// ?confirm=true      → начать скачивание
// ?confirm=false     → отмена (Альт. сц. 3)
router.get('/:bookId/download', authMiddleware, checkSubscription, bookViewerController.saveBookText)

module.exports = router
