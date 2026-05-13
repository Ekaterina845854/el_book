// П9 — Контракты подсистемы оплаты (PaymentSubsystem)
// PaymentGateway — внешняя система

/**
 * @typedef {Object} CreateOrderRequest
 * @property {number} userId
 * @property {string} tariffPlan — 'monthly' | 'yearly'
 */

/**
 * @typedef {Object} OrderDetails
 * @property {string} orderId
 * @property {number} amount — сумма в рублях
 * @property {number} period — месяцев
 * @property {string} plan
 * @property {string} currency — 'RUB'
 */

/**
 * @typedef {Object} ProcessPaymentRequest
 * @property {number} userId
 * @property {string} orderId
 * @property {string} method — 'card'
 */

/**
 * @typedef {Object} PaymentResult
 * @property {boolean} success
 * @property {string} transactionId
 * @property {string} status — 'success' | 'failed' | 'cancelled'
 * @property {string} [reason] — причина отказа
 */

// Тарифные планы (цены в рублях)
const TARIFF_PLANS = {
    monthly: {amount: 500, period: 1, label: 'Месячная подписка'},
    yearly: {amount: 4500, period: 12, label: 'Годовая подписка'},
}

// Коды ошибок платежа — Альт. сценарии П9
const PAYMENT_ERROR_CODES = {
    CANCELLED: 'PAYMENT_CANCELLED',           // Альт. 1: пользователь отменил
    INVALID_CARD_DATA: 'INVALID_CARD_DATA',   // Альт. 2: неверные данные
    BANK_DECLINED: 'BANK_DECLINED',           // Альт. 3: отклонён банком
    INSUFFICIENT_FUNDS: 'INSUFFICIENT_FUNDS', // Альт. 4: недостаточно средств
    EMAIL_FAILED: 'EMAIL_FAILED',             // Альт. 5: подтверждение не отправлено
}

module.exports = {TARIFF_PLANS, PAYMENT_ERROR_CODES}
