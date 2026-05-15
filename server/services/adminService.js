// П10 — AdminService (служебный класс из диаграммы последовательностей)
// validateAdminRights(), showBookForm(), processBookData(), validateISBN(),
// validateRequiredFields(), uploadCover(), uploadBookText(), indexNewBook()

const path = require('path')
const fs = require('fs')
const {Book, Category, User} = require('../models/models')
const {ApiError} = require('../middleware/errorHandler')
const { parseFb2 } = require('../utils/fb2Parser')

// Допустимые форматы обложки — П10 Альт. сценарий 2
const ALLOWED_COVER_FORMATS = ['.jpg', '.jpeg', '.png', '.webp']
const MAX_COVER_SIZE_MB = 10
const ALLOWED_LANGUAGES = ['ru', 'en', 'de', 'fr', 'es', 'it', 'zh', 'ja']

class AdminService {
    // ── П10: validateAdminRights(adminId) ─────────────────────────────────────
    // SELECT role FROM users WHERE id = ?
    async validateAdminRights(userId) {
        const user = await User.findOne({where: {id: userId}, attributes: ['id', 'role']})
        if (!user || user.role !== 'ADMIN') {
            throw ApiError.forbidden('Доступ запрещён: требуются права администратора')
        }
        return {accessGranted: true}
    }

    // ── П10: showBookForm() — структура формы для фронтенда ──────────────────
    showBookForm() {
        return {
            fields: [
                {name: 'title', label: 'Название', required: true, type: 'string'},
                {name: 'author', label: 'Автор(ы)', required: true, type: 'string'},
                {name: 'year', label: 'Год издания', required: false, type: 'integer'},
                {name: 'categoryId', label: 'Жанр/Категория', required: false, type: 'integer'},
                {name: 'ISBN', label: 'ISBN', required: false, type: 'string'},
                {name: 'pages', label: 'Количество страниц', required: false, type: 'integer'},
                {name: 'language', label: 'Язык', required: false, type: 'string', options: ALLOWED_LANGUAGES},
                {name: 'annotation', label: 'Аннотация', required: false, type: 'text'},
                {name: 'cover', label: 'Обложка (JPG/PNG)', required: false, type: 'file'},
                {name: 'text', label: 'Текст произведения (TXT/FB2)', required: false, type: 'file'},
            ],
        }
    }

    // ── П10: validateISBN(isbn) ───────────────────────────────────────────────
    validateISBN(isbn) {
        if (!isbn) return {valid: true} // необязательное поле
        const cleaned = isbn.replace(/[-\s]/g, '')
        if (!/^\d{10}$/.test(cleaned) && !/^\d{13}$/.test(cleaned)) {
            return {valid: false, reason: `Неверный формат ISBN: ${isbn}`}
        }
        return {valid: true}
    }

    // ── П10: validateRequiredFields(formData) — Альт. сценарий 1 ─────────────
    validateRequiredFields(formData) {
        const errors = []
        if (!formData.title || !formData.title.trim()) errors.push('Название обязательно')
        if (!formData.author || !formData.author.trim()) errors.push('Автор обязателен')
        if (errors.length) {
            return {valid: false, errors}
        }
        return {valid: true}
    }

    // ── П10: uploadCover(coverFile) — saveFile(coverFile, 'covers/') ─────────
    uploadCover(file) {
        if (!file) return null
        const ext = path.extname(file.originalname).toLowerCase()

        // Альт. сценарий 2: неверный формат обложки
        if (!ALLOWED_COVER_FORMATS.includes(ext)) {
            throw ApiError.badRequest(
                `Неверный формат обложки. Допустимые: ${ALLOWED_COVER_FORMATS.join(', ')}`
            )
        }

        // Альт. сценарий 2: файл слишком большой
        if (file.size > MAX_COVER_SIZE_MB * 1024 * 1024) {
            throw ApiError.badRequest(`Максимальный размер обложки: ${MAX_COVER_SIZE_MB} МБ`)
        }

        return `/uploads/covers/${file.filename}`
    }

