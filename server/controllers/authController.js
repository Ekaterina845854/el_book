// П1 — AuthController
// Тонкий контроллер: только приём/ответ HTTP, вся логика в authService

const authService = require('../services/authService')
const {ApiError} = require('../middleware/errorHandler')

class AuthController {
    // ── П1 Успешный сценарий: POST /api/auth/login ────────────────────────────
    // enterDataForAuthorization(login, password)
    async login(req, res, next) {
        try {
            const {email, password} = req.body
            if (!email || !password) {
                return next(ApiError.badRequest('Email и пароль обязательны'))
            }
            // authService реализует все ветки П1 (успех + альт. сценарии 1, 2)
            const result = await authService.enterDataForAuthorization(email, password)
            return res.json(result)
        } catch (e) {
            next(e instanceof ApiError ? e : ApiError.internal(e.message))
        }
    }

    // ── Регистрация: POST /api/auth/register ──────────────────────────────────
    async register(req, res, next) {
        try {
            const {email, password, phone} = req.body
            if (!email || !password) {
                return next(ApiError.badRequest('Email и пароль обязательны'))
            }
            const result = await authService.registerUser(email, password, phone)
            return res.status(201).json(result)
        } catch (e) {
            next(e instanceof ApiError ? e : ApiError.internal(e.message))
        }
    }

    // ── Проверка токена: GET /api/auth/check ──────────────────────────────────
    async check(req, res, next) {
        try {
            const token = authService.generateJWT(req.user.id, req.user.email, req.user.role)
            return res.json({token, user: {id: req.user.id, email: req.user.email, role: req.user.role}})
        } catch (e) {
            next(ApiError.internal(e.message))
        }
    }
}

module.exports = new AuthController()
