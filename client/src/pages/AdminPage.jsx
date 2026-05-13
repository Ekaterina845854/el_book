import { useState, useEffect, useRef } from 'react'
import { adminApi, catalogApi } from '../api'


const EMPTY_FORM = {
  title: '', author: '', year: '', ISBN: '', pages: '', annotation: '', categoryId: '',
}

export default function AdminPage() {
  const [books, setBooks] = useState([])
  const [categories, setCategories] = useState([])
  const [newCategory, setNewCategory] = useState('')
  const [form, setForm] = useState(EMPTY_FORM)
  const [editingId, setEditingId] = useState(null)
  const [coverFile, setCoverFile] = useState(null)
  const [fb2File, setFb2File] = useState(null)
  const [docxFile, setDocxFile] = useState(null)
  const [pdfFile, setPdfFile] = useState(null)
  const [txtFile, setTxtFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [notification, setNotification] = useState('')
  const [error, setError] = useState('')
  const formRef = useRef(null)

  useEffect(() => {
    loadBooks()
    catalogApi.getCategories()
      .then(data => setCategories(data.categories || []))
      .catch(() => {})
  }, [])

  async function loadBooks() {
    try {
      const data = await adminApi.getBooks(1, 1000)
      setBooks(data.books || [])
    } catch (err) {
      showNotification(err.message)
    }
  }

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  function startEdit(book) {
    setEditingId(book.id)
    setForm({
      title: book.title || '',
      author: book.author || '',
      year: book.year || '',
      ISBN: book.ISBN || '',
      pages: book.pages || '',
      annotation: book.annotation || '',
      categoryId: book.categoryId || '',
    })
    setCoverFile(null)
    setFb2File(null)
    setDocxFile(null)
    setPdfFile(null)
    setTxtFile(null)
    setError('')
    formRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  function cancelEdit() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setCoverFile(null)
    setFb2File(null)
    setDocxFile(null)
    setPdfFile(null)
    setTxtFile(null)
    setError('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!form.title || !form.author) { setError('Название и автор обязательны'); return }
    setLoading(true)
    try {
      const fd = new FormData()
      fd.append('title', form.title)
      fd.append('author', form.author)
      if (form.year) fd.append('year', form.year)
      if (form.ISBN) fd.append('ISBN', form.ISBN)
      if (form.pages) fd.append('pages', form.pages)
      if (form.annotation) fd.append('annotation', form.annotation)
      if (form.categoryId) fd.append('categoryId', form.categoryId)
      if (coverFile) fd.append('cover', coverFile)
      if (fb2File) fd.append('fb2', fb2File)
      if (docxFile) fd.append('docx', docxFile)
      if (pdfFile) fd.append('pdf', pdfFile)
      if (txtFile) fd.append('txt', txtFile)

      if (editingId) {
        await adminApi.updateBook(editingId, fd)
        showNotification('Книга обновлена')
      } else {
        await adminApi.createBook(fd)
        showNotification('Книга добавлена')
      }
      cancelEdit()
      loadBooks()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id, title) {
    if (!window.confirm(`Удалить книгу «${title}»?`)) return
    try {
      await adminApi.deleteBook(id)
      setBooks(prev => prev.filter(b => b.id !== id))
      showNotification('Книга удалена')
      if (editingId === id) cancelEdit()
    } catch (err) {
      showNotification(err.message)
    }
  }

  async function handleAddCategory(e) {
    e.preventDefault()
    if (!newCategory.trim()) return
    try {
      const cat = await adminApi.createCategory(newCategory.trim())
      setCategories(prev => [...prev, cat])
      setNewCategory('')
      showNotification(`Категория «${cat.name}» добавлена`)
    } catch (err) {
      showNotification(err.message)
    }
  }

  function showNotification(msg) {
    setNotification(msg)
    setTimeout(() => setNotification(''), 4000)
  }

  return (
    <div className="page">
      <h1>Администратор — Управление книгами</h1>

      <section className="admin-section">
        <h2>Категории</h2>
        <form className="genre-form" onSubmit={handleAddCategory}>
          <input
            type="text"
            value={newCategory}
            onChange={e => setNewCategory(e.target.value)}
            placeholder="Название категории"
          />
          <button type="submit" className="btn btn-outline">Добавить категорию</button>
        </form>
        {categories.length > 0 && (
          <div className="genre-tags">
            {categories.map(c => <span key={c.id} className="genre-tag">{c.name}</span>)}
          </div>
        )}
      </section>

      <section className="admin-section">
        <h2>Книги ({books.length})</h2>
        {books.length === 0 ? (
          <p className="empty-state">Книг пока нет.</p>
        ) : (
          <div className="admin-book-list">
            {books.map(book => (
              <div key={book.id} className={`admin-book-item${editingId === book.id ? ' editing' : ''}`}>
                {book.coverUrl && (
                  <img className="admin-book-cover" src={book.coverUrl} alt={book.title} />
                )}
                <div className="admin-book-meta">
                  <strong>{book.title}</strong>
                  <span>{book.author}</span>
                  {book.category && <span className="book-genre">{book.category.name}</span>}
                </div>
                <div className="admin-book-actions">
                  <button className="btn btn-outline" onClick={() => startEdit(book)}>Редактировать</button>
                  <button className="btn btn-danger" onClick={() => handleDelete(book.id, book.title)}>Удалить</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="admin-section" ref={formRef}>
        <h2>{editingId ? 'Редактировать книгу' : 'Добавить книгу'}</h2>
        <form className="admin-form" onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>Название *</label>
              <input name="title" value={form.title} onChange={handleChange} placeholder="Название книги" />
            </div>
            <div className="form-group">
              <label>Автор(ы) *</label>
              <input name="author" value={form.author} onChange={handleChange} placeholder="Автор" />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Год издания</label>
              <input name="year" type="number" value={form.year} onChange={handleChange} placeholder="2024" min="0" max="2100" />
            </div>
            <div className="form-group">
              <label>ISBN</label>
              <input name="ISBN" value={form.ISBN} onChange={handleChange} placeholder="978-3-16-148410-0" />
            </div>
            <div className="form-group">
              <label>Страниц</label>
              <input name="pages" type="number" value={form.pages} onChange={handleChange} placeholder="300" min="1" />
            </div>
            <div className="form-group">
              <label>Категория</label>
              <select name="categoryId" value={form.categoryId} onChange={handleChange}>
                <option value="">— Выберите категорию —</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label>Аннотация</label>
            <textarea name="annotation" value={form.annotation} onChange={handleChange} placeholder="Краткое описание" rows={3} />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Обложка (JPG/PNG)</label>
              <input type="file" accept=".jpg,.jpeg,.png,.webp" onChange={e => setCoverFile(e.target.files[0] || null)} />
              {coverFile && <small>{coverFile.name}</small>}
            </div>
          </div>

          <div className="admin-file-uploads">
            <div className="form-group">
              <label>FB2 файл <span className="hint">(для чтения онлайн + скачивания)</span></label>
              <input type="file" accept=".fb2" onChange={e => setFb2File(e.target.files[0] || null)} />
              {fb2File && <small>{fb2File.name}</small>}
            </div>
            <div className="form-group">
              <label>DOCX файл <span className="hint">(для скачивания)</span></label>
              <input type="file" accept=".docx" onChange={e => setDocxFile(e.target.files[0] || null)} />
              {docxFile && <small>{docxFile.name}</small>}
            </div>
            <div className="form-group">
              <label>PDF файл <span className="hint">(для скачивания)</span></label>
              <input type="file" accept=".pdf" onChange={e => setPdfFile(e.target.files[0] || null)} />
              {pdfFile && <small>{pdfFile.name}</small>}
            </div>
            <div className="form-group">
              <label>TXT файл <span className="hint">(для чтения онлайн + скачивания)</span></label>
              <input type="file" accept=".txt" onChange={e => setTxtFile(e.target.files[0] || null)} />
              {txtFile && <small>{txtFile.name}</small>}
            </div>
          </div>

          {error && <div className="error-msg">{error}</div>}

          <div className="admin-form-actions">
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Сохранение...' : editingId ? 'Сохранить изменения' : 'Добавить книгу'}
            </button>
            {editingId && (
              <button type="button" className="btn btn-outline" onClick={cancelEdit}>
                Отмена
              </button>
            )}
          </div>
        </form>
      </section>

      {notification && <div className="notification">{notification}</div>}
    </div>
  )
}
