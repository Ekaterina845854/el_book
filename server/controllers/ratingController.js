// П8 — RatingController (оценить книгу)

const ratingService = require('../services/ratingService')
const {ApiError} = require('../middleware/errorHandler')

class RatingController {
    // ── П8: POST /api/rating/:bookId — addReview() ───────────────────────────
    // ratingBook() из ТЗ: score (1–5) + comment + title
    // Реализует все альт. сценарии 1–6
    async addReview(req, res, next) {
        try {
            const userId = req.user.id
            const {bookId} = req.params
            const {title, score, comment} = req.body

            if (!score) return next(ApiError.badRequest('Оценка обязательна'))

            const result = await ratingService.createReview(userId, bookId, {title, score, comment})
            return res.status(201).json(result)
        } catch (e) {
            next(e instanceof ApiError ? e : ApiError.internal(e.message))
        }
    }

    // ── П8: GET /api/rating/:bookId — getBookRatings() ───────────────────────
    async getBookRatings(req, res, next) {
        try {
            const {bookId} = req.params
            const result = await ratingService.getBookRatings(bookId)
            return res.json(result)
        } catch (e) {
            next(e instanceof ApiError ? e : ApiError.internal(e.message))
        }
    }

    // ── DELETE /api/rating/:bookId — удалить своё впечатление ───────────────
    async deleteReview(req, res, next) {
        try {
            const userId = req.user.id
            const {bookId} = req.params
            const result = await ratingService.deleteReview(userId, bookId)
            return res.json(result)
        } catch (e) {
            next(e instanceof ApiError ? e : ApiError.internal(e.message))
        }
    }

    // ── П8: PATCH /api/rating/:bookId — обновить впечатление ─────────────────
    async updateReview(req, res, next) {
        try {
            const userId = req.user.id
            const {bookId} = req.params
            const {title, score, comment} = req.body
            const result = await ratingService.updateReview(userId, bookId, {title, score, comment})
            return res.json(result)
        } catch (e) {
            next(e instanceof ApiError ? e : ApiError.internal(e.message))
        }
    }
}

module.exports = new RatingController()
