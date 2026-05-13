// Проверка активной подписки — предусловие для П6 (просмотр) и П7 (скачивание)

const {Subscription} = require('../models/models')
const {ApiError} = require('./errorHandler')

module.exports = async function checkSubscription(req, res, next) {
    try {
        const userId = req.user.id
        const sub = await Subscription.findOne({where: {userId}})

        if (!sub || !sub.isPaid) {
            return next(ApiError.forbidden('Требуется активная подписка. Оплатите подписку в разделе /subscription'))
        }

        if (new Date() > new Date(sub.endDate)) {
            // Помечаем как истёкшую
            if (sub.status !== 'expired') {
                await sub.update({status: 'expired', isPaid: false})
            }
            return next(ApiError.forbidden('Ваша подписка истекла. Оплатите новую подписку.'))
        }

        next()
    } catch (e) {
        next(ApiError.internal(e.message))
    }
}
