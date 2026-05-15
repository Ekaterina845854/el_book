import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
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

// Коррекция английской раскладки → русскую (частая ошибка при поиске)
const EN_TO_RU = {
  q:'й',w:'ц',e:'у',r:'к',t:'е',y:'н',u:'г',i:'ш',o:'щ',p:'з','[':'х',']':'ъ',
  a:'ф',s:'ы',d:'в',f:'а',g:'п',h:'р',j:'о',k:'л',l:'д',';':'ж',"'":'э',
  z:'я',x:'ч',c:'с',v:'м',b:'и',n:'т',m:'ь',',':'б','.':'ю',
}
function fixLayout(str) {
  return str.split('').map(c => EN_TO_RU[c.toLowerCase()] !== undefined
    ? (c === c.toUpperCase() ? EN_TO_RU[c.toLowerCase()].toUpperCase() : EN_TO_RU[c.toLowerCase()])
    : c
  ).join('')
}

// Генерация номеров страниц с многоточиями
function getPageNumbers(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const set = new Set([1, total, current])
  if (current - 1 > 1) set.add(current - 1)
  if (current + 1 < total) set.add(current + 1)
  if (current - 2 > 1) set.add(current - 2)
  if (current + 2 < total) set.add(current + 2)
  return [...set].sort((a, b) => a - b)
}

export default function CatalogPage() {
  const [books, setBooks] = useState([])
  const [genres, setGenres] = useState([])
  const [selectedGenre, setSelectedGenre] = useState('')
  const [search, setSearch] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [layoutHint, setLayoutHint] = useState('')
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

  const [searchParams, setSearchParams] = useSearchParams()

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

  // Инициализация фильтров из URL при первой загрузке
  useEffect(() => {
    const urlSortBy = searchParams.get('sortBy')
    const urlSortDir = searchParams.get('sortDir')
    const urlLang = searchParams.get('language')
    const urlCentury = searchParams.get('century')
    const urlGenre = searchParams.get('genre')
    const urlPage = searchParams.get('page')

    if (urlSortBy && SORT_OPTIONS.some(o => o.value === urlSortBy)) setSortBy(urlSortBy)
    if (urlSortDir === 'ASC' || urlSortDir === 'DESC') setSortDir(urlSortDir)
    if (LANGUAGES.some(l => l.value === urlLang)) setLanguage(urlLang)
    if (urlCentury) setCentury(urlCentury)
    if (urlGenre) setSelectedGenre(urlGenre)
    if (urlPage && !isNaN(parseInt(urlPage))) setPage(parseInt(urlPage))
  }, [])

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

    // Синхронизируем фильтры с URL
    const params = new URLSearchParams(searchParams)
    params.set('sortBy', sortBy)
    params.set('sortDir', sortDir)
    if (language) params.set('language', language)
    else params.delete('language')
    if (century !== 'all') params.set('century', century)
    else params.delete('century')
    if (selectedGenre) params.set('genre', selectedGenre)
    else params.delete('genre')
    params.set('page', page)
    setSearchParams(params, { replace: true })

    try {
      if (searchQuery.trim()) {
        setSuggestions([])
        setLayoutHint('')
        const data = await catalogApi.search(searchQuery.trim(), filters)
        const results = data.results || []
        setBooks(results)
        setTotal(results.length)

        if (!data.found) {
          // Показываем подсказки от бэкенда (fuzzySearch)
          if (data.suggestions?.length) setSuggestions(data.suggestions)

          // Проверяем, не введено ли латиницей вместо кириллицы
          const fixed = fixLayout(searchQuery.trim())
          if (fixed !== searchQuery.trim()) setLayoutHint(fixed)
        }
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
  }, [selectedGenre, page, searchQuery, sortBy, sortDir, language, century, searchParams, setSearchParams])

  useEffect(() => {
    loadBooks()
  }, [loadBooks])

  function handleSearch(e) {
    e.preventDefault()
    setSuggestions([])
    setLayoutHint('')
    setSearchQuery(search)
    setPage(1)
    setSelectedGenre('')
  }

  function clearSearch() {
    setSearch('')
    setSearchQuery('')
    setSuggestions([])
    setLayoutHint('')
    setPage(1)
  }

  function applyCorrection(text) {
    setSearch(text)
    setSearchQuery(text)
    setSuggestions([])
    setLayoutHint('')
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

  function handleCentury(val) {
    setCentury(val)
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

      {layoutHint && (
        <div className="search-hint">
          Возможно, вы имели в виду (другая раскладка):&nbsp;
          <button className="search-hint-btn" onClick={() => applyCorrection(layoutHint)}>
            {layoutHint}
          </button>
        </div>
      )}
      {suggestions.length > 0 && (
        <div className="search-suggestions">
          <span>Похожие запросы:</span>
          {suggestions.map((s, i) => {
            const title = s.split(' — ')[0]
            return (
              <button key={i} className="suggestion-btn" onClick={() => applyCorrection(title)}>
                {s}
              </button>
            )
          })}
        </div>
      )}

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
          <select value={century} onChange={e => handleCentury(e.target.value)}>
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
            <BookCard key={book.id} book={book} isInLibrary={libraryIds.has(book.id)} onAdd={handleAdd} compact />
          ))}
        </div>
      )}

      {!searchQuery && totalPages > 1 && (
        <div className="pagination">
          <button
            className="pagination-btn"
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
          >←</button>

          {getPageNumbers(page, totalPages).reduce((acc, num, idx, arr) => {
            if (idx > 0 && num - arr[idx - 1] > 1) {
              acc.push(<span key={`dots-${num}`} className="pagination-dots">…</span>)
            }
            acc.push(
              <button
                key={num}
                className={`pagination-btn${num === page ? ' active' : ''}`}
                onClick={() => setPage(num)}
              >
                {num}
              </button>
            )
            return acc
          }, [])}

          <button
            className="pagination-btn"
            disabled={page === totalPages}
            onClick={() => setPage(p => p + 1)}
          >→</button>
        </div>
      )}

      {notification && <div className="notification">{notification}</div>}
    </div>
  )
}
