const request = require('supertest')
const {app, sequelize} = require('../index')

beforeAll(async () => {
    await sequelize.authenticate()
    await sequelize.sync({force: true})
})

// ─── Positive tests ────────────────────────────────────────────────────────────

describe('Auth – positive', () => {
    let token

    test('П1: register new user returns token', async () => {
        const res = await request(app).post('/api/auth/register').send({
            email: 'user@test.com',
            password: 'password123',
        })
        expect(res.status).toBe(200)
        expect(res.body).toHaveProperty('token')
        token = res.body.token
    })

    test('П1: login with valid credentials returns token', async () => {
        const res = await request(app).post('/api/auth/login').send({
            email: 'user@test.com',
            password: 'password123',
        })
        expect(res.status).toBe(200)
        expect(res.body).toHaveProperty('token')
    })

    test('П1: check valid token returns refreshed token', async () => {
        const res = await request(app)
            .get('/api/auth/check')
            .set('Authorization', `Bearer ${token}`)
        expect(res.status).toBe(200)
        expect(res.body).toHaveProperty('token')
    })

    test('П1: register admin role', async () => {
        const res = await request(app).post('/api/auth/register').send({
            email: 'admin@test.com',
            password: 'adminpass',
            role: 'ADMIN',
        })
        expect(res.status).toBe(200)
        expect(res.body).toHaveProperty('token')
    })
})

// ─── Negative tests ────────────────────────────────────────────────────────────

describe('Auth – negative', () => {
    test('register without email returns 400', async () => {
        const res = await request(app).post('/api/auth/register').send({
            password: 'password123',
        })
        expect(res.status).toBe(400)
        expect(res.body).toHaveProperty('message')
    })

    test('register without password returns 400', async () => {
        const res = await request(app).post('/api/auth/register').send({
            email: 'new@test.com',
        })
        expect(res.status).toBe(400)
    })

    test('register duplicate email returns 400', async () => {
        const res = await request(app).post('/api/auth/register').send({
            email: 'user@test.com',
            password: 'password123',
        })
        expect(res.status).toBe(400)
        expect(res.body.message).toMatch(/already exists/)
    })

    test('login with non-existent email returns 404', async () => {
        const res = await request(app).post('/api/auth/login').send({
            email: 'ghost@test.com',
            password: 'password123',
        })
        expect(res.status).toBe(404)
    })

    test('login with wrong password returns 401', async () => {
        const res = await request(app).post('/api/auth/login').send({
            email: 'user@test.com',
            password: 'wrongpassword',
        })
        expect(res.status).toBe(401)
    })

    test('check without token returns 401', async () => {
        const res = await request(app).get('/api/auth/check')
        expect(res.status).toBe(401)
    })

    test('check with invalid token returns 401', async () => {
        const res = await request(app)
            .get('/api/auth/check')
            .set('Authorization', 'Bearer not.a.real.token')
        expect(res.status).toBe(401)
    })
})
