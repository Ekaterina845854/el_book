const sequelize = require('../db')
const {DataTypes} = require('sequelize')

// П1 — актор User/Admin (роль определяет RBAC)
const User = sequelize.define('user', {
    id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
    login: {type: DataTypes.STRING, unique: true},          // login = email, псевдоним для TZ-совместимости
    email: {type: DataTypes.STRING, unique: true, allowNull: false},
    password: {type: DataTypes.STRING, allowNull: false},
    role: {type: DataTypes.STRING, defaultValue: 'USER'},   // USER | ADMIN
    phone: {type: DataTypes.STRING},
    tariffPlan: {type: DataTypes.STRING, defaultValue: null}, // активный план подписки
})

// П2 — Catalog содержит Category (в ТЗ: категории каталога)
const Category = sequelize.define('category', {
    id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
    name: {type: DataTypes.STRING, unique: true, allowNull: false},
})

// П2/П3/П10 — Book (диаграмма концептуальных классов)
const Book = sequelize.define('book', {
    id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
    title: {type: DataTypes.STRING, unique: true, allowNull: false},
    author: {type: DataTypes.STRING, allowNull: false},
    year: {type: DataTypes.INTEGER},
    ISBN: {type: DataTypes.STRING},
    pages: {type: DataTypes.INTEGER},
    language: {type: DataTypes.STRING, defaultValue: 'ru'}, // П10: поле язык
    annotation: {type: DataTypes.TEXT},
    coverUrl: {type: DataTypes.STRING},
    textUrl: {type: DataTypes.STRING},
    text: {type: DataTypes.TEXT},
    fb2Path: {type: DataTypes.STRING},
    docxPath: {type: DataTypes.STRING},
    pdfPath: {type: DataTypes.STRING},
    txtPath: {type: DataTypes.STRING},
    rating: {type: DataTypes.FLOAT, defaultValue: 0},
    // П4/П5: мягкое удаление — альтернативный сценарий «книга удалена из каталога»
    status: {type: DataTypes.ENUM('active', 'deleted'), defaultValue: 'active'},
})

// П4/П5/П6/П7 — UserLibrary (ТЗ: UserLibrary с listBooks, addBook, showUserLibrary)
const UserLibrary = sequelize.define('user_library', {
    id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
    userId: {type: DataTypes.INTEGER, allowNull: false},
    bookId: {type: DataTypes.INTEGER, allowNull: false},
    // П6: lastPage — открытие на последней странице
    lastPage: {type: DataTypes.INTEGER, defaultValue: null},
    // П8: readStatus — проверка «прочитана ли книга» перед оценкой
    readStatus: {
        type: DataTypes.ENUM('not_started', 'in_progress', 'finished'),
        defaultValue: 'not_started',
    },
    // П7: downloaded — статус скачивания книги
    downloaded: {type: DataTypes.BOOLEAN, defaultValue: false},
    addedAt: {type: DataTypes.DATE, defaultValue: DataTypes.NOW},
})

// П8 — Rating (ТЗ: title, score, comment, ratingBook())
const Rating = sequelize.define('rating', {
    id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
    title: {type: DataTypes.STRING},                        // заголовок впечатления (опционально)
    score: {type: DataTypes.INTEGER, allowNull: false},     // 1–5 звёзд
    comment: {type: DataTypes.TEXT},                        // текстовое впечатление
})

// П9 — Subscription (ТЗ: period, id, payment(), patmentData())
const Subscription = sequelize.define('subscription', {
    id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
    plan: {type: DataTypes.STRING, defaultValue: 'monthly'}, // monthly | yearly
    isPaid: {type: DataTypes.BOOLEAN, defaultValue: false},
    startDate: {type: DataTypes.DATE},
    endDate: {type: DataTypes.DATE},
    status: {
        type: DataTypes.ENUM('active', 'expired', 'cancelled'),
        defaultValue: 'active',
    },
})

// П9 — Payment (диаграмма программных классов: PaymentGateway фиксирует транзакции)
const Payment = sequelize.define('payment', {
    id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
    amount: {type: DataTypes.FLOAT, allowNull: false},
    method: {type: DataTypes.STRING, allowNull: false},     // card | etc.
    status: {
        type: DataTypes.ENUM('pending', 'success', 'failed', 'cancelled'),
        defaultValue: 'pending',
    },
    transactionId: {type: DataTypes.STRING},
    plan: {type: DataTypes.STRING},
    period: {type: DataTypes.INTEGER},                      // месяцев
})

// ── Ассоциации ──────────────────────────────────────────────────────────────

Category.hasMany(Book, {foreignKey: 'categoryId'})
Book.belongsTo(Category, {foreignKey: 'categoryId'})

User.hasMany(UserLibrary, {foreignKey: 'userId'})
UserLibrary.belongsTo(User, {foreignKey: 'userId'})

Book.hasMany(UserLibrary, {foreignKey: 'bookId'})
UserLibrary.belongsTo(Book, {foreignKey: 'bookId'})

User.hasMany(Rating, {foreignKey: 'userId'})
Rating.belongsTo(User, {foreignKey: 'userId'})

Book.hasMany(Rating, {foreignKey: 'bookId'})
Rating.belongsTo(Book, {foreignKey: 'bookId'})

User.hasOne(Subscription, {foreignKey: 'userId'})
Subscription.belongsTo(User, {foreignKey: 'userId'})

User.hasMany(Payment, {foreignKey: 'userId'})
Payment.belongsTo(User, {foreignKey: 'userId'})

Subscription.hasMany(Payment, {foreignKey: 'subscriptionId'})
Payment.belongsTo(Subscription, {foreignKey: 'subscriptionId'})

module.exports = {User, Category, Book, UserLibrary, Rating, Subscription, Payment}
