// П10 — AdminController (пополнить общую библиотеку)

const adminService = require('../services/adminService')
const {ApiError} = require('../middleware/errorHandler')

class AdminController {
    // ── П10: GET /api/admin/book-form — showBookForm() ───────────────────────
    // Возвращает структуру формы добавления книги
    async showBookForm(req, res, next) {
        try {
            const form = adminService.showBookForm()
            return res.json(form)
        } catch (e) {
            next(ApiError.internal(e.message))
        }
    }

    // ── П10 Успешный сценарий: POST /api/admin/books — newBook() ─────────────
    // addNewBook(title, author, year, category, ISBN, pages, language, annotation, cover, text)
    async newBook(req, res, next) {
        try {
            const adminId = req.user.id

            // submitBookForm(formData) → processBookData(formData)
            const result = await adminService.processBookData(adminId, req.body, req.files)

            return res.status(201).json({
                message: result.message,
                book: result.book,
                bookId: result.bookId,
            })
        } catch (e) {
            next(e instanceof ApiError ? e : ApiError.internal(e.message))
        }
    }

    // ── П10: PATCH /api/admin/books/:id — обновление книги ───────────────────
    async updateBook(req, res, next) {
        try {
            const adminId = req.user.id
            const {id} = req.params
            const result = await adminService.updateBook(adminId, id, req.body, req.files)
            return res.json(result)
        } catch (e) {
            next(e instanceof ApiError ? e : ApiError.internal(e.message))
        }
    }

    // ── DELETE /api/admin/books/:id — мягкое удаление (status = 'deleted') ───
    // П5 Альт. сц. 2: книга недоступна в общей библиотеке
    async deleteBook(req, res, next) {
        try {
            const adminId = req.user.id
            const {id} = req.params
            const result = await adminService.deleteBook(adminId, id)
            return res.json(result)
        } catch (e) {
            next(e instanceof ApiError ? e : ApiError.internal(e.message))
        }
    }
}

module.exports = new AdminController()
