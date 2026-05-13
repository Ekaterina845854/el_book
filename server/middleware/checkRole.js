const jwt = require('jsonwebtoken')
const {ApiError} = require('./errorHandler')

module.exports = function (role) {
    return function (req, res, next) {
        if (req.method === 'OPTIONS') return next()
        try {
            const token = req.headers.authorization?.split(' ')[1]
            if (!token) return next(ApiError.unauthorized('Not authorized'))
            const decoded = jwt.verify(token, process.env.JWT_SECRET)
            if (decoded.role !== role) return next(ApiError.forbidden('No access'))
            req.user = decoded
            next()
        } catch (e) {
            return next(ApiError.forbidden('No access'))
        }
    }
}
