const request = require('supertest')
const {app, sequelize} = require('../index')

let userToken

beforeAll(async () => {
    await sequelize.sync({force: true})

    await request(app).post('/api/auth/register').send({email: 'user@test.com', password: 'userpass'})
    const login = await request(app).post('/api/auth/login').send({email: 'user@test.com', password: 'userpass'})
    userToken = login.body.token
})

// ─── Positive tests ────────────────────────────────────────────────────────────

describe('Subscription – positive', () => {
    test('П9: get subscription when none exists', async () => {
        const res = await request(app)
            .get('/api/subscription')
            .set('Authorization', `Bearer ${userToken}`)
        expect(res.status).toBe(200)
        expect(res.body.isPaid).toBe(false)
    })

    test('П9: pay for monthly subscription', async () => {
        const res = await request(app)
            .post('/api/subscription/pay')
            .set('Authorization', `Bearer ${userToken}`)
            .send({plan: 'monthly', paymentMethod: 'card'})
        expect(res.status).toBe(200)
        expect(res.body.message).toMatch(/activated/)
        expect(res.body.subscription.isPaid).toBe(true)
        expect(res.body.subscription.plan).toBe('monthly')
    })

    test('П9: subscription is now active', async () => {
        const res = await request(app)
            .get('/api/subscription')
            .set('Authorization', `Bearer ${userToken}`)
        expect(res.status).toBe(200)
        expect(res.body.isPaid).toBe(true)
        expect(res.body.isActive).toBe(true)
        expect(res.body).toHaveProperty('endDate')
    })

    test('П9: upgrade to yearly plan', async () => {
        const res = await request(app)
            .post('/api/subscription/pay')
            .set('Authorization', `Bearer ${userToken}`)
            .send({plan: 'yearly', paymentMethod: 'bank_transfer'})
        expect(res.status).toBe(200)
        expect(res.body.subscription.plan).toBe('yearly')
        expect(res.body.subscription.isPaid).toBe(true)
    })

    test('П9: end date is ~12 months away for yearly plan', async () => {
        const res = await request(app)
            .get('/api/subscription')
            .set('Authorization', `Bearer ${userToken}`)
        const endDate = new Date(res.body.endDate)
        const now = new Date()
        const monthsDiff = (endDate.getFullYear() - now.getFullYear()) * 12 + (endDate.getMonth() - now.getMonth())
        expect(monthsDiff).toBeGreaterThanOrEqual(11)
        expect(monthsDiff).toBeLessThanOrEqual(13)
    })
})

// ─── Negative tests ────────────────────────────────────────────────────────────

describe('Subscription – negative', () => {
    test('pay without payment method returns 400', async () => {
        const res = await request(app)
            .post('/api/subscription/pay')
            .set('Authorization', `Bearer ${userToken}`)
            .send({plan: 'monthly'})
        expect(res.status).toBe(400)
        expect(res.body.message).toMatch(/payment method/i)
    })

    test('pay with invalid plan returns 400', async () => {
        const res = await request(app)
            .post('/api/subscription/pay')
            .set('Authorization', `Bearer ${userToken}`)
            .send({plan: 'weekly', paymentMethod: 'card'})
        expect(res.status).toBe(400)
        expect(res.body.message).toMatch(/Invalid plan/)
    })

    test('unauthenticated subscription check returns 401', async () => {
        const res = await request(app).get('/api/subscription')
        expect(res.status).toBe(401)
    })

    test('unauthenticated payment returns 401', async () => {
        const res = await request(app)
            .post('/api/subscription/pay')
            .send({plan: 'monthly', paymentMethod: 'card'})
        expect(res.status).toBe(401)
    })
})
