const path = require('path')
const fs = require('fs')
const {Book, UserLibrary} = require('../models/models')
const {ApiError} = require('../middleware/errorHandler')
const {CHARS_PER_PAGE} = require('../subsystems/bookViewer/bookViewerContracts')
const parseFb2 = require('../utils/fb2Parser')

// Кэш распарсенного текста для больших FB2-файлов (per-process, сбрасывается при рестарте)
const textCache = new Map()

class BookViewerService {
    // ── Получить текст книги: из БД или из файла на диске (для больших FB2) ──
    async _getBookText(book) {
        if (book.text) return book.text
        if (textCache.has(book.id)) return textCache.get(book.id)

        if (book.fb2Path) {
            const absPath = path.join(__dirname, '..', book.fb2Path)
            if (fs.existsSync(absPath)) {
                try {
                    const raw = fs.readFileSync(absPath, 'utf8')
                    const text = parseFb2(raw)
                    if (text && text.length > 0) {
                        textCache.set(book.id, text)
                        return text
                    }
                } catch (e) {
                    console.warn('[BookViewer] Ошибка чтения FB2 с диска:', e.message)
                }
            }
        }

        return null
    }

    async getBookFromLibrary(userId, bookId) {
        const entry = await UserLibrary.findOne({where: {userId, bookId}})
        return entry
    }

    async loadPageContent(bookId, page) {
        const book = await Book.findOne({
            where: {id: bookId},
            attributes: ['id', 'title', 'text', 'fb2Path', 'pages', 'status'],
        })

        if (!book) throw ApiError.notFound('Книга не найдена')
        if (book.status === 'deleted') {
            throw ApiError.forbidden('Книга удалена из общего каталога. Доступ к тексту ограничен')
        }

        const text = await this._getBookText(book)
        if (!text) {
            throw ApiError.notFound('Текст книги недоступен. Для онлайн-чтения необходим FB2-файл.')
        }

        const totalPages = Math.ceil(text.length / CHARS_PER_PAGE)
        const safePage = Math.max(1, Math.min(page, totalPages))
        const start = (safePage - 1) * CHARS_PER_PAGE
        const pageContent = text.substring(start, start + CHARS_PER_PAGE)

        return {
            bookId: book.id,
            title: book.title,
            pageContent,
            currentPage: safePage,
            totalPages,
        }
    }

    async openBook(userId, bookId, requestedPage = null) {
        const libraryEntry = await this.getBookFromLibrary(userId, bookId)
        if (!libraryEntry) {
            throw ApiError.forbidden('Книга не добавлена в вашу библиотеку')
        }

        let targetPage
        let isFirstOpen = false

        if (requestedPage !== null) {
            targetPage = parseInt(requestedPage)
        } else if (libraryEntry.lastPage) {
            targetPage = libraryEntry.lastPage
        } else {
            targetPage = 1
            isFirstOpen = true
        }

        const pageData = await this.loadPageContent(bookId, targetPage)

        if (libraryEntry.readStatus === 'not_started') {
            await libraryEntry.update({readStatus: 'in_progress'})
        }

        return {...pageData, isFirstOpen}
    }

    async saveLastPage(userId, bookId, page) {
        const entry = await UserLibrary.findOne({where: {userId, bookId}})
        if (!entry) throw ApiError.notFound('Запись библиотеки не найдена')

        await entry.update({lastPage: parseInt(page)})

        const book = await Book.findOne({
            where: {id: bookId},
            attributes: ['id', 'text', 'fb2Path'],
        })
        if (book) {
            const text = await this._getBookText(book)
            if (text) {
                const totalPages = Math.ceil(text.length / CHARS_PER_PAGE)
                if (parseInt(page) >= totalPages) {
                    await entry.update({readStatus: 'finished'})
                }
            }
        }

        return {saved: true, page}
    }

    async getBookFile(bookId, format) {
        const book = await Book.findOne({
            where: {id: bookId},
            attributes: ['id', 'title', 'text', 'fb2Path', 'docxPath', 'pdfPath', 'txtPath', 'status'],
        })

        if (!book) throw ApiError.notFound('Книга не найдена')
        if (book.status === 'deleted') throw ApiError.forbidden('Книга недоступна для скачивания')

        const formatMap = {
            fb2: {pathField: 'fb2Path', mime: 'application/xml', ext: '.fb2'},
            docx: {pathField: 'docxPath', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', ext: '.docx'},
            pdf: {pathField: 'pdfPath', mime: 'application/pdf', ext: '.pdf'},
            txt: {pathField: 'txtPath', mime: 'text/plain', ext: '.txt'},
        }

        if (format && formatMap[format]) {
            const {pathField, mime, ext} = formatMap[format]
            const filePath = book[pathField]
            if (filePath) {
                const absolutePath = path.join(__dirname, '..', filePath)
                if (fs.existsSync(absolutePath)) {
                    const stat = fs.statSync(absolutePath)
                    return {
                        type: 'file',
                        filePath: absolutePath,
                        fileName: `${book.title}${ext}`,
                        fileSize: stat.size,
                        mimeType: mime,
                    }
                }
            }
        }

        if (book.text) {
            const buffer = Buffer.from(book.text, 'utf8')
            return {
                type: 'buffer',
                buffer,
                fileName: `${book.title}.txt`,
                fileSize: buffer.length,
                mimeType: 'text/plain',
            }
        }

        throw ApiError.notFound('Файл недоступен для скачивания')
    }

    async checkFreeSpace(bookId, format) {
        const fileInfo = await this.getBookFile(bookId, format)
        return {
            fileSize: fileInfo.fileSize,
            fileSizeMB: +(fileInfo.fileSize / (1024 * 1024)).toFixed(2),
            message: `Книга: ${+(fileInfo.fileSize / (1024 * 1024)).toFixed(2)} МБ`,
        }
    }

    async downloadBook(userId, bookId, format) {
        const entry = await UserLibrary.findOne({where: {userId, bookId}})
        if (!entry) throw ApiError.forbidden('Добавьте книгу в свою библиотеку перед скачиванием')

        const fileInfo = await this.getBookFile(bookId, format)
        await entry.update({downloaded: true})
        return fileInfo
    }
}

module.exports = new BookViewerService()
