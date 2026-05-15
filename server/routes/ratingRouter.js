const Router = require('express').Router
const router = new Router()
const ratingController = require('../controllers/ratingController')
const authMiddleware = require('../middleware/authMiddleware')

// П8: оценить книгу (добавить впечатление)
router.post('/:bookId', authMiddleware, ratingController.addReview)

// П8: просмотреть оценки книги
router.get('/:bookId', authMiddleware, ratingController.getBookRatings)

// П8: обновить своё впечатление
router.patch('/:bookId', authMiddleware, ratingController.updateReview)

// удалить своё впечатление
router.delete('/:bookId', authMiddleware, ratingController.deleteReview)

module.exports = router