    // ── П10: uploadBookText(textFile) — saveFile(textFile, 'books/') ─────────
    // Для FB2/TXT > MAX_INLINE_TEXT_SIZE текст НЕ сохраняется в БД:
    // подсистема просмотра читает из файла напрямую (поддержка больших книг)
    uploadBookText(files) {
        const MAX_INLINE_TEXT_SIZE = 10 * 1024 * 1024 // 10 МБ

        let text = null
        let detectedPages = null
        let fb2Path = null, txtPath = null, docxPath = null, pdfPath = null

        if (files?.txt?.[0]) {
            txtPath = `uploads/txt/${files.txt[0].filename}`
            if (files.txt[0].size <= MAX_INLINE_TEXT_SIZE) {
                try {
                    text = fs.readFileSync(files.txt[0].path, 'utf8')
                } catch (e) {
                    console.warn('[AdminService] Ошибка чтения TXT:', e.message)
                }
            }
        }
        if (files?.fb2?.[0]) {
            fb2Path = `uploads/fb2/${files.fb2[0].filename}`
            if (files.fb2[0].size <= MAX_INLINE_TEXT_SIZE) {
                try {
                    const raw = fs.readFileSync(files.fb2[0].path, 'utf8')
                    const result = parseFb2(raw)
                    // Страницы сохраняются как JSON-массив HTML-блоков
                    text = JSON.stringify(result.pages)
                    detectedPages = result.pages.length
                } catch (e) {
                    console.warn('[AdminService] Ошибка парсинга FB2:', e.message)
                }
            }
            // Для больших файлов: text = null, просмотрщик читает из файла напрямую
        }
        if (files?.docx?.[0]) docxPath = `uploads/docx/${files.docx[0].filename}`
        if (files?.pdf?.[0]) pdfPath = `uploads/pdf/${files.pdf[0].filename}`

        return {text, detectedPages, fb2Path, txtPath, docxPath, pdfPath}
    }

    // ── П10: indexNewBook(bookId, title, author, category) ───────────────────
    // Мок индексации (в production: ElasticSearch / MeiliSearch)
    async indexNewBook(bookId, {title, author, categoryId}) {
        console.log(`[AdminService] Индексирование книги #${bookId}: "${title}" — ${author}`)
        // В реальном проекте: await searchClient.index('books').addDocuments([...])
        return {indexed: true, bookId}
    }

    // ── П10 Успешный сценарий: processBookData(formData) ─────────────────────
    async processBookData(adminId, formData, files) {
        // Шаг 1: проверка прав администратора (уже выполнена в middleware, дублируем для надёжности)
        await this.validateAdminRights(adminId)

        // Шаг 2: validateRequiredFields — Альт. сценарий 1
        const fieldsCheck = this.validateRequiredFields(formData)
        if (!fieldsCheck.valid) {
            throw ApiError.badRequest(`Некорректные данные: ${fieldsCheck.errors.join('; ')}`)
        }

        // Шаг 3: validateISBN — Альт. сценарий 1
        const isbnCheck = this.validateISBN(formData.ISBN)
        if (!isbnCheck.valid) {
            throw ApiError.badRequest(isbnCheck.reason)
        }

        // Шаг 4: uploadCover — Альт. сценарий 2
        let coverUrl = null
        if (files?.cover?.[0]) {
            coverUrl = this.uploadCover(files.cover[0])
        }

        // Шаг 5: uploadBookText — Альт. сценарий 2
        const textData = this.uploadBookText(files)

        const bookData = {
            title: formData.title.trim(),
            author: formData.author.trim(),
            year: formData.year ? parseInt(formData.year) : null,
            categoryId: formData.categoryId ? parseInt(formData.categoryId) : null,
            ISBN: formData.ISBN || null,
            pages: formData.pages ? parseInt(formData.pages) : (textData.detectedPages || null),
            language: ALLOWED_LANGUAGES.includes(formData.language) ? formData.language : 'ru',
            annotation: formData.annotation || null,
            coverUrl,
            text: textData.text,
            fb2Path: textData.fb2Path,
            txtPath: textData.txtPath,
            docxPath: textData.docxPath,
            pdfPath: textData.pdfPath,
            status: 'active',
        }

        // Шаг 6: INSERT INTO books — Альт. сценарий 3 (книга не сохраняется)
        let book
        try {
            book = await Book.create(bookData)
        } catch (e) {
            if (e.name === 'SequelizeUniqueConstraintError') {
                throw ApiError.badRequest('Книга с таким названием уже существует')
            }
            // Rollback: удаляем загруженные файлы при ошибке сохранения
            this._rollbackFiles(files)
            throw ApiError.internal('Не удалось сохранить книгу. Обратитесь в техподдержку.')
        }

        // Шаг 7: indexNewBook — Альт. сценарий 4 (сбой индексации)
        try {
            await this.indexNewBook(book.id, {
                title: book.title,
                author: book.author,
                categoryId: book.categoryId,
            })
        } catch (e) {
            // Сбой индексации не откатывает сохранение — книга добавлена, но поиск временно недоступен
            console.error('[AdminService] Сбой индексации:', e.message)
        }

        return {
            book,
            message: 'Книга успешно добавлена',
            bookId: book.id,
        }
    }

