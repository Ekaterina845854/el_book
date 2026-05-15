import { useState, useEffect, useCallback } from 'react'
import { adminApi, catalogApi } from '../api'

const CHARS_PER_PAGE = 3000

const formatISBN = (value) => {
  const digits = value.replace(/\D/g, '')
  if (digits.length <= 3) return digits
  if (digits.length <= 4) return `${digits.slice(0, 3)}-${digits.slice(3)}`
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3, 4)}-${digits.slice(4)}`
  if (digits.length <= 12) return `${digits.slice(0, 3)}-${digits.slice(3, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`
  return `${digits.slice(0, 3)}-${digits.slice(3, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 12)}-${digits.slice(12)}`
}

const EMPTY_FORM = {
  title: '', author: '', year: '', categoryId: '', ISBN: '', pages: '', language: 'ru', annotation: '',
}

const LANGUAGES = [
  { value: 'ru', label: 'Русский' },
  { value: 'en', label: 'English' },
  { value: 'de', label: 'Deutsch' },
  { value: 'fr', label: 'Français' },
  { value: 'es', label: 'Español' },
  { value: 'it', label: 'Italiano' },
  { value: 'zh', label: 'Китайский' },
  { value: 'ja', label: 'Японский' },
]

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('list')
  const [editingBook, setEditingBook] = useState(null)

  // List state
  const [books, setBooks] = useState([])
  const [booksTotal, setBooksTotal] = useState(0)
  const [booksTotalPages, setBooksTotalPages] = useState(1)
  const [booksPage, setBooksPage] = useState(1)
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [booksLoading, setBooksLoading] = useState(false)

  // Form state
  const [categories, setCategories] = useState([])
  const [form, setForm] = useState(EMPTY_FORM)
  const [files, setFiles] = useState({ cover: null, fb2: null })
  const [pagesDetected, setPagesDetected] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    catalogApi.getCategories()
      .then(data => setCategories(data.categories || []))
      .catch(() => {})
  }, [])

  const loadBooks = useCallback(async () => {
    setBooksLoading(true)
    try {
      const data = await adminApi.getBooks(booksPage, 20, searchQuery)
      setBooks(data.books || [])
      setBooksTotal(data.count || 0)
      setBooksTotalPages(data.totalPages || 1)
    } catch (err) {
      setError(err.message)
    } finally {
      setBooksLoading(false)
    }
  }, [booksPage, searchQuery])

  useEffect(() => {
    if (activeTab === 'list') loadBooks()
  }, [activeTab, loadBooks])

  function handleSearch(e) {
    e.preventDefault()
    setSearchQuery(searchInput)
    setBooksPage(1)
  }

  function clearSearch() {
    setSearchInput('')
    setSearchQuery('')
    setBooksPage(1)
  }

  function startAdd() {
    setEditingBook(null)
    setForm(EMPTY_FORM)
    setFiles({ cover: null, fb2: null })
    setPagesDetected(false)
    setMessage('')
    setError('')
    setActiveTab('form')
  }

  function startEdit(book) {
    setEditingBook(book)
    setForm({
      title: book.title || '',
      author: book.author || '',
      year: book.year ? String(book.year) : '',
      categoryId: book.categoryId ? String(book.categoryId) : '',
      ISBN: book.ISBN || '',
      pages: book.pages ? String(book.pages) : '',
      language: book.language || 'ru',
      annotation: book.annotation || '',
    })
    setFiles({ cover: null, fb2: null })
    setPagesDetected(false)
    setMessage('')
    setError('')
    setActiveTab('form')
  }

  function cancelEdit() {
    setEditingBook(null)
    setForm(EMPTY_FORM)
    setFiles({ cover: null, fb2: null })
    setPagesDetected(false)
    setActiveTab('list')
  }

  function handleChange(e) {
    const { name, value } = e.target
    if (name === 'ISBN') {
      setForm(prev => ({ ...prev, ISBN: formatISBN(value) }))
      return
    }
    setForm(prev => ({ ...prev, [name]: value }))
  }

  function handleFileChange(e) {
    const { name, files: inputFiles } = e.target
    if (!inputFiles || !inputFiles[0]) return
    const file = inputFiles[0]
    setFiles(prev => ({ ...prev, [name]: file }))

    if (name === 'fb2') {
      const reader = new FileReader()
      reader.onload = (ev) => {
        const raw = ev.target.result || ''
        const plainText = raw.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
        const estimated = Math.ceil(plainText.length / CHARS_PER_PAGE)
        if (estimated > 0) {
          setForm(prev => ({ ...prev, pages: String(estimated) }))
          setPagesDetected(true)
        }
      }
      reader.onerror = () => {}
      reader.readAsText(file, 'utf-8')
    }
  }

  async function handleDelete(bookId) {
    if (!window.confirm('Скрыть книгу из каталога?')) return
    try {
      await adminApi.deleteBook(bookId)
      showNotification('Книга удалена из каталога', false)
      loadBooks()
    } catch (err) {
      showNotification(err.message, true)
    }
  }

  async function handleRestore(bookId) {
    try {
      await adminApi.restoreBook(bookId)
      showNotification('Книга восстановлена в каталоге', false)
      loadBooks()
    } catch (err) {
      showNotification(err.message, true)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    setError('')

    const formData = new FormData()
    Object.entries(form).forEach(([key, value]) => {
      if (value !== '' && value !== null && value !== undefined) formData.append(key, value)
    })
    if (files.cover) formData.append('cover', files.cover)
    if (files.fb2) formData.append('fb2', files.fb2)

    try {
      let result
      if (editingBook) {
        result = await adminApi.updateBook(editingBook.id, formData)
        setMessage(result.message || 'Книга обновлена')
        loadBooks()
      } else {
        result = await adminApi.createBook(formData)
        setMessage(result.message || 'Книга добавлена')
        setForm(EMPTY_FORM)
        setFiles({ cover: null, fb2: null })
        setPagesDetected(false)
        document.querySelectorAll('input[type="file"]').forEach(el => { el.value = '' })
      }
    } catch (err) {
      setError(err.message || 'Ошибка')
    } finally {
      setLoading(false)
      setTimeout(() => { setMessage(''); setError('') }, 5000)
    }
  }

  function showNotification(msg, isError = false) {
    if (isError) setError(msg)
    else setMessage(msg)
    setTimeout(() => { setMessage(''); setError('') }, 4000)
  }

  return (
    <div className="page">
      <h1>Панель администратора</h1>

      {message && <div className="success-msg">{message}</div>}
      {error && <div className="error-msg">{error}</div>}

      <div className="admin-tabs">
        <button
          className={`admin-tab-btn${activeTab === 'list' ? ' active' : ''}`}
          onClick={() => { setActiveTab('list'); setEditingBook(null) }}
        >
          Список книг {booksTotal > 0 && <span className="admin-tab-count">{booksTotal}</span>}
        </button>
        <button
          className={`admin-tab-btn${activeTab === 'form' && !editingBook ? ' active' : ''}`}
          onClick={startAdd}
        >
          + Добавить книгу
        </button>
        {editingBook && (
          <span className="admin-tab-btn active">
            Редактирование: {editingBook.title.length > 30 ? editingBook.title.slice(0, 30) + '…' : editingBook.title}
          </span>
        )}
      </div>

      {/* ── Список книг ── */}
      {activeTab === 'list' && (
        <div className="admin-section">
          <form className="admin-list-search" onSubmit={handleSearch}>
            <input
              type="text"
              placeholder="Поиск по названию или автору..."
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              className="search-input"
            />
            <button type="submit" className="btn btn-primary">Найти</button>
            {searchQuery && (
              <button type="button" className="btn btn-outline" onClick={clearSearch}>Сбросить</button>
            )}
          </form>

          {booksLoading ? (
            <div className="loading">Загрузка...</div>
          ) : books.length === 0 ? (
            <div className="empty-state">Книги не найдены</div>
          ) : (
            <div className="admin-book-list">
              {books.map(book => (
                <div key={book.id} className={`admin-book-item${book.status === 'deleted' ? ' deleted' : ''}`}>
                  <div className="admin-book-cover-wrap">
                    {book.coverUrl
                      ? <img src={book.coverUrl} alt={book.title} className="admin-book-cover" />
                      : <div className="admin-book-cover-placeholder">📖</div>
                    }
                  </div>
                  <div className="admin-book-meta">
                    <strong>{book.title}</strong>
                    <span>{book.author}{book.year ? ` · ${book.year}` : ''}</span>
                    <span>{book.category?.name || '—'}{book.language ? ` · ${book.language.toUpperCase()}` : ''}</span>
                  </div>
                  <div className="admin-book-right">
                    <span className={`admin-status-badge ${book.status === 'deleted' ? 'deleted' : 'active'}`}>
                      {book.status === 'deleted' ? 'Удалена' : 'Активна'}
                    </span>
                    <div className="admin-book-actions">
                      <button className="btn btn-sm btn-outline" onClick={() => startEdit(book)}>
                        Редактировать
                      </button>
                      {book.status === 'deleted' ? (
                        <button className="btn btn-sm btn-primary" onClick={() => handleRestore(book.id)}>
                          Восстановить
                        </button>
                      ) : (
                        <button className="btn btn-sm btn-danger" onClick={() => handleDelete(book.id)}>
                          Удалить
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {booksTotalPages > 1 && (
            <div className="pagination" style={{ marginTop: '16px' }}>
              <button
                className="pagination-btn"
                disabled={booksPage === 1}
                onClick={() => setBooksPage(p => p - 1)}
              >←</button>
              <span style={{ padding: '0 12px', lineHeight: '36px', fontSize: '0.875rem' }}>
                {booksPage} / {booksTotalPages}
              </span>
              <button
                className="pagination-btn"
                disabled={booksPage === booksTotalPages}
                onClick={() => setBooksPage(p => p + 1)}
              >→</button>
            </div>
          )}
        </div>
      )}

      {/* ── Форма добавления / редактирования ── */}
      {activeTab === 'form' && (
        <div className="admin-section">
          <h2>{editingBook ? `Редактировать: ${editingBook.title}` : 'Добавить книгу'}</h2>

          {editingBook && (
            <div className="admin-edit-info">
              ID: {editingBook.id} · Текущий файл: {editingBook.fb2Path ? 'FB2 есть' : 'нет'} · Обложка: {editingBook.coverUrl ? 'есть' : 'нет'}
            </div>
          )}

          <form onSubmit={handleSubmit} className="admin-form" encType="multipart/form-data">
            <div className="form-group">
              <label>Название *</label>
              <input type="text" name="title" value={form.title} onChange={handleChange} required />
            </div>

            <div className="form-group">
              <label>Автор *</label>
              <input type="text" name="author" value={form.author} onChange={handleChange} required />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Год</label>
                <input type="number" name="year" value={form.year} onChange={handleChange} min="1000" max="2100" />
              </div>
              <div className="form-group">
                <label>Жанр</label>
                <select name="categoryId" value={form.categoryId} onChange={handleChange}>
                  <option value="">Не выбран</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>ISBN</label>
                <input
                  type="text"
                  name="ISBN"
                  value={form.ISBN}
                  onChange={handleChange}
                  placeholder="978-5-04-116640-5"
                  maxLength={17}
                />
                <small style={{ color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>
                  Вводите цифры — дефисы добавятся автоматически
                </small>
              </div>
              <div className="form-group">
                <label>
                  Страниц
                  {pagesDetected && <span className="admin-pages-hint"> (определено автоматически)</span>}
                </label>
                <input
                  type="number"
                  name="pages"
                  value={form.pages}
                  onChange={e => { setForm(prev => ({ ...prev, pages: e.target.value })); setPagesDetected(false) }}
                  min="1"
                />
              </div>
            </div>

            <div className="form-group">
              <label>Язык</label>
              <select name="language" value={form.language} onChange={handleChange}>
                {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label>Аннотация</label>
              <textarea name="annotation" value={form.annotation} onChange={handleChange} rows="4" />
            </div>

            <div className="admin-file-uploads">
              <div className="form-group">
                <label>Обложка (JPG/PNG, макс. 10 МБ){editingBook?.coverUrl ? ' — текущая будет заменена' : ''}</label>
                <input type="file" name="cover" accept=".jpg,.jpeg,.png,.webp" onChange={handleFileChange} />
                {files.cover && <small>Выбрано: {files.cover.name}</small>}
              </div>
              <div className="form-group">
                <label>
                  Текст книги (FB2){editingBook?.fb2Path ? ' — текущий будет заменён' : ''}
                  <span className="admin-pages-hint"> — страницы определятся автоматически</span>
                </label>
                <input type="file" name="fb2" accept=".fb2" onChange={handleFileChange} />
                {files.fb2 && <small>Выбрано: {files.fb2.name}</small>}
              </div>
            </div>

            <div className="admin-form-actions">
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Сохранение...' : editingBook ? 'Сохранить изменения' : 'Добавить книгу'}
              </button>
              {editingBook && (
                <button type="button" className="btn btn-outline" onClick={cancelEdit}>
                  Отмена
                </button>
              )}
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
