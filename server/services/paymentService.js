// П9 — PaymentService (служебный класс из диаграммы последовательностей)
// createPaymentOrder(), processPayment(), verifyPayment(), activateSubscription(), sendConfirmationEmail()
// PaymentGateway — мок внешней системы (validateCardData, processTransaction, 3D-Secure)

const crypto = require('crypto')
const {Subscription, Payment, User} = require('../models/models')
const {ApiError} = require('../middleware/errorHandler')
const {TARIFF_PLANS, PAYMENT_ERROR_CODES} = require('../subsystems/payment/paymentContracts')

// Мок PaymentGateway — в реальном проекте заменить на Stripe/ЮKassa SDK
const PaymentGateway = {
    validateCardData(cardData) {
        const {cardNumber, expiry, cvv} = cardData
        if (!cardNumber || !expiry || !cvv) return {valid: false, reason: 'Неверные данные карты'}
        if (cardNumber.replace(/\s/g, '').length !== 16) return {valid: false, reason: 'Неверный номер карты'}
        return {valid: true}
    },

    async processTransaction(amount) {
        // Мок: всегда успешно в dev; в prod подключить реальный шлюз
        const transactionId = crypto.randomUUID()
        return {success: true, transactionId, status: 'success'}
    },

    getSecurePaymentUrl(orderId) {
        return `${process.env.PAYMENT_GATEWAY_URL || 'https://secure.payment.mock'}/pay/${orderId}`
    },
}

class PaymentService {
    // ── П9: createPaymentOrder(userId, tariffPlan) ────────────────────────────
    // SELECT price, period FROM tariffs WHERE plan = ?
    async createPaymentOrder(userId, plan) {
        const tariff = TARIFF_PLANS[plan]
        if (!tariff) {
            throw ApiError.badRequest(`Неверный план подписки. Доступны: ${Object.keys(TARIFF_PLANS).join(', ')}`)
        }

        const orderId = crypto.randomUUID()

        const orderDetails = {
            orderId,
            userId,
            plan,
            amount: tariff.amount,
            period: tariff.period,
            currency: 'RUB',
            label: tariff.label,
            description: `${tariff.label} — ${tariff.amount} ₽ на ${tariff.period} мес.`,
        }

        return orderDetails
    }

    // ── П9: processPayment(userId, orderId, method) ───────────────────────────
    // Редирект на защищённую страницу оплаты
    async processPayment(userId, orderId, method) {
        const allowedMethods = ['card']
        if (!allowedMethods.includes(method)) {
            throw ApiError.badRequest(`Неподдерживаемый способ оплаты. Доступно: ${allowedMethods.join(', ')}`)
        }

        const securePaymentUrl = PaymentGateway.getSecurePaymentUrl(orderId)
        return {securePaymentUrl, orderId, method}
    }

    // ── П9: enterPaymentData + validateCardData ───────────────────────────────
    async validateAndPay(userId, plan, cardData) {
        // Альт. сценарий 2: неверно введены данные для платежа
        const validation = PaymentGateway.validateCardData(cardData)
        if (!validation.valid) {
            throw ApiError.badRequest(validation.reason)
        }

        const tariff = TARIFF_PLANS[plan]
        if (!tariff) throw ApiError.badRequest('Неверный план подписки')

        // Альт. сценарий 3/4: processTransaction — банк или средства
        let txResult
        try {
            txResult = await PaymentGateway.processTransaction(tariff.amount)
        } catch (e) {
            throw ApiError.badRequest('Платёж отклонён банком. Обратитесь в банк или используйте другую карту')
        }

        if (!txResult.success) {
            // Альт. сценарий 3: банк отклонил
            if (txResult.reason === 'bank_declined') {
                throw ApiError.badRequest('Платёж отклонён банком. Обратитесь в банк или используйте другую карту')
            }
            // Альт. сценарий 4: недостаточно средств
            if (txResult.reason === 'insufficient_funds') {
                throw ApiError.badRequest('Недостаточно средств. Пополните баланс или выберите другой способ оплаты')
            }
            throw ApiError.badRequest('Ошибка при обработке платежа')
        }

        // Фиксируем платёж в БД (PaymentGateway фиксирует успешный платёж)
        const payment = await this.recordPayment(userId, plan, tariff, txResult.transactionId)

        // Активируем подписку
        const subscription = await this.activateSubscription(userId, plan, tariff, payment.id)

        // Постусловие П9: отправить подтверждение (мок)
        const confirmationSent = await this.sendConfirmationEmail(userId)

        return {
            success: true,
            payment,
            subscription,
            transactionId: txResult.transactionId,
            confirmationSent,
            message: 'Подписка успешно активирована',
        }
    }

