const request = require('supertest')
const {app, sequelize} = require('../index')

let adminToken
let userToken

beforeAll(async () => {
    await sequelize.sync({force: true})

    await request(app).post('/api/auth/register').send({email: 'admin@test.com', password: 'adminpass', role: 'ADMIN'})
    const adminLogin = await request(app).post('/api/auth/login').send({email: 'admin@test.com', password: 'adminpass'})
    adminToken = adminLogin.body.token

    await request(app).post('/api/auth/register').send({email: 'user@test.com', password: 'userpass'})
    const userLogin = await request(app).post('/api/auth/login').send({email: 'user@test.com', password: 'userpass'})
    userToken = userLogin.body.token
})

// ─── Positive tests ────────────────────────────────────────────────────────────

describe('Genres – positive', () => {
    test('admin creates genre', async () => {
        const res = await request(app)
            .post('/api/genres')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({name: 'Fiction'})
        expect(res.status).toBe(200)
        expect(res.body).toHaveProperty('id')
        expect(res.body.name).toBe('Fiction')
    })

    test('authenticated user gets all genres', async () => {
        const res = await request(app)
            .get('/api/genres')
            .set('Authorization', `Bearer ${userToken}`)
        expect(res.status).toBe(200)
        expect(Array.isArray(res.body)).toBe(true)
        expect(res.body.length).toBeGreaterThan(0)
    })
})

// ─── Negative tests ────────────────────────────────────────────────────────────

describe('Genres – negative', () => {
    test('user cannot create genre – returns 403', async () => {
        const res = await request(app)
            .post('/api/genres')
            .set('Authorization', `Bearer ${userToken}`)
            .send({name: 'Horror'})
        expect(res.status).toBe(403)
    })

    test('unauthenticated request to get genres returns 401', async () => {
        const res = await request(app).get('/api/genres')
        expect(res.status).toBe(401)
    })

    test('create genre without name returns 400', async () => {
        const res = await request(app)
            .post('/api/genres')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({})
        expect(res.status).toBe(400)
    })

    test('create duplicate genre returns 400', async () => {
        const res = await request(app)
            .post('/api/genres')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({name: 'Fiction'})
        expect(res.status).toBe(400)
        expect(res.body.message).toMatch(/already exists/)
    })
})
