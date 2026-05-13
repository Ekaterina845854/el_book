const {Op} = require('sequelize')
const {UserLibrary, Book, Category} = require('../models/models')
const {ApiError} = require('../middleware/errorHandler')

class UserLibraryService {
    async checkBookAvailability(bookId) {
        const book = await Book.findOne({where: {id: bookId}})
        if (!book) {
            return {available: false, reason: 'NOT_FOUND', message: 'Книга не найдена'}
        }
        if (book.status === 'deleted') {
            return {available: false, reason: 'UNAVAILABLE', message: 'Книга временно недоступна'}
        }
        return {available: true, book}
    }

    async checkDuplicate(userId, bookId) {
        const existing = await UserLibrary.findOne({where: {userId, bookId}})
        return !!existing
    }

    async addBook(userId, bookId) {
        const availability = await this.checkBookAvailability(bookId)
        if (!availability.available) {
            if (availability.reason === 'NOT_FOUND') throw ApiError.notFound(availability.message)
            throw ApiError.badRequest(availability.message)
        }

        const isDuplicate = await this.checkDuplicate(userId, bookId)
        if (isDuplicate) throw ApiError.badRequest('Книга уже в вашей библиотеке')

        const entry = await UserLibrary.create({userId, bookId})
        const updatedLibrary = await this.getUserLibrary(userId)
        return {entry, updatedLibrary}
    }

    async getUserLibrary(userId, {sortBy, sortDir = 'DESC', language, yearFrom, yearTo, categoryId} = {}) {
        // Фильтр по полям книги
        const bookWhere = {}
        if (language) bookWhere.language = language
        if (categoryId) bookWhere.categoryId = parseInt(categoryId)
        if (yearFrom || yearTo) {
            bookWhere.year = {}
            if (yearFrom) bookWhere.year[Op.gte] = parseInt(yearFrom)
            if (yearTo) bookWhere.year[Op.lte] = parseInt(yearTo)
        }

        // Порядок сортировки
        const validBookFields = {title: 'title', author: 'author', year: 'year', rating: 'rating'}
        const dir = sortDir === 'ASC' ? 'ASC' : 'DESC'
        let order
        if (sortBy && validBookFields[sortBy]) {
            order = [[Book, validBookFields[sortBy], dir]]
        } else {
            order = [['addedAt', dir]]
        }

        const hasBookFilter = Object.keys(bookWhere).length > 0

        const entries = await UserLibrary.findAll({
            where: {userId},
            include: [
                {
                    model: Book,
                    where: hasBookFilter ? bookWhere : undefined,
                    required: hasBookFilter,
                    include: [{model: Category, attributes: ['id', 'name']}],
                    attributes: {exclude: ['text']},
                },
            ],
            order,
        })

        if (!entries || entries.length === 0) {
            return {books: [], empty: true, message: 'Добавьте книгу из каталога'}
        }

        const {available, unavailableIds} = this.filterUnavailableBooks(entries)
        return {books: available, unavailableIds, empty: false}
    }

    filterUnavailableBooks(entries) {
        const available = []
        const unavailableIds = []

        for (const entry of entries) {
            const data = entry.toJSON()
            if (!data.book || data.book.status === 'deleted') {
                data.accessRestricted = true
                data.accessMessage = 'Доступ к книге ограничен'
                unavailableIds.push(data.bookId)
            } else {
                data.accessRestricted = false
            }
            data.actions = this.getBookActions(data)
            available.push(data)
        }

        return {available, unavailableIds}
    }

    getBookActions(libraryEntry) {
        if (libraryEntry.accessRestricted) return []
        return ['read', 'download', 'rate']
    }

    async removeBook(userId, bookId) {
        const entry = await UserLibrary.findOne({where: {userId, bookId}})
        if (!entry) throw ApiError.notFound('Книга не найдена в вашей библиотеке')
        await entry.destroy()
        return {message: 'Книга удалена из библиотеки'}
    }

    async getLibraryEntry(userId, bookId) {
        return UserLibrary.findOne({where: {userId, bookId}})
    }
}

module.exports = new UserLibraryService()
