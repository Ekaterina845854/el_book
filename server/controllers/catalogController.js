// П2 — CatalogController (просмотр каталога книг)
// П3 — CatalogController (поиск книги в поисковой строке)

const catalogService = require('../services/catalogService')
const {ApiError} = require('../middleware/errorHandler')

class CatalogController {
    // ── П2: GET /api/catalog/categories — showCategories() ───────────────────
    async showCategories(req, res, next) {
        try {
            const result = await catalogService.getAllCategories()
            return res.json(result)
        } catch (e) {
            next(e instanceof ApiError ? e : ApiError.internal(e.message))
        }
    }

    // ── П2: GET /api/catalog/categories/:categoryId/books — getBooksByCategory() ─
    async getBooksByCategory(req, res, next) {
        try {
            const {categoryId} = req.params
            const {limit, page} = req.query
            const result = await catalogService.getBooksByCategory(categoryId, {limit, page})
            return res.json(result)
        } catch (e) {
            next(e instanceof ApiError ? e : ApiError.internal(e.message))
        }
    }

    // ── П2: GET /api/catalog/books — общий список с пагинацией ───────────────
    async getAllBooks(req, res, next) {
        try {
            const {limit, page, categoryId, sortBy, sortDir, language, yearFrom, yearTo} = req.query
            const result = await catalogService.getAllBooks({limit, page, categoryId, sortBy, sortDir, language, yearFrom, yearTo})
            return res.json(result)
        } catch (e) {
            next(e instanceof ApiError ? e : ApiError.internal(e.message))
        }
    }

    // ── П2/П3: GET /api/catalog/books/:bookId — getInfoAboutBook() ───────────
    async getInfoAboutBook(req, res, next) {
        try {
            const {bookId} = req.params
            const result = await catalogService.getBookDetails(bookId)
            return res.json(result)
        } catch (e) {
            next(e instanceof ApiError ? e : ApiError.internal(e.message))
        }
    }

    // ── П3: GET /api/catalog/search?q= — findBook() ─────────────────────────
    async findBook(req, res, next) {
        try {
            const {q, sortBy, sortDir, language, yearFrom, yearTo} = req.query
            const result = await catalogService.searchBooks(q, {sortBy, sortDir, language, yearFrom, yearTo})
            return res.json(result)
        } catch (e) {
            next(e instanceof ApiError ? e : ApiError.internal(e.message))
        }
    }

    // ── П10 (Admin): POST /api/catalog/categories — создать категорию ─────────
    async createCategory(req, res, next) {
        try {
            const {name} = req.body
            if (!name || !name.trim()) return next(ApiError.badRequest('Название категории обязательно'))
            const {Category} = require('../models/models')
            const existing = await Category.findOne({where: {name: name.trim()}})
            if (existing) return next(ApiError.badRequest('Категория с таким названием уже существует'))
            const category = await Category.create({name: name.trim()})
            return res.status(201).json(category)
        } catch (e) {
            next(e instanceof ApiError ? e : ApiError.internal(e.message))
        }
    }

    // ── GET /api/catalog/categories — список категорий (алиас для getAll) ────
    async getCategories(req, res, next) {
        return this.showCategories(req, res, next)
    }
}

module.exports = new CatalogController()
