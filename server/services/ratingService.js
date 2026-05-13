// П8 — RatingService (служебный класс из диаграммы последовательностей)
// createReview(), validateContent(), checkUserReadBook(), checkDuplicate(), updateAverageRating()

const {Rating, Book, UserLibrary} = require('../models/models')
const {ApiError} = require('../middleware/errorHandler')
const {validateContent} = require('../utils/contentFilter')

class RatingService {
    // ── П8: checkUserReadBook(userId, bookId) ─────────────────────────────────
    // SELECT read_status FROM user_library WHERE user_id = ? AND book_id = ?
    async checkUserReadBook(userId, bookId) {
        const entry = await UserLibrary.findOne({where: {userId, bookId}})
        // Альт. сценарий 1: книга не прочитана пользователем
        if (!entry || entry.readStatus !== 'finished') {
            return {hasRead: false, message: 'Сначала дочитайте книгу'}
        }
        return {hasRead: true}
    }

    // ── П8: checkDuplicate — SELECT * FROM reviews WHERE user_id = ? AND book_id = ? ─
    async checkDuplicate(userId, bookId) {
        const existing = await Rating.findOne({where: {userId, bookId}})
        // Альт. сценарий 3: дублирование впечатления или повторная оценка
        return !!existing
    }

    // ── П8: updateAverageRating(bookId) — SELECT AVG(score) + UPDATE books ───
    async updateAverageRating(bookId) {
        const allRatings = await Rating.findAll({where: {bookId}})
        const avg = allRatings.reduce((sum, r) => sum + r.score, 0) / allRatings.length
        const newRating = Math.round(avg * 10) / 10
        await Book.update({rating: newRating}, {where: {id: bookId}})
        return newRating
    }

    // ── П8 Успешный сценарий: createReview(userId, bookId, score, comment) ───
    async createReview(userId, bookId, {title, score, comment}) {
        // Предусловие: книга должна быть доступна в общей библиотеке
        const book = await Book.findOne({where: {id: bookId}})
        if (!book) throw ApiError.notFound('Книга не найдена')
        if (book.status === 'deleted') {
            throw ApiError.badRequest('Книга недоступна в общей библиотеке')
        }

        // Альт. сценарий 1: книга не прочитана
        const readCheck = await this.checkUserReadBook(userId, bookId)
        if (!readCheck.hasRead) {
            throw ApiError.badRequest(readCheck.message)
        }

        // Альт. сценарий 3: дубликат
        const isDuplicate = await this.checkDuplicate(userId, bookId)
        if (isDuplicate) {
            throw ApiError.badRequest('Вы уже оставили впечатление об этой книге. Отредактируйте существующее.')
        }

        // Валидация score (1–5)
        const scoreNum = parseInt(score)
        if (!scoreNum || scoreNum < 1 || scoreNum > 5) {
            throw ApiError.badRequest('Оценка должна быть от 1 до 5 звёзд')
        }

        // Альт. сценарии 2/4/5: validateContent(comment)
        if (comment) {
            const contentCheck = validateContent(comment)
            if (!contentCheck.valid) {
                const codeMessages = {
                    COMMENT_TOO_LONG: contentCheck.reason,
                    FORBIDDEN_LINKS: 'Впечатление содержит запрещённые ссылки. Исправьте текст.',
                    PROFANITY: 'Впечатление содержит недопустимую лексику. Исправьте текст.',
                    SPAM: 'Впечатление содержит спам. Исправьте текст.',
                }
                throw ApiError.badRequest(codeMessages[contentCheck.code] || contentCheck.reason)
            }
        }

        // Успешный сценарий: INSERT INTO reviews
        // Альт. сценарий 5: пустой текст — сохраняем только оценку (score only)
        const rating = await Rating.create({
            userId,
            bookId,
            title: title || null,
            score: scoreNum,
            comment: comment && comment.trim() ? comment.trim() : null,
        })

        // Обновляем средний рейтинг книги
        const newRating = await this.updateAverageRating(bookId)

        return {
            rating,
            newBookRating: newRating,
            message: 'Впечатление успешно опубликовано',
        }
    }

    // ── Получение всех оценок книги ───────────────────────────────────────────
    async getBookRatings(bookId) {
        const book = await Book.findOne({where: {id: bookId}})
        if (!book) throw ApiError.notFound('Книга не найдена')

        const ratings = await Rating.findAll({
            where: {bookId},
            order: [['createdAt', 'DESC']],
        })
        return {ratings, bookRating: book.rating}
    }

    // ── Обновление существующего впечатления ─────────────────────────────────
    async updateReview(userId, bookId, {title, score, comment}) {
        const existing = await Rating.findOne({where: {userId, bookId}})
        if (!existing) throw ApiError.notFound('Впечатление не найдено')

        if (score) {
            const scoreNum = parseInt(score)
            if (scoreNum < 1 || scoreNum > 5) throw ApiError.badRequest('Оценка должна быть от 1 до 5')
            existing.score = scoreNum
        }
        if (comment !== undefined) {
            const contentCheck = validateContent(comment)
            if (!contentCheck.valid) throw ApiError.badRequest(contentCheck.reason)
            existing.comment = comment && comment.trim() ? comment.trim() : null
        }
        if (title !== undefined) existing.title = title || null

        await existing.save()
        const newRating = await this.updateAverageRating(bookId)
        return {rating: existing, newBookRating: newRating}
    }
}

module.exports = new RatingService()
