const Router = require('express').Router
const router = new Router()
const authController = require('../controllers/authController')
const authMiddleware = require('../middleware/authMiddleware')

router.post('/register', authController.register)
router.post('/login', authController.login)
router.get('/check', authMiddleware, authController.check)

module.exports = router
