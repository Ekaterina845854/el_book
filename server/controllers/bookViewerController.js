// П6 — BookViewerController (открыть книгу для просмотра)
// П7 — BookViewerController (скачать книгу)
// Делегирует в bookViewerService — изолированную подсистему

const bookViewerService = require('../services/bookViewerService')
const {ApiError} = require('../middleware/errorHandler')

class BookViewerController {
    // ── П6: GET /api/viewer/:bookId — openBookText() ─────────────────────────
    // Открывает книгу на последней странице (или 1-й при первом открытии)
    async openBookText(req, res, next) {
        try {
            const userId = req.user.id
            const {bookId} = req.params
            const {page} = req.query   // Альт. сценарий 3: ручная навигация

            const result = await bookViewerService.openBook(
                userId,
                bookId,
                page !== undefined ? parseInt(page) : null
            )
            return res.json(result)
        } catch (e) {
            next(e instanceof ApiError ? e : ApiError.internal(e.message))
        }
    }

    // ── П6: POST /api/viewer/:bookId/progress — saveTextBook() ───────────────
    // Сохранение прогресса чтения (номер последней страницы)
    async saveTextBook(req, res, next) {
        try {
            const userId = req.user.id
            const {bookId} = req.params
            const {page} = req.body

            if (!page || isNaN(parseInt(page))) {
                return next(ApiError.badRequest('Укажите корректный номер страницы'))
            }

            const result = await bookViewerService.saveLastPage(userId, bookId, page)
            return res.json(result)
        } catch (e) {
            next(e instanceof ApiError ? e : ApiError.internal(e.message))
        }
    }

    // ── П7: GET /api/viewer/:bookId/download — downloadBook() ────────────────
    // Успешный сценарий + Альт. 1 (место) + Альт. 2 (соединение) + Альт. 3 (отмена)
    async downloadBook(req, res, next) {
        try {
            const userId = req.user.id
            const {bookId} = req.params
            const {format, confirm} = req.query

            // Альт. сценарий 3: пользователь отменяет скачивание
            if (confirm === 'false' || confirm === 'cancel') {
                return res.json({cancelled: true, message: 'Скачивание отменено'})
            }

            // Шаг 1: получить метаданные файла (размер для checkFreeSpace)
            if (confirm === undefined) {
                const spaceInfo = await bookViewerService.checkFreeSpace(bookId, format)
                return res.json({
                    ...spaceInfo,
                    message: `Книга: ${spaceInfo.fileSizeMB} МБ. Начать скачивание?`,
                    requiresConfirmation: true,
                })
            }

            // Шаг 2: confirm=true → начать скачивание
            const fileInfo = await bookViewerService.downloadBook(userId, bookId, format)

            if (fileInfo.type === 'file') {
                return res.download(fileInfo.filePath, fileInfo.fileName, err => {
                    // Альт. сценарий 2: ошибка соединения во время загрузки
                    if (err && !res.headersSent) {
                        next(ApiError.internal('Ошибка соединения при скачивании. Проверьте интернет и повторите попытку.'))
                    }
                })
            }

            if (fileInfo.type === 'buffer') {
                const filename = encodeURIComponent(fileInfo.fileName)
                res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${filename}`)
                res.setHeader('Content-Type', `${fileInfo.mimeType}; charset=utf-8`)
                res.setHeader('Content-Length', fileInfo.fileSize)
                return res.send(fileInfo.buffer)
            }

            return next(ApiError.notFound('Файл недоступен'))
        } catch (e) {
            next(e instanceof ApiError ? e : ApiError.internal(e.message))
        }
    }
}

module.exports = new BookViewerController()
