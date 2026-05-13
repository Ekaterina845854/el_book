require('dotenv').config()
const bcrypt = require('bcrypt')
const sequelize = require('./db')
require('./models/models')
const {User, Category, Book} = require('./models/models')

async function seed() {
    await sequelize.authenticate()
    await sequelize.sync({alter: true})

    // Администратор
    const hash = await bcrypt.hash('admin123', 5)
    const [admin, adminCreated] = await User.findOrCreate({
        where: {email: 'admin@library.ru'},
        defaults: {email: 'admin@library.ru', login: 'admin@library.ru', password: hash, role: 'ADMIN'},
    })
    console.log(adminCreated ? 'Создан администратор' : 'Администратор уже существует', '—', admin.email)

    // Тестовый пользователь
    const userHash = await bcrypt.hash('user123', 5)
    const [testUser, userCreated] = await User.findOrCreate({
        where: {email: 'user@library.ru'},
        defaults: {email: 'user@library.ru', login: 'user@library.ru', password: userHash, role: 'USER'},
    })
    console.log(userCreated ? 'Создан пользователь' : 'Пользователь уже существует', '—', testUser.email)

    // Категории (П2: категории каталога)
    const categoryNames = [ 'Роман', 'Детектив', 'Фантастика', 'Фэнтези',
  'Поэзия', 'Драма', 'Приключения', 'Научная литература',
  'История', 'Биография']
    const categories = {}
    for (const name of categoryNames) {
        const [cat] = await Category.findOrCreate({where: {name}})
        categories[name] = cat
    }
    console.log('Категории:', categoryNames.join(', '))

    // Книги (П2/П3: каталог с описанием)
    const books = [
        {
            title: 'Преступление и наказание',
            author: 'Фёдор Достоевский',
            year: 1866,
            pages: 574,
            ISBN: '978-5-04-116640-5',
            language: 'ru',
            categoryId: categories['Классика'].id,
            annotation: 'Психологический роман о студенте Родионе Раскольникове, совершившем убийство ради проверки собственной теории.',
            status: 'active',
        },
        {
            title: 'Мастер и Маргарита',
            author: 'Михаил Булгаков',
            year: 1967,
            pages: 480,
            ISBN: '978-5-17-090000-2',
            language: 'ru',
            categoryId: categories['Роман'].id,
            annotation: 'Роман о визите дьявола в советскую Москву 1930-х годов.',
            status: 'active',
        },
        {
            title: '1984',
            author: 'Джордж Оруэлл',
            year: 1949,
            pages: 328,
            ISBN: '978-5-17-116700-1',
            language: 'ru',
            categoryId: categories['Фантастика'].id,
            annotation: 'Антиутопический роман о тоталитарном обществе, где Большой Брат следит за каждым шагом граждан.',
            status: 'active',
        },
        {
            title: 'Убийство в «Восточном экспрессе»',
            author: 'Агата Кристи',
            year: 1934,
            pages: 256,
            ISBN: '978-5-04-099284-7',
            language: 'ru',
            categoryId: categories['Детектив'].id,
            annotation: 'Знаменитый сыщик Эркюль Пуаро расследует убийство в застрявшем в снегах поезде.',
            status: 'active',
        },
        {
            title: 'Анна Каренина',
            author: 'Лев Толстой',
            year: 1878,
            pages: 864,
            ISBN: '978-5-04-116800-3',
            language: 'ru',
            categoryId: categories['Классика'].id,
            annotation: 'Роман о трагической судьбе замужней аристократки Анны Карениной.',
            status: 'active',
        },
    ]

    for (const bookData of books) {
        const [book, bookCreated] = await Book.findOrCreate({
            where: {title: bookData.title},
            defaults: bookData,
        })
        console.log(`${bookCreated ? 'Добавлена' : 'Уже есть'}: «${book.title}»`)
    }

    console.log('\n✅ Готово!')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('Администратор: admin@library.ru / admin123')
    console.log('Пользователь:  user@library.ru  / user123')
    console.log('API базовый URL: http://localhost:5000/api')
    process.exit(0)
}

seed().catch(e => {
    console.error('Ошибка seed:', e.message)
    process.exit(1)
})
