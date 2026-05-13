// П6 — Контракт подсистемы просмотра книг в браузере (BookViewerService)
// Определяет входные/выходные DTO для изолированного модуля

/**
 * @typedef {Object} OpenBookRequest
 * @property {number} userId
 * @property {number} bookId
 * @property {number|null} pageNumber — null = открыть на последней странице
 */

/**
 * @typedef {Object} OpenBookResponse
 * @property {number} bookId
 * @property {string} title
 * @property {string} pageContent — текст страницы
 * @property {number} currentPage
 * @property {number|null} totalPages
 * @property {boolean} isFirstOpen — true, если книга открывается впервые
 */

/**
 * @typedef {Object} SaveProgressRequest
 * @property {number} userId
 * @property {number} bookId
 * @property {number} pageNumber
 */

/**
 * @typedef {Object} DownloadBookRequest
 * @property {number} userId
 * @property {number} bookId
 * @property {string} format — 'fb2' | 'pdf' | 'docx' | 'txt' | 'text'
 */

/**
 * @typedef {Object} DownloadBookResponse
 * @property {string} filePath
 * @property {string} fileName
 * @property {number} fileSize — байты
 * @property {string} mimeType
 */

const CHARS_PER_PAGE = 3000  // условный размер «страницы» для текстовых книг

module.exports = {CHARS_PER_PAGE}
