const Router = require('express').Router
const router = new Router()
const subscriptionController = require('../controllers/subscriptionController')
const authMiddleware = require('../middleware/authMiddleware')

// П9: получить статус подписки
router.get('/', authMiddleware, subscriptionController.getSubscription)

// П9: создать заказ (шаги 2–4: детали + URL защищённой страницы)
router.post('/order', authMiddleware, subscriptionController.makePayment)

// П9: оплатить (шаги 5–9: ввод карты, транзакция, подписка, уведомление)
router.post('/pay', authMiddleware, subscriptionController.paymentMethod)

// П9 Альт. сц. 1: отменить оплату
router.post('/cancel', authMiddleware, subscriptionController.cancelPayment)

// П9: верифицировать транзакцию
router.get('/verify/:transactionId', authMiddleware, subscriptionController.verifyPayment)

module.exports = router
