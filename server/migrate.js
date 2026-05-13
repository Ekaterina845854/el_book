// Скрипт миграции БД: переименование таблиц/колонок + добавление новых полей
// Запускать ОДИН раз после рефакторинга: node migrate.js

require('dotenv').config()
const {Sequelize, QueryTypes} = require('sequelize')

const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {dialect: 'postgres', host: process.env.DB_HOST, port: process.env.DB_PORT, logging: false}
)

async function tableExists(name) {
    const res = await sequelize.query(
        `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = $1)`,
        {bind: [name], type: QueryTypes.SELECT}
    )
    return res[0].exists
}

async function columnExists(table, column) {
    const res = await sequelize.query(
        `SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name=$1 AND column_name=$2)`,
        {bind: [table, column], type: QueryTypes.SELECT}
    )
    return res[0].exists
}

async function enumTypeExists(name) {
    const res = await sequelize.query(
        `SELECT EXISTS (SELECT FROM pg_type WHERE typname = $1)`,
        {bind: [name], type: QueryTypes.SELECT}
    )
    return res[0].exists
}

async function run() {
    await sequelize.authenticate()
    console.log('✅ Подключение к БД установлено\n')

    // ── 1. genres → categories ───────────────────────────────────────────────
    const genresExists = await tableExists('genres')
    const categoriesExists = await tableExists('categories')
    if (genresExists && !categoriesExists) {
        await sequelize.query('ALTER TABLE genres RENAME TO categories')
        console.log('✅ Таблица genres → categories')
    } else if (categoriesExists) {
        console.log('⏭  categories уже существует')
    }

    // ── 2. books.genreId → books.categoryId ──────────────────────────────────
    const hasGenreId = await columnExists('books', 'genreId')
    const hasCategoryId = await columnExists('books', 'categoryId')
    if (hasGenreId && !hasCategoryId) {
        await sequelize.query('ALTER TABLE books RENAME COLUMN "genreId" TO "categoryId"')
        console.log('✅ books.genreId → books.categoryId')
    } else {
        console.log('⏭  books.categoryId уже существует')
    }

    // ── 3. books: добавить поле status (ENUM) ────────────────────────────────
    const bookStatusEnumExists = await enumTypeExists('enum_books_status')
    if (!bookStatusEnumExists) {
        await sequelize.query(`CREATE TYPE "enum_books_status" AS ENUM ('active', 'deleted')`)
        console.log('✅ Создан ENUM enum_books_status')
    }
    const hasStatus = await columnExists('books', 'status')
    if (!hasStatus) {
        await sequelize.query(`ALTER TABLE books ADD COLUMN "status" "enum_books_status" DEFAULT 'active' NOT NULL`)
        console.log('✅ books.status добавлен (default: active)')
    } else {
        console.log('⏭  books.status уже существует')
    }

    // ── 4. books: добавить поле language ─────────────────────────────────────
    const hasLanguage = await columnExists('books', 'language')
    if (!hasLanguage) {
        await sequelize.query(`ALTER TABLE books ADD COLUMN "language" VARCHAR(255) DEFAULT 'ru'`)
        console.log('✅ books.language добавлен (default: ru)')
    } else {
        console.log('⏭  books.language уже существует')
    }

    // ── 5. user_books → user_libraries ────────────────────────────────────────
    const userBooksExists = await tableExists('user_books')
    const userLibrariesExists = await tableExists('user_libraries')
    if (userBooksExists && !userLibrariesExists) {
        await sequelize.query('ALTER TABLE user_books RENAME TO user_libraries')
        console.log('✅ Таблица user_books → user_libraries')
    } else if (userLibrariesExists) {
        console.log('⏭  user_libraries уже существует')
    }

    // ── 6. user_libraries: добавить lastPage ─────────────────────────────────
    const hasLastPage = await columnExists('user_libraries', 'lastPage')
    if (!hasLastPage) {
        await sequelize.query(`ALTER TABLE user_libraries ADD COLUMN "lastPage" INTEGER DEFAULT NULL`)
        console.log('✅ user_libraries.lastPage добавлен')
    } else {
        console.log('⏭  user_libraries.lastPage уже существует')
    }

    // ── 7. user_libraries: добавить readStatus (ENUM) ─────────────────────────
    const readStatusEnumExists = await enumTypeExists('enum_user_libraries_readstatus')
    if (!readStatusEnumExists) {
        await sequelize.query(
            `CREATE TYPE "enum_user_libraries_readstatus" AS ENUM ('not_started', 'in_progress', 'finished')`
        )
        console.log('✅ Создан ENUM enum_user_libraries_readstatus')
    }
    const hasReadStatus = await columnExists('user_libraries', 'readStatus')
    if (!hasReadStatus) {
        await sequelize.query(
            `ALTER TABLE user_libraries ADD COLUMN "readStatus" "enum_user_libraries_readstatus" DEFAULT 'not_started'`
        )
        console.log('✅ user_libraries.readStatus добавлен')
    } else {
        console.log('⏭  user_libraries.readStatus уже существует')
    }

    // ── 8. user_libraries: добавить downloaded ────────────────────────────────
    const hasDownloaded = await columnExists('user_libraries', 'downloaded')
    if (!hasDownloaded) {
        await sequelize.query(`ALTER TABLE user_libraries ADD COLUMN "downloaded" BOOLEAN DEFAULT false`)
        console.log('✅ user_libraries.downloaded добавлен')
    } else {
        console.log('⏭  user_libraries.downloaded уже существует')
    }

    // ── 9. user_libraries: добавить addedAt ───────────────────────────────────
    const hasAddedAt = await columnExists('user_libraries', 'addedAt')
    if (!hasAddedAt) {
        await sequelize.query(
            `ALTER TABLE user_libraries ADD COLUMN "addedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()`
        )
        console.log('✅ user_libraries.addedAt добавлен')
    } else {
        console.log('⏭  user_libraries.addedAt уже существует')
    }

    // ── 10. ratings: добавить поле title ──────────────────────────────────────
    const hasRatingTitle = await columnExists('ratings', 'title')
    if (!hasRatingTitle) {
        await sequelize.query(`ALTER TABLE ratings ADD COLUMN "title" VARCHAR(255) DEFAULT NULL`)
        console.log('✅ ratings.title добавлен')
    } else {
        console.log('⏭  ratings.title уже существует')
    }

    // ── 11. subscriptions: добавить поле status (ENUM) ───────────────────────
    const subStatusEnumExists = await enumTypeExists('enum_subscriptions_status')
    if (!subStatusEnumExists) {
        await sequelize.query(
            `CREATE TYPE "enum_subscriptions_status" AS ENUM ('active', 'expired', 'cancelled')`
        )
        console.log('✅ Создан ENUM enum_subscriptions_status')
    }
    const hasSubStatus = await columnExists('subscriptions', 'status')
    if (!hasSubStatus) {
        await sequelize.query(
            `ALTER TABLE subscriptions ADD COLUMN "status" "enum_subscriptions_status" DEFAULT 'active'`
        )
        console.log('✅ subscriptions.status добавлен')
    } else {
        console.log('⏭  subscriptions.status уже существует')
    }

    // ── 12. users: добавить поле login ────────────────────────────────────────
    const hasLogin = await columnExists('users', 'login')
    if (!hasLogin) {
        await sequelize.query(`ALTER TABLE users ADD COLUMN "login" VARCHAR(255) UNIQUE DEFAULT NULL`)
        // Заполнить login = email для существующих записей
        await sequelize.query(`UPDATE users SET "login" = "email" WHERE "login" IS NULL`)
        console.log('✅ users.login добавлен и заполнен из email')
    } else {
        console.log('⏭  users.login уже существует')
    }

    // ── 13. users: добавить поле tariffPlan ──────────────────────────────────
    const hasTariffPlan = await columnExists('users', 'tariffPlan')
    if (!hasTariffPlan) {
        await sequelize.query(`ALTER TABLE users ADD COLUMN "tariffPlan" VARCHAR(255) DEFAULT NULL`)
        console.log('✅ users.tariffPlan добавлен')
    } else {
        console.log('⏭  users.tariffPlan уже существует')
    }

    // ── 14. Создать таблицу payments (если нет) ───────────────────────────────
    const paymentsExists = await tableExists('payments')
    if (!paymentsExists) {
        const paymentStatusEnumExists = await enumTypeExists('enum_payments_status')
        if (!paymentStatusEnumExists) {
            await sequelize.query(
                `CREATE TYPE "enum_payments_status" AS ENUM ('pending', 'success', 'failed', 'cancelled')`
            )
        }
        await sequelize.query(`
            CREATE TABLE payments (
                "id"             SERIAL PRIMARY KEY,
                "userId"         INTEGER REFERENCES users(id) ON DELETE SET NULL,
                "subscriptionId" INTEGER REFERENCES subscriptions(id) ON DELETE SET NULL,
                "amount"         FLOAT NOT NULL,
                "method"         VARCHAR(255) NOT NULL,
                "status"         "enum_payments_status" DEFAULT 'pending',
                "transactionId"  VARCHAR(255),
                "plan"           VARCHAR(255),
                "period"         INTEGER,
                "createdAt"      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                "updatedAt"      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )
        `)
        console.log('✅ Таблица payments создана')
    } else {
        console.log('⏭  payments уже существует')
    }

    console.log('\n🎉 Миграция завершена успешно!')
    process.exit(0)
}

run().catch(e => {
    console.error('\n❌ Ошибка миграции:', e.message)
    console.error(e)
    process.exit(1)
})
