// П9 — SubscriptionController (оплатить подписку)
// Делегирует в paymentService — изолированную подсистему оплаты

const paymentService = require('../services/paymentService')
const {ApiError} = require('../middleware/errorHandler')

class SubscriptionController {
    // ── П9: GET /api/subscription — getSubscription() ────────────────────────
    async getSubscription(req, res, next) {
        try {
            const userId = req.user.id
            const result = await paymentService.getSubscription(userId)
            return res.json(result)
        } catch (e) {
            next(e instanceof ApiError ? e : ApiError.internal(e.message))
        }
    }

    // ── П9: POST /api/subscription/order — makePayment(): создание заказа ────
    // Возвращает детали заказа (сумма, период) + URL защищённой страницы
    async makePayment(req, res, next) {
        try {
            const userId = req.user.id
            const {plan = 'monthly'} = req.body

            // Шаг 2: createPaymentOrder — отображение деталей заказа
            const order = await paymentService.createPaymentOrder(userId, plan)

            // Шаг 4: processPayment — получение URL защищённой страницы
            const {securePaymentUrl} = await paymentService.processPayment(userId, order.orderId, 'card')

            return res.json({
                order,
                securePaymentUrl,
                message: `Сумма: ${order.amount} ₽. Период: ${order.period} мес.`,
            })
        } catch (e) {
            next(e instanceof ApiError ? e : ApiError.internal(e.message))
        }
    }

    // ── П9: POST /api/subscription/pay — paymentMethod(): подтверждение оплаты ─
    // Шаги 5–9: ввод реквизитов, транзакция, фиксация, уведомление, доступ
    async paymentMethod(req, res, next) {
        try {
            const userId = req.user.id
            const {plan = 'monthly', cardNumber, expiry, cvv} = req.body

            if (!cardNumber || !expiry || !cvv) {
                return next(ApiError.badRequest('Введите данные карты: номер, срок действия и CVV'))
            }

            // Альт. сценарии 1–5 обработаны в paymentService.validateAndPay
            const result = await paymentService.validateAndPay(
                userId,
                plan,
                {cardNumber, expiry, cvv}
            )

            // Альт. сценарий 5: подтверждение не отправлено — подписка всё равно активна
            if (!result.confirmationSent) {
                result.warning = 'Подписка активирована. Подтверждение не отправлено (проверьте настройки уведомлений).'
            }

            return res.json(result)
        } catch (e) {
            next(e instanceof ApiError ? e : ApiError.internal(e.message))
        }
    }

    // ── П9 Альт. сценарий 1: POST /api/subscription/cancel — cancelPayment() ─
    async cancelPayment(req, res, next) {
        try {
            const userId = req.user.id
            const {orderId} = req.body
            const result = await paymentService.cancelPayment(userId, orderId)
            return res.json(result)
        } catch (e) {
            next(e instanceof ApiError ? e : ApiError.internal(e.message))
        }
    }

    // ── П9: GET /api/subscription/verify/:transactionId ──────────────────────
    async verifyPayment(req, res, next) {
        try {
            const {transactionId} = req.params
            const result = await paymentService.verifyPayment(transactionId)
            return res.json(result)
        } catch (e) {
            next(e instanceof ApiError ? e : ApiError.internal(e.message))
        }
    }
}

module.exports = new SubscriptionController()
