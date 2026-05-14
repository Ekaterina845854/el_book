// П2 — CatalogController (просмотр каталога книг)
// П3 — CatalogController (поиск книги в поисковой строке)

const catalogService = require('../services/catalogService')
const { ApiError } = require('../middleware/errorHandler')

class CatalogController {
    constructor() {
        // Привязываем методы к экземпляру
        this.showCategories = this.showCategories.bind(this)
        this.getBooksByCategory = this.getBooksByCategory.bind(this)
        this.getAllBooks = this.getAllBooks.bind(this)
        this.getInfoAboutBook = this.getInfoAboutBook.bind(this)  // ← важно: такое имя ждёт роутер
        this.findBook = this.findBook.bind(this)                   // ← важно: такое имя ждёт роутер
        this.createCategory = this.createCategory.bind(this)       // ← для админки
    }

    async showCategories(req, res, next) {
        try {
            const result = await catalogService.getAllCategories()
            return res.json(result)
        } catch (e) {
            next(e instanceof ApiError ? e : ApiError.internal(e.message))
        }
    }

    async getBooksByCategory(req, res, next) {
        try {
            const { categoryId } = req.params
            const { limit, page, sortBy, sortDir, language, yearFrom, yearTo } = req.query
            const result = await catalogService.getBooksByCategory(categoryId, {
                limit,
                page,
                sortBy,
                sortDir,
                language,
                yearFrom,
                yearTo,
            })
            return res.json(result)
        } catch (e) {
            next(e instanceof ApiError ? e : ApiError.internal(e.message))
        }
    }

    async getAllBooks(req, res, next) {
        try {
            const { limit, page, categoryId, sortBy, sortDir, language, yearFrom, yearTo } = req.query
            const result = await catalogService.getAllBooks({
                limit,
                page,
                categoryId,
                sortBy,
                sortDir,
                language,
                yearFrom,
                yearTo,
            })
            return res.json(result)
        } catch (e) {
            next(e instanceof ApiError ? e : ApiError.internal(e.message))
        }
    }

    // ← ВАЖНО: метод должен называться getInfoAboutBook (как ждёт роутер)
    async getInfoAboutBook(req, res, next) {
        try {
            const { bookId } = req.params
            const result = await catalogService.getBookDetails(bookId)
            return res.json(result)
        } catch (e) {
            next(e instanceof ApiError ? e : ApiError.internal(e.message))
        }
    }

    // ← ВАЖНО: метод должен называться findBook (как ждёт роутер)
    async findBook(req, res, next) {
        try {
            const { q } = req.query
            const { sortBy, sortDir, language, yearFrom, yearTo } = req.query
            const result = await catalogService.searchBooks(q, {
                sortBy,
                sortDir,
                language,
                yearFrom,
                yearTo,
            })
            return res.json(result)
        } catch (e) {
            next(e instanceof ApiError ? e : ApiError.internal(e.message))
        }
    }

    // ← Метод для админки (заглушка, чтобы роутер не падал)
    async createCategory(req, res, next) {
        try {
            const { name } = req.body
            if (!name) throw ApiError.badRequest('Название категории обязательно')
            // В реальном проекте здесь будет вызов сервиса
            const result = await catalogService.getAllCategories() // временный ответ
            return res.status(201).json({ message: 'Категория создана', categories: result.categories })
        } catch (e) {
            next(e instanceof ApiError ? e : ApiError.internal(e.message))
        }
    }
}

const instance = new CatalogController()
module.exports = instance