    // ── Откат загруженных файлов при ошибке ─────────────────────────────────
    _rollbackFiles(files) {
        if (!files) return
        Object.values(files).flat().forEach(f => {
            try { fs.unlinkSync(f.path) } catch (_) {}
        })
    }

    // ── Обновление книги (для PATCH) ─────────────────────────────────────────
    async updateBook(adminId, bookId, formData, files) {
        await this.validateAdminRights(adminId)

        const book = await Book.findOne({where: {id: bookId}})
        if (!book) throw ApiError.notFound('Книга не найдена')

        const updates = {}

        if (formData.title !== undefined) updates.title = formData.title.trim()
        if (formData.author !== undefined) updates.author = formData.author.trim()
        if (formData.year !== undefined) updates.year = formData.year ? parseInt(formData.year) : null
        if (formData.categoryId !== undefined) updates.categoryId = formData.categoryId || null
        if (formData.ISBN !== undefined) {
            const isbnCheck = this.validateISBN(formData.ISBN)
            if (!isbnCheck.valid) throw ApiError.badRequest(isbnCheck.reason)
            updates.ISBN = formData.ISBN || null
        }
        if (formData.pages !== undefined) updates.pages = formData.pages ? parseInt(formData.pages) : null
        if (formData.language !== undefined) updates.language = ALLOWED_LANGUAGES.includes(formData.language) ? formData.language : book.language
        if (formData.annotation !== undefined) updates.annotation = formData.annotation || null

        if (files?.cover?.[0]) {
            if (book.coverUrl?.startsWith('/uploads/')) {
                try { fs.unlinkSync(path.join(__dirname, '..', book.coverUrl.slice(1))) } catch (_) {}
            }
            updates.coverUrl = this.uploadCover(files.cover[0])
        }

        const textData = this.uploadBookText(files)
        if (textData.text) updates.text = textData.text
        if (textData.fb2Path) updates.fb2Path = textData.fb2Path
        if (textData.txtPath) updates.txtPath = textData.txtPath
        if (textData.docxPath) updates.docxPath = textData.docxPath
        if (textData.pdfPath) updates.pdfPath = textData.pdfPath
        // Автозаполнение страниц из FB2, если не указано вручную
        if (textData.detectedPages && !formData.pages) updates.pages = textData.detectedPages

        await book.update(updates)
        return {book, message: 'Книга обновлена'}
    }

    // ── Мягкое удаление книги (П5 Альт. сц. 2 — книга недоступна) ──────────
    async deleteBook(adminId, bookId) {
        await this.validateAdminRights(adminId)
        const book = await Book.findOne({where: {id: bookId}})
        if (!book) throw ApiError.notFound('Книга не найдена')
        await book.update({status: 'deleted'})
        return {message: 'Книга удалена из общей библиотеки', bookId}
    }

    // ── Восстановление удалённой книги ───────────────────────────────────────
    async restoreBook(adminId, bookId) {
        await this.validateAdminRights(adminId)
        const book = await Book.findOne({where: {id: bookId}})
        if (!book) throw ApiError.notFound('Книга не найдена')
        await book.update({status: 'active'})
        return {message: 'Книга восстановлена в каталоге', bookId}
    }

    // ── Список всех книг для администратора (включая удалённые) ─────────────
    async getAdminBooks({page = 1, limit = 20, search = ''}) {
        const {Op} = require('sequelize')
        const where = {}
        if (search && search.trim()) {
            where[Op.or] = [
                {title: {[Op.iLike]: `%${search.trim()}%`}},
                {author: {[Op.iLike]: `%${search.trim()}%`}},
            ]
        }
        const offset = (parseInt(page) - 1) * parseInt(limit)
        const {count, rows} = await Book.findAndCountAll({
            where,
            include: [{model: Category, attributes: ['id', 'name']}],
            order: [['createdAt', 'DESC']],
            limit: parseInt(limit),
            offset,
        })
        return {books: rows, count, page: parseInt(page), totalPages: Math.ceil(count / parseInt(limit))}
    }
}

module.exports = new AdminService()
