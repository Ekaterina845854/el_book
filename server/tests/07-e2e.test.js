/**
 * E2E: Full user journey covering all 10 use cases from the ТЗ.
 *
 * П1  – Авторизоваться в системе
 * П2  – Просмотреть каталог книг
 * П3  – Найти книгу в поисковой строке
 * П4  – Добавить книгу в свою библиотеку
 * П5  – Просмотреть свою библиотеку
 * П6  – Открыть книгу для просмотра
 * П7  – Скачать книгу
 * П8  – Оценить книгу
 * П9  – Оплатить подписку
 * П10 – Пополнить общую библиотеку (admin)
 */

const request = require('supertest')
const {app, sequelize} = require('../index')

let adminToken
let userToken
let genreId
let bookId

beforeAll(async () => {
    await sequelize.sync({force: true})
})

describe('E2E – complete user journey', () => {
    // ── П1: Авторизоваться в системе ────────────────────────────────────────

    test('step 1a – admin registers', async () => {
        const res = await request(app).post('/api/auth/register').send({
            email: 'admin@library.com',
            password: 'Admin1234',
            role: 'ADMIN',
            phone: '+79001234567',
        })
        expect(res.status).toBe(200)
        expect(res.body).toHaveProperty('token')
        adminToken = res.body.token
    })

    test('step 1b – user registers', async () => {
        const res = await request(app).post('/api/auth/register').send({
            email: 'reader@library.com',
            password: 'Reader1234',
            phone: '+79007654321',
        })
        expect(res.status).toBe(200)
        expect(res.body).toHaveProperty('token')
        userToken = res.body.token
    })

    test('step 1c – user logs in and receives token', async () => {
        const res = await request(app).post('/api/auth/login').send({
            email: 'reader@library.com',
            password: 'Reader1234',
        })
        expect(res.status).toBe(200)
        expect(res.body).toHaveProperty('token')
        userToken = res.body.token
    })

    test('step 1d – token is valid (check endpoint)', async () => {
        const res = await request(app)
            .get('/api/auth/check')
            .set('Authorization', `Bearer ${userToken}`)
        expect(res.status).toBe(200)
        expect(res.body).toHaveProperty('token')
    })

    // ── П10: Пополнить общую библиотеку ─────────────────────────────────────

    test('step 10a – admin creates genre', async () => {
        const res = await request(app)
            .post('/api/genres')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({name: 'Classic Literature'})
        expect(res.status).toBe(200)
        genreId = res.body.id
    })

    test('step 10b – admin adds book to general library', async () => {
        const res = await request(app)
            .post('/api/books')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                title: '1984',
                author: 'George Orwell',
                year: 1949,
                ISBN: '978-0-452-28423-4',
                pages: 328,
                annotation: 'A dystopian social science fiction novel.',
                coverUrl: 'https://example.com/1984-cover.jpg',
                textUrl: 'https://example.com/1984.pdf',
                genreId,
            })
        expect(res.status).toBe(200)
        expect(res.body.title).toBe('1984')
        bookId = res.body.id
    })

    // ── П2: Просмотреть каталог книг ────────────────────────────────────────

    test('step 2 – user browses catalog', async () => {
        const res = await request(app)
            .get('/api/books')
            .set('Authorization', `Bearer ${userToken}`)
        expect(res.status).toBe(200)
        expect(res.body.count).toBeGreaterThan(0)
        expect(res.body.rows[0]).toHaveProperty('title')
        expect(res.body.rows[0]).toHaveProperty('genre')
    })

    // ── П3: Найти книгу в поисковой строке ──────────────────────────────────

    test('step 3a – user searches by title', async () => {
        const res = await request(app)
            .get('/api/books/search?q=1984')
            .set('Authorization', `Bearer ${userToken}`)
        expect(res.status).toBe(200)
        expect(res.body.length).toBeGreaterThan(0)
        expect(res.body[0].title).toBe('1984')
    })

    test('step 3b – user searches by author', async () => {
        const res = await request(app)
            .get('/api/books/search?q=Orwell')
            .set('Authorization', `Bearer ${userToken}`)
        expect(res.status).toBe(200)
        expect(res.body.length).toBeGreaterThan(0)
    })

    // ── П4: Добавить книгу в свою библиотеку ────────────────────────────────

    test('step 4 – user adds book to personal library', async () => {
        const res = await request(app)
            .post(`/api/library/${bookId}`)
            .set('Authorization', `Bearer ${userToken}`)
        expect(res.status).toBe(201)
        expect(res.body.bookId).toBe(bookId)
    })

    // ── П5: Просмотреть свою библиотеку ─────────────────────────────────────

    test('step 5 – user views personal library', async () => {
        const res = await request(app)
            .get('/api/library')
            .set('Authorization', `Bearer ${userToken}`)
        expect(res.status).toBe(200)
        expect(res.body.length).toBe(1)
        expect(res.body[0].book.title).toBe('1984')
        expect(res.body[0].book.genre.name).toBe('Classic Literature')
    })

    // ── П6: Открыть книгу для просмотра ─────────────────────────────────────

    test('step 6 – user opens book details for reading', async () => {
        const res = await request(app)
            .get(`/api/books/${bookId}`)
            .set('Authorization', `Bearer ${userToken}`)
        expect(res.status).toBe(200)
        expect(res.body.textUrl).toBe('https://example.com/1984.pdf')
        expect(res.body).toHaveProperty('ratings')
    })

    // ── П7: Скачать книгу ────────────────────────────────────────────────────

    test('step 7 – user downloads book', async () => {
        const res = await request(app)
            .get(`/api/books/${bookId}/download`)
            .set('Authorization', `Bearer ${userToken}`)
        expect(res.status).toBe(200)
        expect(res.body.downloadUrl).toBe('https://example.com/1984.pdf')
        expect(res.body.title).toBe('1984')
    })

    // ── П8: Оценить книгу ────────────────────────────────────────────────────

    test('step 8a – user rates the book', async () => {
        const res = await request(app)
            .post(`/api/rating/${bookId}`)
            .set('Authorization', `Bearer ${userToken}`)
            .send({score: 5, comment: 'Timeless classic!'})
        expect(res.status).toBe(201)
        expect(res.body.score).toBe(5)
        expect(res.body.comment).toBe('Timeless classic!')
    })

    test('step 8b – book rating is updated', async () => {
        const res = await request(app)
            .get(`/api/books/${bookId}`)
            .set('Authorization', `Bearer ${userToken}`)
        expect(res.body.rating).toBe(5)
    })

    test('step 8c – ratings are visible on book page', async () => {
        const res = await request(app)
            .get(`/api/rating/${bookId}`)
            .set('Authorization', `Bearer ${userToken}`)
        expect(res.status).toBe(200)
        expect(res.body.length).toBe(1)
        expect(res.body[0].comment).toBe('Timeless classic!')
    })

    // ── П9: Оплатить подписку ────────────────────────────────────────────────

    test('step 9a – user pays for monthly subscription', async () => {
        const res = await request(app)
            .post('/api/subscription/pay')
            .set('Authorization', `Bearer ${userToken}`)
            .send({plan: 'monthly', paymentMethod: 'credit_card'})
        expect(res.status).toBe(200)
        expect(res.body.message).toMatch(/activated/)
        expect(res.body.subscription.isPaid).toBe(true)
    })

    test('step 9b – subscription is active with correct end date', async () => {
        const res = await request(app)
            .get('/api/subscription')
            .set('Authorization', `Bearer ${userToken}`)
        expect(res.status).toBe(200)
        expect(res.body.isActive).toBe(true)
        expect(new Date(res.body.endDate) > new Date()).toBe(true)
    })
})
