const jwt = require('jsonwebtoken')
const {ApiError} = require('./errorHandler')

module.exports = function (req, res, next) {
    if (req.method === 'OPTIONS') return next()
    try {
        const token = req.headers.authorization?.split(' ')[1]
        if (!token) return next(ApiError.unauthorized('Not authorized'))
        req.user = jwt.verify(token, process.env.JWT_SECRET)
        next()
    } catch (e) {
        return next(ApiError.unauthorized('Not authorized'))
    }
}