    // ── П9: verifyPayment(transactionId) ─────────────────────────────────────
    // SELECT status FROM payments WHERE transaction_id = ?
    async verifyPayment(transactionId) {
        const payment = await Payment.findOne({where: {transactionId}})
        if (!payment) throw ApiError.notFound('Транзакция не найдена')
        return {status: payment.status, verified: payment.status === 'success'}
    }

    // ── Сохранение платежа в БД ───────────────────────────────────────────────
    async recordPayment(userId, plan, tariff, transactionId) {
        return Payment.create({
            userId,
            amount: tariff.amount,
            method: 'card',
            status: 'success',
            transactionId,
            plan,
            period: tariff.period,
        })
    }

    // ── П9: activateSubscription(userId) ─────────────────────────────────────
    // UPDATE users SET subscription = 'active', expiry = NOW() + 30/365 days
    async activateSubscription(userId, plan, tariff, paymentId) {
        const startDate = new Date()
        const endDate = new Date()
        endDate.setMonth(endDate.getMonth() + tariff.period)

        let subscription = await Subscription.findOne({where: {userId}})
        if (subscription) {
            await subscription.update({
                plan,
                isPaid: true,
                startDate,
                endDate,
                status: 'active',
            })
        } else {
            subscription = await Subscription.create({
                userId,
                plan,
                isPaid: true,
                startDate,
                endDate,
                status: 'active',
            })
        }

        // Привязываем платёж к подписке
        await Payment.update({subscriptionId: subscription.id}, {where: {id: paymentId}})

        // Обновляем tariffPlan у пользователя
        await User.update({tariffPlan: plan}, {where: {id: userId}})

        return subscription
    }

    // ── П9: sendConfirmationEmail(userId) ─────────────────────────────────────
    // Альт. сценарий 5: если email не отправился — подписка всё равно активна
    async sendConfirmationEmail(userId) {
        try {
            const user = await User.findOne({where: {id: userId}, attributes: ['email']})
            // В production: вызов SMTP/SendGrid SDK
            console.log(`[PaymentService] Подтверждение оплаты отправлено на ${user.email}`)
            return true
        } catch (e) {
            // Альт. сценарий 5: ошибка SMTP — логируем, не падаем
            console.error('[PaymentService] Ошибка отправки подтверждения:', e.message)
            return false
        }
    }

    // ── П9: cancelPayment (Альт. сценарий 1) ─────────────────────────────────
    async cancelPayment(userId, orderId) {
        // orderId — временный, до фиксации в БД; просто возвращаем статус
        return {
            cancelled: true,
            message: 'Оплата отменена. Подписка не оформлена.',
            code: PAYMENT_ERROR_CODES.CANCELLED,
        }
    }

    // ── Получение текущей подписки ────────────────────────────────────────────
    async getSubscription(userId) {
        const subscription = await Subscription.findOne({where: {userId}})
        if (!subscription) return {isPaid: false, isActive: false, message: 'Нет активной подписки'}
        const isActive = subscription.isPaid && new Date() <= new Date(subscription.endDate)
        return {...subscription.toJSON(), isActive}
    }
}

module.exports = new PaymentService()
