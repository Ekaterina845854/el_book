// П1 — AuthService (служебный класс из диаграммы последовательностей)
// hashPassword(), verifyPassword(), generateJWT(), validateJWT()

const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const {User} = require('../models/models')
const {ApiError} = require('../middleware/errorHandler')

const SALT_ROUNDS = 5
const JWT_EXPIRES = '24h'

class AuthService {
    // ── П1 Успешный сценарий: шаг hashPassword(password) ────────────────────
    async hashPassword(password) {
        return bcrypt.hash(password, SALT_ROUNDS)
    }

    // ── П1 Успешный сценарий: шаг findUserByLogin(login) ────────────────────
    async findUserByLogin(login) {
        // login в системе — это email; поддерживаем оба поля
        return User.findOne({where: {email: login}})
    }

    // ── П1 Успешный сценарий: шаг verifyPassword(inputHash, storedHash) ─────
    async verifyPassword(inputPassword, storedHash) {
        return bcrypt.compare(inputPassword, storedHash)
    }

    // ── П1 Успешный сценарий: шаг generateJWT(userId, role) ─────────────────
    generateJWT(userId, email, role) {
        return jwt.sign({id: userId, email, role}, process.env.JWT_SECRET, {
            expiresIn: JWT_EXPIRES,
        })
    }

    // ── П1 — validateJWT (используется в authMiddleware) ─────────────────────
    validateJWT(token) {
        return jwt.verify(token, process.env.JWT_SECRET)
    }

    // ── П1 Успешный сценарий: полный flow enterDataForAuthorization ───────────
    // Возвращает { token } | выбрасывает ApiError
    async enterDataForAuthorization(login, password) {
        // Альт. сценарий 1: некорректные данные — пользователь не найден
        const user = await this.findUserByLogin(login)
        if (!user) {
            throw ApiError.unauthorized('Некорректные данные. Пользователь не найден')
        }

        // Альт. сценарий 1: неверный пароль
        const passwordValid = await this.verifyPassword(password, user.password)
        if (!passwordValid) {
            throw ApiError.unauthorized('Некорректные данные. Неверный пароль')
        }

        // Успешный сценарий: generateJWT + отображение учётной записи
        const token = this.generateJWT(user.id, user.email, user.role)
        return {token, user: {id: user.id, email: user.email, role: user.role}}
    }

    // ── Регистрация нового пользователя ───────────────────────────────────────
    async registerUser(email, password, phone) {
        const candidate = await User.findOne({where: {email}})
        if (candidate) {
            throw ApiError.badRequest('Пользователь с таким email уже существует')
        }
        const hashedPassword = await this.hashPassword(password)
        const user = await User.create({
            email,
            login: email,
            password: hashedPassword,
            role: 'USER',
            phone: phone || null,
        })
        const token = this.generateJWT(user.id, user.email, user.role)
        return {token, user: {id: user.id, email: user.email, role: user.role}}
    }
}

module.exports = new AuthService()
