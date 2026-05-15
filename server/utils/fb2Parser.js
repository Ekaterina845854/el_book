const { XMLParser } = require('fast-xml-parser')

// 🛡 Надежный сборщик текста из любого узла FB2 (рекурсивный, без [] и мусора)
function extractText(node) {
    if (!node) return ''
    if (typeof node === 'string') return node.trim()
    if (Array.isArray(node)) return node.map(extractText).filter(Boolean).join(' ')
    if (node['#text']) return node['#text'].trim()

    let text = ''
    for (const key of Object.keys(node)) {
        if (key.startsWith('@_')) continue // пропускаем XML-атрибуты
        const child = extractText(node[key])
        if (child) text = text ? text + ' ' + child : child
    }
    return text.trim()
}

module.exports = function parseFB2(fb2Content, page = 1) {
    try {
        const parser = new XMLParser({
            ignoreAttributes: false,
            attributeNamePrefix: '@_',
            parseAttributeValue: true,
            trimValues: true,
            textNodeName: '#text',
            // Не форсируем массивы в конфиге — обрабатываем их вручную для совместимости
        })

        const doc = parser.parse(fb2Content)
        const bodies = doc?.FictionBook?.body
        if (!bodies) return { pages: ['<p>Содержимое книги не найдено</p>'], totalPages: 1, currentPage: 1, content: '' }

        const blocks = []
        const bodyArray = Array.isArray(bodies) ? bodies : [bodies]

        for (const body of bodyArray) {
            const sections = Array.isArray(body?.section) ? body.section : (body?.section ? [body.section] : [])

            for (const section of sections) {
                // 1. Заголовок
                if (section?.title) {
                    const t = extractText(section.title)
                    if (t && t.length > 2) blocks.push({ type: 'h2', content: t })
                }

                // 2. Пустая строка-разделитель
                if (section?.['empty-line']) blocks.push({ type: 'br', content: '' })

                // 3. Абзацы (основной текст)
                if (section?.p) {
                    const paragraphs = Array.isArray(section.p) ? section.p : [section.p]
                    for (const p of paragraphs) {
                        const txt = extractText(p)
                        // Фильтр: убираем пустые строки, одинокие сноски [], слишком короткие обрывки
                        if (txt && txt.length > 5 && !/^\[.*\]$/.test(txt)) {
                            blocks.push({ type: 'p', content: txt.replace(/\n+/g, '<br/>') })
                        }
                    }
                }

                // 4. Эпиграфы / цитаты
                if (section?.epigraph) {
                    const epiArr = Array.isArray(section.epigraph) ? section.epigraph : [section.epigraph]
                    for (const epi of epiArr) {
                        const txt = extractText(epi.text || epi)
                        if (txt && txt.length > 5) blocks.push({ type: 'blockquote', content: txt })
                    }
                }

                // 5. Вложенные секции (главы/подзаголовки)
                if (section?.section) {
                    const subArr = Array.isArray(section.section) ? section.section : [section.section]
                    for (const sub of subArr) {
                        if (sub.title) {
                            const t = extractText(sub.title)
                            if (t) blocks.push({ type: 'h3', content: t })
                        }
                        if (sub.p) {
                            const ps = Array.isArray(sub.p) ? sub.p : [sub.p]
                            for (const p of ps) {
                                const txt = extractText(p)
                                if (txt && txt.length > 5 && !/^\[.*\]$/.test(txt)) {
                                    blocks.push({ type: 'p', content: txt.replace(/\n+/g, '<br/>') })
                                }
                            }
                        }
                    }
                }
            }
        }

        if (blocks.length === 0) {
            return { pages: ['<p>Текст книги не распознан</p>'], totalPages: 1, currentPage: 1, content: '' }
        }

        // 📖 Умная пагинация: режем ТОЛЬКО между целыми блоками. Слова и абзацы НЕ рвутся.
        const pages = []
        let currentBlocks = []
        let currentLen = 0
        const MAX_CHARS_PER_PAGE = 2800

        for (const block of blocks) {
            const html = block.type === 'br' ? '<br/>' : `<${block.type}>${block.content}</${block.type}>`
            const len = html.length

            // Если страница не пуста + новый блок не влезает → закрываем текущую
            if (currentLen > 0 && currentLen + len > MAX_CHARS_PER_PAGE) {
                pages.push(currentBlocks.join(''))
                currentBlocks = []
                currentLen = 0
            }
            currentBlocks.push(html)
            currentLen += len
        }
        if (currentBlocks.length > 0) pages.push(currentBlocks.join(''))
        if (pages.length === 0) pages.push('<p>Ошибка сборки страниц</p>')

        const safePage = Math.max(1, Math.min(page, pages.length))

        return {
            pages,
            totalPages: pages.length,
            currentPage: safePage,
            content: pages[safePage - 1]
        }
    } catch (e) {
        console.error('[fb2Parser] Критическая ошибка:', e.message, e.stack)
        return { pages: [`<p>Ошибка загрузки книги: ${e.message}</p>`], totalPages: 1, currentPage: 1, content: '' }
    }
}
