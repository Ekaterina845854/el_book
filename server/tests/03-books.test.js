const request = require('supertest')
const {app, sequelize} = require('../index')

let adminToken
let userToken
let genreId
let bookId

beforeAll(async () => {
    await sequelize.sync({force: true})

    await request(app).post('/api/auth/register').send({email: 'admin@test.com', password: 'adminpass', role: 'ADMIN'})
    const adminLogin = await request(app).post('/api/auth/login').send({email: 'admin@test.com', password: 'adminpass'})
    adminToken = adminLogin.body.token

    await request(app).post('/api/auth/register').send({email: 'user@test.com', password: 'userpass'})
    const userLogin = await request(app).post('/api/auth/login').send({email: 'user@test.com', password: 'userpass'})
    userToken = userLogin.body.token

    const genreRes = await request(app)
        .post('/api/genres')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({name: 'Fiction'})
    genreId = genreRes.body.id
})

// ─── Positive tests ────────────────────────────────────────────────────────────

describe('Books – positive', () => {
    test('П10: admin creates book with full data', async () => {
        const res = await request(app)
            .post('/api/books')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                title: 'The Great Gatsby',
                author: 'F. Scott Fitzgerald',
                year: 1925,
                ISBN: '978-0-7432-7356-5',
                pages: 180,
                annotation: 'A novel about the American Dream',
                coverUrl: 'https://example.com/gatsby.jpg',
                textUrl: 'https://example.com/gatsby.pdf',
                genreId,
            })
        expect(res.status).toBe(200)
        expect(res.body).toHaveProperty('id')
        expect(res.body.title).toBe('The Great Gatsby')
        bookId = res.body.id
    })

    test('П2: user gets catalog (all books)', async () => {
        const res = await request(app)
            .get('/api/books')
            .set('Authorization', `Bearer ${userToken}`)
        expect(res.status).toBe(200)
        expect(res.body).toHaveProperty('count')
        expect(res.body).toHaveProperty('rows')
        expect(res.body.count).toBeGreaterThan(0)
    })

    test('П2: catalog supports pagination', async () => {
        const res = await request(app)
            .get('/api/books?limit=5&page=1')
            .set('Authorization', `Bearer ${userToken}`)
        expect(res.status).toBe(200)
        expect(res.body.rows.length).toBeLessThanOrEqual(5)
    })

    test('П2: catalog filtered by genre', async () => {
        const res = await request(app)
            .get(`/api/books?genreId=${genreId}`)
            .set('Authorization', `Bearer ${userToken}`)
        expect(res.status).toBe(200)
        expect(res.body.rows.every(b => b.genreId === genreId)).toBe(true)
    })

    test('П3: search finds book by title', async () => {
        const res = await request(app)
            .get('/api/books/search?q=Gatsby')
            .set('Authorization', `Bearer ${userToken}`)
        expect(res.status).toBe(200)
        expect(Array.isArray(res.body)).toBe(true)
        expect(res.body.length).toBeGreaterThan(0)
        expect(res.body[0].title).toContain('Gatsby')
    })

    test('П3: search finds book by author', async () => {
        const res = await request(app)
            .get('/api/books/search?q=fitzgerald')
            .set('Authorization', `Bearer ${userToken}`)
        expect(res.status).toBe(200)
        expect(res.body.length).toBeGreaterThan(0)
    })

    test('user gets one book by id', async () => {
        const res = await request(app)
            .get(`/api/books/${bookId}`)
            .set('Authorization', `Bearer ${userToken}`)
        expect(res.status).toBe(200)
        expect(res.body.id).toBe(bookId)
        expect(res.body).toHaveProperty('ratings')
    })

    test('П7: download returns textUrl', async () => {
        const res = await request(app)
            .get(`/api/books/${bookId}/download`)
            .set('Authorization', `Bearer ${userToken}`)
        expect(res.status).toBe(200)
        expect(res.body).toHaveProperty('downloadUrl')
        expect(res.body.downloadUrl).toBe('https://example.com/gatsby.pdf')
    })
})

// ─── Negative tests ────────────────────────────────────────────────────────────

describe('Books – negative', () => {
    test('user cannot create book – returns 403', async () => {
        const res = await request(app)
            .post('/api/books')
            .set('Authorization', `Bearer ${userToken}`)
            .send({title: 'Unauthorized Book', author: 'No One'})
        expect(res.status).toBe(403)
    })

    test('unauthenticated request to catalog returns 401', async () => {
        const res = await request(app).get('/api/books')
        expect(res.status).toBe(401)
    })

    test('create book without title returns 400', async () => {
        const res = await request(app)
            .post('/api/books')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({author: 'Someone'})
        expect(res.status).toBe(400)
    })

    test('create book without author returns 400', async () => {
        const res = await request(app)
            .post('/api/books')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({title: 'No Author Book'})
        expect(res.status).toBe(400)
    })

    test('create duplicate book title returns 400', async () => {
        const res = await request(app)
            .post('/api/books')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({title: 'The Great Gatsby', author: 'Copy'})
        expect(res.status).toBe(400)
    })

    test('get non-existent book returns 404', async () => {
        const res = await request(app)
            .get('/api/books/99999')
            .set('Authorization', `Bearer ${userToken}`)
        expect(res.status).toBe(404)
    })

    test('search without query returns 400', async () => {
        const res = await request(app)
            .get('/api/books/search')
            .set('Authorization', `Bearer ${userToken}`)
        expect(res.status).toBe(400)
    })

    test('download book without textUrl returns 404', async () => {
        const noTextBook = await request(app)
            .post('/api/books')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({title: 'No Text Book', author: 'Author'})
        const res = await request(app)
            .get(`/api/books/${noTextBook.body.id}/download`)
            .set('Authorization', `Bearer ${userToken}`)
        expect(res.status).toBe(404)
    })

    test('download non-existent book returns 404', async () => {
        const res = await request(app)
            .get('/api/books/99999/download')
            .set('Authorization', `Bearer ${userToken}`)
        expect(res.status).toBe(404)
    })
})
