import { useState, useEffect, useCallback } from 'react'
import { catalogApi, libraryApi } from '../api'
import BookCard from '../components/BookCard'

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
  { value: 'createdAt', label: 'По дате добавления' },
  { value: 'title', label: 'По названию' },
  { value: 'author', label: 'По автору' },
  { value: 'rating', label: 'По рейтингу' },
]

export default function CatalogPage() {
  const [books, setBooks] = useState([])
  const [genres, setGenres] = useState([])
  const [selectedGenre, setSelectedGenre] = useState('')
  const [search, setSearch] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [libraryIds, setLibraryIds] = useState(new Set())
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notification, setNotification] = useState('')

  const [sortBy, setSortBy] = useState('createdAt')
  const [sortDir, setSortDir] = useState('ASC')
  const [language, setLanguage] = useState('')
  const [century, setCentury] = useState('all')

  const [viewMode, setViewMode] = useState(() => {
    try {
      return localStorage.getItem('catalogView') || 'grid'
    } catch {
      return 'grid'
    }
  })

  const LIMIT = 12

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
    libraryApi.getLibrary()
      .then(data => setLibraryIds(new Set((data.books || []).map(e => e.bookId))))
      .catch(() => {})
  }, [])

  const loadBooks = useCallback(async () => {
    setLoading(true)
    setError('')
    const { yearFrom, yearTo } = getYearRangeFromCentury(century)
    console.log('FRONTEND DEBUG: century =', century, 'yearFrom =', yearFrom, 'yearTo =', yearTo);
    const filters = { sortBy, sortDir, language, yearFrom, yearTo }

    try {
      if (searchQuery.trim()) {
        const data = await catalogApi.search(searchQuery.trim(), filters)
        setBooks(data.results || [])
        setTotal(data.results?.length || 0)
      } else {
        console.log('Filters before API call:', filters);
        const data = await catalogApi.getBooks(selectedGenre || undefined, page, LIMIT, filters)
        setBooks(data.books || [])
        setTotal(data.count || 0)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [selectedGenre, page, searchQuery, sortBy, sortDir, language, century])

  useEffect(() => {
    loadBooks()
  }, [loadBooks])

  function handleSearch(e) {
    e.preventDefault()
    setSearchQuery(search)
    setPage(1)
    setSelectedGenre('')
  }

  function clearSearch() {
    setSearch('')
    setSearchQuery('')
    setPage(1)
  }

  function handleGenreSelect(genreId) {
    setSelectedGenre(genreId)
    setPage(1)
    setSearchQuery('')
    setSearch('')
  }

  function toggleSortDir() {
    setSortDir(d => d === 'DESC' ? 'ASC' : 'DESC')
    setPage(1)
  }

  function handleSortBy(val) {
    setSortBy(val)
    setPage(1)
  }

  function handleLanguage(val) {
    setLanguage(val)
    setPage(1)
  }

  function setView(mode) {
    setViewMode(mode)
    try { localStorage.setItem('catalogView', mode) } catch {}
  }

  async function handleAdd(bookId) {
    if (libraryIds.has(bookId)) return
    try {
      await libraryApi.addBook(bookId)
      setLibraryIds(prev => new Set([...prev, bookId]))
      showNotification('Книга добавлена в библиотеку')
    } catch (err) {
      showNotification(err.message)
    }
  }

  function showNotification(msg) {
    setNotification(msg)
    setTimeout(() => setNotification(''), 3000)
  }

  const totalPages = Math.ceil(total / LIMIT)

  return (
    <div className="page">
      <h1>Каталог книг</h1>

      <form className="search-form" onSubmit={handleSearch}>
        <input
          type="text"
          placeholder="Поиск по названию, автору..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="search-input"
        />
        <button type="submit" className="btn btn-primary">Найти</button>
        {searchQuery && (
          <button type="button" className="btn btn-outline" onClick={clearSearch}>Сбросить</button>
        )}
      </form>

      <div className="filter-bar">
        <div className="filter-group">
          <label>Сортировка:</label>
          <select value={sortBy} onChange={e => handleSortBy(e.target.value)}>
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <button className="sort-dir-btn" onClick={toggleSortDir} title={sortDir === 'DESC' ? 'По убыванию' : 'По возрастанию'}>
            {sortDir === 'DESC' ? '↓' : '↑'}
          </button>
        </div>

        <div className="filter-group">
          <label>Жанр:</label>
          <select value={selectedGenre} onChange={e => handleGenreSelect(e.target.value)}>
            <option value="">Все жанры</option>
            {genres.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </div>

        <div className="filter-group">
          <label>Язык:</label>
          <select value={language} onChange={e => handleLanguage(e.target.value)}>
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
          <button className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`} onClick={() => setView('grid')}>Сетка</button>
          <button className={`view-btn ${viewMode === 'list' ? 'active' : ''}`} onClick={() => setView('list')}>Список</button>
        </div>
      </div>

      {error && <div className="error-msg">{error}</div>}

      {loading ? (
        <div className="loading">Загрузка...</div>
      ) : books.length === 0 ? (
        <div className="empty-state">Ничего не найдено</div>
      ) : viewMode === 'grid' ? (
        <div className="books-grid">
          {books.map(book => (
            <BookCard key={book.id} book={book} isInLibrary={libraryIds.has(book.id)} onAdd={handleAdd} />
          ))}
        </div>
      ) : (
        <div className="books-list">
          {books.map(book => (
            <BookCard key={book.id} book={book} isInLibrary={libraryIds.has(book.id)} onAdd={handleAdd} />
          ))}
        </div>
      )}

      {!searchQuery && totalPages > 1 && (
        <div className="pagination">
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Предыдущая</button>
          <span>Страница {page} из {totalPages}</span>
          <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Следующая →</button>
        </div>
      )}

      {notification && <div className="notification">{notification}</div>}
    </div>
  )
}
