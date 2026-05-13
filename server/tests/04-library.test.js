const request = require('supertest')
const {app, sequelize} = require('../index')

let userToken
let user2Token
let adminToken
let bookId

beforeAll(async () => {
    await sequelize.sync({force: true})

    await request(app).post('/api/auth/register').send({email: 'admin@test.com', password: 'adminpass', role: 'ADMIN'})
    const adminLogin = await request(app).post('/api/auth/login').send({email: 'admin@test.com', password: 'adminpass'})
    adminToken = adminLogin.body.token

    await request(app).post('/api/auth/register').send({email: 'user@test.com', password: 'userpass'})
    const userLogin = await request(app).post('/api/auth/login').send({email: 'user@test.com', password: 'userpass'})
    userToken = userLogin.body.token

    await request(app).post('/api/auth/register').send({email: 'user2@test.com', password: 'userpass'})
    const user2Login = await request(app).post('/api/auth/login').send({email: 'user2@test.com', password: 'userpass'})
    user2Token = user2Login.body.token

    const bookRes = await request(app)
        .post('/api/books')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({title: 'Test Book', author: 'Test Author', textUrl: 'https://example.com/book.pdf'})
    bookId = bookRes.body.id
})

// ─── Positive tests ────────────────────────────────────────────────────────────

describe('Library – positive', () => {
    test('П5: empty library returns empty array', async () => {
        const res = await request(app)
            .get('/api/library')
            .set('Authorization', `Bearer ${userToken}`)
        expect(res.status).toBe(200)
        expect(Array.isArray(res.body)).toBe(true)
        expect(res.body.length).toBe(0)
    })

    test('П4: add book to library', async () => {
        const res = await request(app)
            .post(`/api/library/${bookId}`)
            .set('Authorization', `Bearer ${userToken}`)
        expect(res.status).toBe(201)
        expect(res.body).toHaveProperty('id')
        expect(res.body.bookId).toBe(bookId)
    })

    test('П5: library now contains the added book', async () => {
        const res = await request(app)
            .get('/api/library')
            .set('Authorization', `Bearer ${userToken}`)
        expect(res.status).toBe(200)
        expect(res.body.length).toBe(1)
        expect(res.body[0].bookId).toBe(bookId)
        expect(res.body[0].book).toHaveProperty('title', 'Test Book')
    })

    test('П6: book in library has textUrl for reading', async () => {
        const res = await request(app)
            .get('/api/library')
            .set('Authorization', `Bearer ${userToken}`)
        expect(res.body[0].book.textUrl).toBe('https://example.com/book.pdf')
    })

    test('library is isolated per user – user2 library is empty', async () => {
        const res = await request(app)
            .get('/api/library')
            .set('Authorization', `Bearer ${user2Token}`)
        expect(res.status).toBe(200)
        expect(res.body.length).toBe(0)
    })

    test('remove book from library', async () => {
        const res = await request(app)
            .delete(`/api/library/${bookId}`)
            .set('Authorization', `Bearer ${userToken}`)
        expect(res.status).toBe(200)
        expect(res.body.message).toMatch(/removed/)
    })

    test('library is empty after removal', async () => {
        const res = await request(app)
            .get('/api/library')
            .set('Authorization', `Bearer ${userToken}`)
        expect(res.body.length).toBe(0)
    })
})

// ─── Negative tests ────────────────────────────────────────────────────────────

describe('Library – negative', () => {
    test('unauthenticated access to library returns 401', async () => {
        const res = await request(app).get('/api/library')
        expect(res.status).toBe(401)
    })

    test('add non-existent book returns 404', async () => {
        const res = await request(app)
            .post('/api/library/99999')
            .set('Authorization', `Bearer ${userToken}`)
        expect(res.status).toBe(404)
    })

    test('add book twice returns 400', async () => {
        await request(app)
            .post(`/api/library/${bookId}`)
            .set('Authorization', `Bearer ${userToken}`)
        const res = await request(app)
            .post(`/api/library/${bookId}`)
            .set('Authorization', `Bearer ${userToken}`)
        expect(res.status).toBe(400)
        expect(res.body.message).toMatch(/already/)
    })

    test('remove book not in library returns 404', async () => {
        const res = await request(app)
            .delete('/api/library/99999')
            .set('Authorization', `Bearer ${userToken}`)
        expect(res.status).toBe(404)
    })
})
