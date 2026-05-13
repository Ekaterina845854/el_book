const Router = require('express').Router
const router = new Router()

// П1 — Авторизоваться в системе
router.use('/auth', require('./authRouter'))

// П2, П3 — Просмотреть каталог / Найти книгу в поисковой строке
router.use('/catalog', require('./catalogRouter'))

// П4, П5 — Добавить книгу в свою библиотеку / Просмотреть свою библиотеку
router.use('/library', require('./userLibraryRouter'))

// П6, П7 — Открыть книгу для просмотра / Скачать книгу (подсистема просмотра)
router.use('/viewer', require('./bookViewerRouter'))

// П8 — Оценить книгу
router.use('/rating', require('./ratingRouter'))

// П9 — Оплатить подписку (подсистема оплаты)
router.use('/subscription', require('./subscriptionRouter'))

// П10 — Пополнить общую библиотеку (только Администратор)
router.use('/admin', require('./adminRouter'))

module.exports = router
