// server/utils/fb2Parser.js
const { XMLParser } = require('fast-xml-parser');

/**
 * Парсит FB2 XML в массив HTML-страниц
 * @param {string} fb2Raw - сырой текст FB2 файла
 * @param {number} maxChars - примерный лимит символов на страницу
 * @returns {{ title: string, pages: string[] }}
 */
function parseFb2(fb2Raw, maxChars = 1500) {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    textNodeName: '#text',
    parseAttributeValue: true,
    trimValues: true,
    allowBooleanAttributes: true,
    parseTagValue: true,
    removeNSPrefix: true,
    ignoreDeclaration: true,
    ignorePiTags: true,
    // 🔒 Безопасность: отключаем внешние сущности (XXE)
    processEntities: false,
    externalEntities: {}
  });

  const doc = parser.parse(fb2Raw);
  const body = doc?.FictionBook?.body;
  if (!body) return { title: 'Неизвестная книга', pages: ['<p>Ошибка парсинга: тело книги не найдено</p>'] };

  const title = doc?.FictionBook?.description?.titleInfo?.bookTitle || 'Без названия';

  // 1. Рекурсивно собираем блоки текста, сохраняя HTML-теги
  const blocks = [];
  function collectBlocks(node) {
    if (!node) return;
    if (typeof node === 'string' || typeof node === 'number') {
      const text = String(node).trim();
      if (text) blocks.push(text);
      return;
    }

    const tag = node['#name'] || 'span';
    const attrs = Object.entries(node)
      .filter(([k]) => k.startsWith('@_'))
      .map(([k, v]) => `${k.slice(2)}="${v}"`)
      .join(' ');
    const attrStr = attrs ? ` ${attrs}` : '';

    // Пропускаем обёртки section, но заходим внутрь
    if (tag === 'section') {
      const children = Object.entries(node)
        .filter(([k]) => !k.startsWith('@_') && k !== '#text')
        .flatMap(([_, v]) => (Array.isArray(v) ? v : [v]));
      children.forEach(collectBlocks);
      return;
    }

    // Сохраняем семантические теги
    if (['p', 'subtitle', 'poem', 'stanza', 'text-author', 'empty-line'].includes(tag)) {
      if (tag === 'empty-line') {
        blocks.push('<br>');
        return;
      }
      const inner = Object.entries(node)
        .filter(([k]) => !k.startsWith('@_') && k !== '#text')
        .flatMap(([_, v]) => (Array.isArray(v) ? v : [v]))
        .map(n => {
          if (typeof n === 'string') return n;
          if (n['#name']) return `<${n['#name']}>${n['#text'] || ''}</${n['#name']}>`;
          return n;
        })
        .join('');
      blocks.push(`<${tag}${attrStr}>${inner}</${tag}>`);
      return;
    }

    // Рекурсия для остальных тегов
    const children = Object.entries(node)
      .filter(([k]) => !k.startsWith('@_') && k !== '#text')
      .flatMap(([_, v]) => (Array.isArray(v) ? v : [v]));
    children.forEach(collectBlocks);
  }

  if (body.section) {
    (Array.isArray(body.section) ? body.section : [body.section]).forEach(collectBlocks);
  } else {
    collectBlocks(body);
  }

  if (blocks.length === 0) return { title, pages: ['<p>Текст книги пуст</p>'] };

  // 2. Умная пагинация: не режем слова и HTML-теги
  const pages = [];
  let currentPage = '';
  let currentLen = 0;

  for (const block of blocks) {
    // Если блок - тег переноса, просто добавляем
    if (block === '<br>') {
      if (currentLen > 0) {
        currentPage += '<br>';
        currentLen += 4;
      }
      continue;
    }

    // Если один абзац длиннее лимита, режем его по словам
    if (block.length > maxChars) {
      if (currentPage.length > 0) {
        pages.push(currentPage);
        currentPage = '';
        currentLen = 0;
      }
      const words = block.replace(/<\/?[^>]+>/g, ' ').split(/\s+/).filter(Boolean);
      let tempPage = '';
      let tempLen = 0;
      for (const word of words) {
        if (tempLen + word.length > maxChars && tempPage.length > 0) {
          pages.push(`<p>${tempPage.trim()}</p>`);
          tempPage = '';
          tempLen = 0;
        }
        tempPage += (tempPage ? ' ' : '') + word;
        tempLen += word.length + 1;
      }
      if (tempPage) currentPage = `<p>${tempPage.trim()}</p>`;
    } else {
      // Стандартный абзац помещается целиком
      if (currentLen + block.length > maxChars && currentPage.length > 0) {
        pages.push(currentPage);
        currentPage = '';
        currentLen = 0;
      }
      currentPage += (currentPage ? '\n' : '') + block;
      currentLen += block.length;
    }
  }
  if (currentPage) pages.push(currentPage);

  return { title, pages: pages.length ? pages : ['<p>Текст пуст</p>'] };
}

module.exports = { parseFb2 };
