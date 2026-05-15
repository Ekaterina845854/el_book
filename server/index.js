require('dotenv').config()
const path = require('path')
const express = require('express')
const cors = require('cors')
const multer = require('multer')
const sequelize = require('./db')
require('./models/models')
const router = require('./routes')
const {errorHandlingMiddleware, ApiError} = require('./middleware/errorHandler')

const PORT = process.env.PORT || 5000
const app = express()

app.use(cors())



// Пропускаем multipart запросы мимо express.json()
app.use((req, res, next) => {
    if (req.is('multipart/form-data')) {
        return next()
    }
    next()
})
// 🔒 Rate-limit: защита от перебора паролей
const rateLimit = require('express-rate-limit')

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,      // 15 минут
  max: 5,                        // максимум 5 попыток за окно
  message: { error: 'Слишком много попыток входа. Попробуйте через 15 минут.' },
  standardHeaders: true,         // вернёт заголовок Retry-After
  legacyHeaders: false,          // отключит старые X-RateLimit-*
})

app.use('/api/auth/login', loginLimiter)

app.use(express.json())
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))
app.use('/api', router)

// Глобальная обработка ошибок (включая multer)
app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        console.error('Multer error:', err)
        return res.status(400).json({message: err.message})
    }
    if (err && err.type === 'entity.parse.failed') {
        console.error('JSON parse error:', err)
        return res.status(400).json({message: 'Invalid JSON'})
    }
    console.error('Unhandled error:', err)
    return res.status(500).json({message: err.message || 'Internal server error'})
})

app.use(errorHandlingMiddleware)

async function start() {
    try {
        await sequelize.authenticate()
        await sequelize.sync({alter: true})
        app.listen(PORT, () => console.log(`Server started on port ${PORT}`))
    } catch (e) {
        console.log(e)
    }
}

if (require.main === module) {
    start()
}

module.exports = {app, sequelize}
