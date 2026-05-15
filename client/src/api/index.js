const BASE_URL = '/api'

function getToken() {
  return localStorage.getItem('token')
}

async function request(path, options = {}) {
  const token = getToken()
  const headers = { 'Content-Type': 'application/json', ...options.headers }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers })

  // Защита от HTML-ответов (404-страница nginx вместо JSON)
  const contentType = res.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) {
    throw new Error(`Ошибка сервера (${res.status}): эндпоинт не найден`)
  }

  const data = await res.json()
  if (res.status === 429) {
    const retryAfter = res.headers.get('Retry-After')
    const minutes = retryAfter ? Math.round(parseInt(retryAfter) / 60) : 15
    throw new Error(`Слишком много попыток. Попробуйте через ${minutes} мин.`)
  }
  
  if (!res.ok) throw new Error(data.message || 'Ошибка запроса')
  return data
}

async function requestForm(path, method, formData) {
  const token = getToken()
  const headers = {}
  if (token) headers['Authorization'] = `Bearer ${token}`
  // Не устанавливаем Content-Type для FormData — браузер сделает это сам с boundary

  const res = await fetch(`${BASE_URL}${path}`, { method, headers, body: formData })
  const contentType = res.headers.get('content-type') || ''
  let data
  if (contentType.includes('application/json')) {
    data = await res.json()
  } else {
    data = { message: `Ошибка сервера (${res.status})` }
  }
  if (!res.ok) throw new Error(data.message || 'Ошибка запроса')
  return data
}

// ── П1: Auth ─────────────────────────────────────────────────────────────────
export const authApi = {
  register: (email, password, phone) =>
    request('/auth/register', { method: 'POST', body: JSON.stringify({ email, password, phone }) }),
  login: (email, password) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  check: () => request('/auth/check'),
}

// ── П2/П3: Catalog ────────────────────────────────────────────────────────────
export const catalogApi = {
  // П2: getAllCategories() → { categories, empty }
  getCategories: () => request('/catalog/categories'),

  // П2: getBooksByCategory → { books, count, empty, category }
  getBooks: (categoryId, page = 1, limit = 12, { sortBy, sortDir, language, yearFrom, yearTo } = {}) => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) })
    if (categoryId) params.set('categoryId', String(categoryId))
    if (sortBy) params.set('sortBy', sortBy)
    if (sortDir) params.set('sortDir', sortDir)
    if (language) params.set('language', language)
    // Безопасная отправка годов: только если это валидные числа
    if (yearFrom != null && yearFrom !== '' && !isNaN(Number(yearFrom))) {
      params.set('yearFrom', String(yearFrom))
    }
    if (yearTo != null && yearTo !== '' && !isNaN(Number(yearTo))) {
      params.set('yearTo', String(yearTo))
    }
    return request(`/catalog/books?${params}`)
  },

  getOne: (id) => request(`/catalog/books/${id}`),

  // П3: searchBooks → { results, found, message, suggestions }
  search: (q, { sortBy, sortDir, language, yearFrom, yearTo } = {}) => {
    const params = new URLSearchParams({ q })
    if (sortBy) params.set('sortBy', sortBy)
    if (sortDir) params.set('sortDir', sortDir)
    if (language) params.set('language', language)
    // Безопасная отправка годов
    if (yearFrom != null && yearFrom !== '' && !isNaN(Number(yearFrom))) {
      params.set('yearFrom', String(yearFrom))
    }
    if (yearTo != null && yearTo !== '' && !isNaN(Number(yearTo))) {
      params.set('yearTo', String(yearTo))
    }
    return request(`/catalog/search?${params}`)
  },
}

// ── П4/П5: User Library ───────────────────────────────────────────────────────
export const libraryApi = {
  // П5: getUserLibrary → { books, empty, unavailableIds }
  getLibrary: ({ sortBy, sortDir, language, yearFrom, yearTo, categoryId } = {}) => {
    const params = new URLSearchParams()
    if (sortBy) params.set('sortBy', sortBy)
    if (sortDir) params.set('sortDir', sortDir)
    if (language) params.set('language', language)
    // Безопасная отправка годов
    if (yearFrom != null && yearFrom !== '' && !isNaN(Number(yearFrom))) {
      params.set('yearFrom', String(yearFrom))
    }
    if (yearTo != null && yearTo !== '' && !isNaN(Number(yearTo))) {
      params.set('yearTo', String(yearTo))
    }
    if (categoryId) params.set('categoryId', categoryId)
    const qs = params.toString()
    return request(`/library${qs ? '?' + qs : ''}`)
  },

  // П4: addBookInUserLibrary
  addBook: (bookId) => request(`/library/${bookId}`, { method: 'POST' }),

  // Удалить из библиотеки
  removeBook: (bookId) => request(`/library/${bookId}`, { method: 'DELETE' }),
}

// ── П6/П7: Book Viewer (подсистема просмотра) ─────────────────────────────────
export const viewerApi = {
  // П6: openBook — открыть на последней странице или указанной
  // → { bookId, title, pageContent, currentPage, totalPages, isFirstOpen }
  openBook: (id, page = null) => {
    const params = page !== null ? `?page=${page}` : ''
    return request(`/viewer/${id}${params}`)
  },

  // П6: saveLastPage — сохранить прогресс чтения
  saveProgress: (id, page) =>
    request(`/viewer/${id}/progress`, { method: 'POST', body: JSON.stringify({ page }) }),

  // П7: скачать (с подтверждением)
  downloadBook: async (id, format, title) => {
    const token = getToken()
    const url = `${BASE_URL}/viewer/${id}/download?confirm=true${format ? `&format=${format}` : ''}`
    const res = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (!res.ok) {
      const ct = res.headers.get('content-type') || ''
      const err = ct.includes('application/json') ? await res.json() : {}
      throw new Error(err.message || 'Ошибка скачивания')
    }
    const blob = await res.blob()
    const objUrl = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = objUrl
    a.download = `${title || 'book'}.${format || 'txt'}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(objUrl)
  },
}

// ── П8: Rating ────────────────────────────────────────────────────────────────
export const ratingsApi = {
  // → { ratings, bookRating }
  getForBook: (bookId) => request(`/rating/${bookId}`),

  // → { rating, newBookRating, message }
  add: (bookId, score, comment) =>
    request(`/rating/${bookId}`, { method: 'POST', body: JSON.stringify({ score, comment }) }),
}

// ── П9: Subscription ──────────────────────────────────────────────────────────
export const subscriptionApi = {
  get: () => request('/subscription'),

  // Оплата с данными карты
  pay: (plan, cardNumber, expiry, cvv) =>
    request('/subscription/pay', {
      method: 'POST',
      body: JSON.stringify({ plan, cardNumber, expiry, cvv }),
    }),
}

// ── П10: Admin ────────────────────────────────────────────────────────────────
export const adminApi = {
  // Получить все книги
  getBooks: (page = 1, limit = 100) =>
    request(`/admin/books?page=${page}&limit=${limit}`),

  // Получить категории
  getCategories: () => request('/catalog/categories'),

  // Создать категорию
  createCategory: (name) =>
    request('/catalog/categories', { method: 'POST', body: JSON.stringify({ name }) }),

  // Добавить книгу (через FormData)
  createBook: (formData) => requestForm('/admin/books', 'POST', formData),

  // Обновить книгу (через FormData)
  updateBook: (id, formData) => requestForm(`/admin/books/${id}`, 'PATCH', formData),

  // Удалить книгу (мягкое удаление)
  deleteBook: (id) => request(`/admin/books/${id}`, { method: 'DELETE' }),
}
