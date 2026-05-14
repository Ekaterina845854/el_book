import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { libraryApi, viewerApi, subscriptionApi, catalogApi } from '../api'

const LANGUAGES = [
  { value: '', label: 'Все языки' },
  { value: 'ru', label: 'Русский' },
  { value: 'en', label: 'English' },
  { value: 'de', label: 'Deutsch' },
  { value: 'fr', label: 'Français' },
  { value: 'es', label: 'Español' },
  { value: 'it', label: 'Italiano' },
  { value: 'zh', label: 'Китайский' },
  { value: 'ja', label: 'Японский' },
]

const SORT_OPTIONS = [
  { value: 'addedAt', label: 'По дате добавления' },
  { value: 'title', label: 'По названию' },
  { value: 'author', label: 'По автору' },
  { value: 'year', label: 'По году' },
  { value: 'rating', label: 'По рейтингу' },
]

const READ_STATUS_LABEL = { not_started: 'Не начата', in_progress: 'Читается', finished: 'Прочитана' }

export default function LibraryPage() {
  const [entries, setEntries] = useState([])
  const [genres, setGenres] = useState([])
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notification, setNotification] = useState('')

  // Фильтры и сортировка
  const [sortBy, setSortBy] = useState('addedAt')
  const [sortDir, setSortDir] = useState('ASC')
  const [language, setLanguage] = useState('')
  const [century, setCentury] = useState('all')   // заменили yearFrom/yearTo
  const [categoryId, setCategoryId] = useState('')

  const [viewMode, setViewMode] = useState(() => localStorage.getItem('libraryView') || 'list')

  const navigate = useNavigate()

  // Преобразование века в диапазон годов
  const getYearRangeFromCentury = (century) => {
    switch (century) {
      case 'before17': return { yearFrom: null, yearTo: 1600 }
      case '17': return { yearFrom: 1601, yearTo: 1700 }
      case '18': return { yearFrom: 1701, yearTo: 1800 }
      case '19': return { yearFrom: 1801, yearTo: 1900 }
      case '20': return { yearFrom: 1901, yearTo: 2000 }
      case '21': return { yearFrom: 2001, yearTo: 2100 }
      default: return { yearFrom: null, yearTo: null }
    }
  }

  useEffect(() => {
    catalogApi.getCategories()
      .then(data => setGenres(data.categories || []))
      .catch(() => {})
  }, [])

  const loadLibrary = useCallback(async () => {
    setLoading(true)
    try {
      const { yearFrom, yearTo } = getYearRangeFromCentury(century)
      const [data, subData] = await Promise.all([
        libraryApi.getLibrary({ sortBy, sortDir, language, yearFrom, yearTo, categoryId }),
        subscriptionApi.get(),
      ])
      setEntries(data.books || [])
      setIsSubscribed(!!subData.isActive)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [sortBy, sortDir, language, century, categoryId])

  useEffect(() => {
    loadLibrary()
  }, [loadLibrary])

  async function handleRemove(bookId) {
    try {
      await libraryApi.removeBook(bookId)
      setEntries(prev => prev.filter(e => e.bookId !== bookId))
      showNotification('Книга удалена из библиотеки')
    } catch (err) {
      showNotification(err.message)
    }
  }

  async function handleDownload(bookId, bookTitle, format = 'txt') {
    if (!isSubscribed) { navigate('/subscription'); return }
    try {
      await viewerApi.downloadBook(bookId, format, bookTitle)
    } catch (err) {
      showNotification(err.message)
    }
  }

  function handleRead(bookId) {
    if (!isSubscribed) { navigate('/subscription'); return }
    navigate(`/read/${bookId}`)
  }

  function toggleSortDir() {
    setSortDir(d => d === 'DESC' ? 'ASC' : 'DESC')
  }

  function setView(mode) {
    setViewMode(mode)
    localStorage.setItem('libraryView', mode)
  }

  function showNotification(msg) {
    setNotification(msg)
    setTimeout(() => setNotification(''), 3000)
  }

  if (loading) return <div className="loading">Загрузка...</div>

  return (
    <div className="page">
      <h1>Моя библиотека</h1>
      {error && <div className="error-msg">{error}</div>}
      {!isSubscribed && entries.length > 0 && (
        <div className="subscription-banner">
          Для чтения и скачивания книг необходима{' '}
          <span className="link-like" onClick={() => navigate('/subscription')}>активная подписка</span>
        </div>
      )}

      {/* Панель фильтров, сортировки и вида */}
      <div className="filter-bar">
        <div className="filter-group">
          <label>Сортировка:</label>
          <select value={sortBy} onChange={e => setSortBy(e.target.value)}>
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <button className="sort-dir-btn" onClick={toggleSortDir} title={sortDir === 'DESC' ? 'По убыванию' : 'По возрастанию'}>
            {sortDir === 'DESC' ? '↓' : '↑'}
          </button>
        </div>
        <div className="filter-group">
          <label>Жанр:</label>
          <select value={categoryId} onChange={e => setCategoryId(e.target.value)}>
            <option value="">Все жанры</option>
            {genres.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </div>
        <div className="filter-group">
          <label>Язык:</label>
          <select value={language} onChange={e => setLanguage(e.target.value)}>
            {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
          </select>
        </div>
        <div className="filter-group">
          <label>Век / эпоха:</label>
          <select value={century} onChange={e => setCentury(e.target.value)}>
            <option value="all">Все века</option>
            <option value="before17">До XVII века (до 1600)</option>
            <option value="17">XVII век (1601–1700)</option>
            <option value="18">XVIII век (1701–1800)</option>
            <option value="19">XIX век (1801–1900)</option>
            <option value="20">XX век (1901–2000)</option>
            <option value="21">XXI век (2001–2100)</option>
          </select>
        </div>
        <div className="view-toggle">
          <button className={`view-btn ${viewMode === 'list' ? 'active' : ''}`} onClick={() => setView('list')} title="Список">Список</button>
          <button className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`} onClick={() => setView('grid')} title="Сетка">Сетка</button>
        </div>
      </div>

      {entries.length === 0 ? (
        <div className="empty-state">
          <p>Ваша библиотека пуста.</p>
          <button className="btn btn-primary" onClick={() => navigate('/')}>Перейти в каталог</button>
        </div>
      ) : viewMode === 'list' ? (
        <div className="library-list">
          {entries.map(entry => renderLibraryItem(entry, isSubscribed, handleRead, handleDownload, handleRemove, navigate))}
        </div>
      ) : (
        <div className="library-grid">
          {entries.map(entry => renderLibraryCard(entry, isSubscribed, handleRead, handleDownload, handleRemove, navigate))}
        </div>
      )}

      {notification && <div className="notification">{notification}</div>}
    </div>
  )
}

function renderLibraryItem(entry, isSubscribed, handleRead, handleDownload, handleRemove, navigate) {
  const book = entry.book
  if (!book) return null

  if (entry.accessRestricted) {
    return (
      <div key={entry.id} className="library-item restricted">
        <div className="library-item-info">
          <h3>{entry.accessMessage || 'Доступ к книге ограничен'}</h3>
        </div>
        <div className="library-item-actions">
          <button className="btn btn-danger" onClick={() => handleRemove(book.id)}>Удалить</button>
        </div>
      </div>
    )
  }

  const canRead = !!book.fb2Path
  const downloadFormats = [
    book.fb2Path && 'fb2',
    book.docxPath && 'docx',
    book.pdfPath && 'pdf',
    book.txtPath && 'txt',
  ].filter(Boolean)

  return (
    <div key={entry.id} className="library-item">
      <div className="library-item-cover" onClick={() => navigate(`/books/${book.id}`)}>
        {book.coverUrl
          ? <img src={book.coverUrl} alt={book.title} />
          : <div className="book-cover-placeholder">Нет обложки</div>
        }
      </div>
      <div className="library-item-info">
        <h3 onClick={() => navigate(`/books/${book.id}`)}>{book.title}</h3>
        <p>{book.author}</p>
        {book.category && <span className="book-genre">{book.category.name}</span>}
        <div className="library-item-rating">Рейтинг: {book.rating ? book.rating.toFixed(1) : '—'}</div>
        {entry.readStatus && (
          <span className={`read-status read-status-${entry.readStatus}`}>
            {READ_STATUS_LABEL[entry.readStatus] || entry.readStatus}
          </span>
        )}
      </div>
      <div className="library-item-actions">
        {canRead && (
          <button
            className="btn btn-primary"
            onClick={() => handleRead(book.id)}
            title={!isSubscribed ? 'Требуется подписка' : 'Читать онлайн (FB2)'}
          >
            {isSubscribed ? 'Читать' : 'Читать (требуется подписка)'}
          </button>
        )}
        {downloadFormats.length > 0
          ? downloadFormats.map(fmt => (
            <button
              key={fmt}
              className="btn btn-outline"
              onClick={() => handleDownload(book.id, book.title, fmt)}
              title={!isSubscribed ? 'Требуется подписка' : `Скачать .${fmt.toUpperCase()}`}
            >
              {isSubscribed ? `Скачать .${fmt.toUpperCase()}` : `Скачать .${fmt.toUpperCase()} (требуется подписка)`}
            </button>
          ))
          : !canRead && (
            <span className="no-formats-hint">Нет файлов для скачивания</span>
          )
        }
        <button className="btn btn-outline" onClick={() => navigate(`/books/${book.id}`)}>
          Подробнее
        </button>
        <button className="btn btn-danger" onClick={() => handleRemove(book.id)}>
          Удалить
        </button>
      </div>
    </div>
  )
}

function renderLibraryCard(entry, isSubscribed, handleRead, handleDownload, handleRemove, navigate) {
  const book = entry.book
  if (!book) return null

  if (entry.accessRestricted) {
    return (
      <div key={entry.id} className="library-card restricted">
        <div className="library-card-info">
          <p>{entry.accessMessage || 'Доступ к книге ограничен'}</p>
        </div>
        <button className="btn btn-danger btn-sm" onClick={() => handleRemove(book.id)}>Удалить</button>
      </div>
    )
  }

  const canRead = !!book.fb2Path
  const downloadFormats = [
    book.fb2Path && 'fb2',
    book.docxPath && 'docx',
    book.pdfPath && 'pdf',
    book.txtPath && 'txt',
  ].filter(Boolean)

  return (
    <div key={entry.id} className="library-card">
      <div className="library-card-cover" onClick={() => navigate(`/books/${book.id}`)}>
        {book.coverUrl
          ? <img src={book.coverUrl} alt={book.title} />
          : <div className="book-cover-placeholder">Нет обложки</div>
        }
      </div>
      <div className="library-card-body">
        <h3 className="library-card-title" onClick={() => navigate(`/books/${book.id}`)}>{book.title}</h3>
        <p className="library-card-author">{book.author}</p>
        {book.year && <span className="library-card-year">{book.year}</span>}
        {book.category && <span className="book-genre">{book.category.name}</span>}
        <div className="library-card-rating">Рейтинг: {book.rating ? book.rating.toFixed(1) : '—'}</div>
        {entry.readStatus && (
          <span className={`read-status read-status-${entry.readStatus}`}>
            {READ_STATUS_LABEL[entry.readStatus] || entry.readStatus}
          </span>
        )}
      </div>
      <div className="library-card-actions">
        {canRead && (
          <button className="btn btn-primary btn-full" onClick={() => handleRead(book.id)}>
            {isSubscribed ? 'Читать' : 'Читать (требуется подписка)'}
          </button>
        )}
        {downloadFormats.map(fmt => (
          <button key={fmt} className="btn btn-outline btn-full" onClick={() => handleDownload(book.id, book.title, fmt)}>
            {isSubscribed ? `Скачать .${fmt.toUpperCase()}` : `Скачать .${fmt.toUpperCase()} (требуется подписка)`}
          </button>
        ))}
        <button className="btn btn-outline btn-full" onClick={() => navigate(`/books/${book.id}`)}>
          Подробнее
        </button>
        <button className="btn btn-danger btn-full" onClick={() => handleRemove(book.id)}>
          Удалить
        </button>
      </div>
    </div>
  )
}
