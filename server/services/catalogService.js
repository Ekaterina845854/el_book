const {Op} = require('sequelize')
const {Category, Book, Rating} = require('../models/models')
const {ApiError} = require('../middleware/errorHandler')

class CatalogService {
    // ── Helpers ───────────────────────────────────────────────────────────────

    _buildWhere(base, {language, yearFrom, yearTo} = {}) {
        const where = {...base}
        if (language) where.language = language
        const yearFilter = {}
        if (yearFrom) yearFilter[Op.gte] = parseInt(yearFrom)
        if (yearTo) yearFilter[Op.lte] = parseInt(yearTo)
        if (Object.keys(yearFilter).length) where.year = yearFilter
        return where
    }

    _buildOrder(sortBy, sortDir = 'DESC') {
        const valid = {title: 'title', author: 'author', year: 'year', rating: 'rating', createdAt: 'createdAt'}
        const field = valid[sortBy] || 'createdAt'
        const dir = sortDir === 'ASC' ? 'ASC' : 'DESC'
        return [[field, dir]]
    }

    // ── П2: getAllCategories() ─────────────────────────────────────────────────
    async getAllCategories() {
        const categories = await Category.findAll({order: [['name', 'ASC']]})
        if (!categories || categories.length === 0) {
            return {categories: [], empty: true, message: 'Категории не найдены'}
        }
        return {categories, empty: false}
    }

    // ── П2: getBooksByCategory(categoryId) ────────────────────────────────────
    async getBooksByCategory(categoryId, {limit = 10, page = 1, sortBy, sortDir, language, yearFrom, yearTo} = {}) {
        const category = await Category.findOne({where: {id: categoryId}})
        if (!category) throw ApiError.notFound('Категория не найдена')

        const offset = (parseInt(page) - 1) * parseInt(limit)
        const where = this._buildWhere({categoryId, status: 'active'}, {language, yearFrom, yearTo})
        const order = this._buildOrder(sortBy, sortDir)

        const books = await Book.findAndCountAll({
            where,
            attributes: {exclude: ['text']},
            limit: parseInt(limit),
            offset,
            order,
        })

        if (books.count === 0) {
            return {books: [], count: 0, empty: true, message: 'Каталог пополняется'}
        }
        return {books: books.rows, count: books.count, empty: false, category}
    }

    // ── П2: getBookDetails(bookId) ────────────────────────────────────────────
    async getBookDetails(bookId) {
        const book = await Book.findOne({
            where: {id: bookId},
            include: [
                {model: Category, attributes: ['id', 'name']},
                {model: Rating, attributes: ['id', 'title', 'score', 'comment', 'userId']},
            ],
        })

        if (!book) throw ApiError.notFound('Информация о книге недоступна')

        const data = book.toJSON()

        const availableFormats = []
        if (data.fb2Path) availableFormats.push('fb2')
        if (data.docxPath) availableFormats.push('docx')
        if (data.pdfPath) availableFormats.push('pdf')
        if (data.txtPath) availableFormats.push('txt')
        if (data.text) availableFormats.push('text')

        data.hasText = !!(data.text || data.textUrl || data.fb2Path || data.txtPath)
        data.availableFormats = availableFormats
        // Читать онлайн можно только FB2 (или книги с inline-текстом из FB2)
        data.canRead = !!(data.fb2Path || data.text)

        delete data.text
        delete data.fb2Path
        delete data.docxPath
        delete data.pdfPath
        delete data.txtPath

        if (book.status === 'deleted') {
            return {...data, deleted: true, message: 'Книга удалена из общего каталога'}
        }
        return data
    }

    normalizeQuery(query) {
        if (!query) return ''
        return query.trim().toLowerCase().replace(/\s+/g, ' ')
    }

    detectSearchType(query) {
        if (/^\d{9,13}$/.test(query.replace(/-/g, ''))) return 'ISBN'
        return 'title|author'
    }

    // ── П3: searchBooks(query, filters) ───────────────────────────────────────
    async searchBooks(query, {sortBy, sortDir, language, yearFrom, yearTo} = {}) {
        const normalized = this.normalizeQuery(query)
        if (!normalized) throw ApiError.badRequest('Введите название книги')

        const searchType = this.detectSearchType(normalized)
        let baseWhere

        if (searchType === 'ISBN') {
            baseWhere = {ISBN: {[Op.iLike]: `%${normalized}%`}, status: 'active'}
        } else {
            baseWhere = {
                [Op.or]: [
                    {title: {[Op.iLike]: `%${normalized}%`}},
                    {author: {[Op.iLike]: `%${normalized}%`}},
                ],
                status: 'active',
            }
        }

        const where = this._buildWhere(baseWhere, {language, yearFrom, yearTo})

        const searchResults = await Book.findAll({
            where,
            include: [{model: Category, attributes: ['id', 'name']}],
            attributes: {exclude: ['text']},
        })

        let ranked = this.rankResults(searchResults, normalized)

        // Явная сортировка переопределяет ранжирование по релевантности
        if (sortBy && sortBy !== 'createdAt') {
            const dir = sortDir === 'ASC' ? 1 : -1
            ranked.sort((a, b) => {
                const av = a[sortBy] ?? ''
                const bv = b[sortBy] ?? ''
                if (av < bv) return -1 * dir
                if (av > bv) return 1 * dir
                return 0
            })
        }

        if (ranked.length === 0) {
            const suggestions = await this.fuzzySearch(normalized)
            return {
                results: [],
                found: false,
                message: 'Книга не найдена. Проверьте правильность написания.',
                suggestions,
            }
        }

        return {results: ranked, found: true}
    }

    rankResults(books, query) {
        return books.sort((a, b) => {
            const aTitle = a.title.toLowerCase()
            const bTitle = b.title.toLowerCase()
            const aExact = aTitle === query ? -1 : aTitle.startsWith(query) ? 0 : 1
            const bExact = bTitle === query ? -1 : bTitle.startsWith(query) ? 0 : 1
            return aExact - bExact
        })
    }

    async fuzzySearch(query) {
        if (query.length < 3) return []
        const prefix = query.substring(0, Math.max(3, Math.floor(query.length * 0.6)))
        const suggestions = await Book.findAll({
            where: {
                [Op.or]: [
                    {title: {[Op.iLike]: `${prefix}%`}},
                    {author: {[Op.iLike]: `${prefix}%`}},
                ],
                status: 'active',
            },
            attributes: ['id', 'title', 'author'],
            limit: 5,
        })
        return suggestions.map(b => `${b.title} — ${b.author}`)
    }

    // ── Список всех книг с пагинацией ─────────────────────────────────────────
    async getAllBooks({limit = 10, page = 1, categoryId, sortBy, sortDir, language, yearFrom, yearTo} = {}) {
        const offset = (parseInt(page) - 1) * parseInt(limit)
        const baseWhere = {status: 'active'}
        if (categoryId) baseWhere.categoryId = categoryId
        const where = this._buildWhere(baseWhere, {language, yearFrom, yearTo})
        const order = this._buildOrder(sortBy, sortDir)

        const books = await Book.findAndCountAll({
            where,
            include: [{model: Category, attributes: ['id', 'name']}],
            attributes: {exclude: ['text']},
            limit: parseInt(limit),
            offset,
            order,
        })

        return {books: books.rows, count: books.count}
    }
}

module.exports = new CatalogService()
