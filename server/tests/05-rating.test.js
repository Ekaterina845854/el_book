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
        .send({title: 'Rateable Book', author: 'Good Author'})
    bookId = bookRes.body.id
})

// ─── Positive tests ────────────────────────────────────────────────────────────

describe('Rating – positive', () => {
    test('П8: get ratings for book (empty initially)', async () => {
        const res = await request(app)
            .get(`/api/rating/${bookId}`)
            .set('Authorization', `Bearer ${userToken}`)
        expect(res.status).toBe(200)
        expect(Array.isArray(res.body)).toBe(true)
        expect(res.body.length).toBe(0)
    })

    test('П8: user adds rating with score and comment', async () => {
        const res = await request(app)
            .post(`/api/rating/${bookId}`)
            .set('Authorization', `Bearer ${userToken}`)
            .send({score: 4, comment: 'Great read!'})
        expect(res.status).toBe(201)
        expect(res.body).toHaveProperty('id')
        expect(res.body.score).toBe(4)
        expect(res.body.comment).toBe('Great read!')
    })

    test('П8: book average rating is updated after rating', async () => {
        const res = await request(app)
            .get(`/api/books/${bookId}`)
            .set('Authorization', `Bearer ${userToken}`)
        expect(res.status).toBe(200)
        expect(res.body.rating).toBe(4)
    })

    test('П8: second user rates the same book', async () => {
        const res = await request(app)
            .post(`/api/rating/${bookId}`)
            .set('Authorization', `Bearer ${user2Token}`)
            .send({score: 2})
        expect(res.status).toBe(201)
        expect(res.body.score).toBe(2)
    })

    test('П8: book average updates to mean of both ratings', async () => {
        const res = await request(app)
            .get(`/api/books/${bookId}`)
            .set('Authorization', `Bearer ${userToken}`)
        expect(res.body.rating).toBe(3) // (4+2)/2 = 3
    })

    test('П8: get ratings list shows both entries', async () => {
        const res = await request(app)
            .get(`/api/rating/${bookId}`)
            .set('Authorization', `Bearer ${userToken}`)
        expect(res.status).toBe(200)
        expect(res.body.length).toBe(2)
    })
})

// ─── Negative tests ────────────────────────────────────────────────────────────

describe('Rating – negative', () => {
    test('unauthenticated rating returns 401', async () => {
        const res = await request(app)
            .post(`/api/rating/${bookId}`)
            .send({score: 3})
        expect(res.status).toBe(401)
    })

    test('score below 1 returns 400', async () => {
        const adminLogin = await request(app).post('/api/auth/login').send({email: 'admin@test.com', password: 'adminpass'})
        const res = await request(app)
            .post(`/api/rating/${bookId}`)
            .set('Authorization', `Bearer ${adminLogin.body.token}`)
            .send({score: 0})
        expect(res.status).toBe(400)
    })

    test('score above 5 returns 400', async () => {
        const adminLogin = await request(app).post('/api/auth/login').send({email: 'admin@test.com', password: 'adminpass'})
        const res = await request(app)
            .post(`/api/rating/${bookId}`)
            .set('Authorization', `Bearer ${adminLogin.body.token}`)
            .send({score: 6})
        expect(res.status).toBe(400)
    })

    test('duplicate rating by same user returns 400', async () => {
        const res = await request(app)
            .post(`/api/rating/${bookId}`)
            .set('Authorization', `Bearer ${userToken}`)
            .send({score: 5})
        expect(res.status).toBe(400)
        expect(res.body.message).toMatch(/already rated/)
    })

    test('rate non-existent book returns 404', async () => {
        const res = await request(app)
            .post('/api/rating/99999')
            .set('Authorization', `Bearer ${userToken}`)
            .send({score: 3})
        expect(res.status).toBe(404)
    })

    test('get ratings for non-existent book returns 404', async () => {
        const res = await request(app)
            .get('/api/rating/99999')
            .set('Authorization', `Bearer ${userToken}`)
        expect(res.status).toBe(404)
    })
})
