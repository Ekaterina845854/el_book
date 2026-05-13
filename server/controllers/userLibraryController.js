// П4 — UserLibraryController (добавить книгу в свою библиотеку)
// П5 — UserLibraryController (просмотреть свою библиотеку)

const userLibraryService = require('../services/userLibraryService')
const {ApiError} = require('../middleware/errorHandler')

class UserLibraryController {
    // ── П5: GET /api/library — showUserLibrary() ─────────────────────────────
    async showUserLibrary(req, res, next) {
        try {
            const userId = req.user.id
            const {sortBy, sortDir, language, yearFrom, yearTo, categoryId} = req.query
            const result = await userLibraryService.getUserLibrary(userId, {sortBy, sortDir, language, yearFrom, yearTo, categoryId})
            return res.json(result)
        } catch (e) {
            next(e instanceof ApiError ? e : ApiError.internal(e.message))
        }
    }

    // ── П4: POST /api/library/:bookId — addBookInUserLibrary() ───────────────
    // Успешный сценарий + Альт. 1 (дубликат) + Альт. 2 (недоступна) обработаны в сервисе
    async addBookInUserLibrary(req, res, next) {
        try {
            const userId = req.user.id
            const {bookId} = req.params

            if (!bookId) return next(ApiError.badRequest('Не указан ID книги'))

            // Альт. сценарий 3: пользователь отменяет добавление — обрабатывается на фронтенде
            const result = await userLibraryService.addBook(userId, bookId)
            return res.status(201).json({
                message: 'Книга добавлена в библиотеку',
                entry: result.entry,
            })
        } catch (e) {
            next(e instanceof ApiError ? e : ApiError.internal(e.message))
        }
    }

    // ── DELETE /api/library/:bookId — removeBook() ────────────────────────────
    async removeBook(req, res, next) {
        try {
            const userId = req.user.id
            const {bookId} = req.params
            const result = await userLibraryService.removeBook(userId, bookId)
            return res.json(result)
        } catch (e) {
            next(e instanceof ApiError ? e : ApiError.internal(e.message))
        }
    }

    // ── П5: GET /api/library/:bookId/actions — getBookActions() ──────────────
    async chooseAction(req, res, next) {
        try {
            const userId = req.user.id
            const {bookId} = req.params
            const entry = await userLibraryService.getLibraryEntry(userId, bookId)
            if (!entry) return next(ApiError.notFound('Книга не найдена в вашей библиотеке'))
            const actions = userLibraryService.getBookActions({accessRestricted: false})
            return res.json({actions, bookId, readStatus: entry.readStatus, lastPage: entry.lastPage})
        } catch (e) {
            next(e instanceof ApiError ? e : ApiError.internal(e.message))
        }
    }
}

module.exports = new UserLibraryController()
