import { useState, useEffect } from 'react'
import { adminApi, catalogApi } from '../api'

export default function AdminPage() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    title: '',
    author: '',
    year: '',
    categoryId: '',
    ISBN: '',
    pages: '',
    language: 'ru',
    annotation: '',
  })
  const [files, setFiles] = useState({ cover: null, fb2: null })

  useEffect(() => {
    catalogApi.getCategories()
      .then(data => setCategories(data.categories || []))
      .catch(() => {})
  }, [])

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  const handleFileChange = (e) => {
    const { name, files } = e.target
    if (files && files[0]) {
      setFiles(prev => ({ ...prev, [name]: files[0] }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    setError('')

    try {
      // Создаём FormData для отправки файлов + полей
      const formData = new FormData()
      
      // Текстовые поля
      Object.entries(form).forEach(([key, value]) => {
        if (value !== '' && value !== null && value !== undefined) {
          formData.append(key, value)
        }
      })
      
      // Файлы: имена должны совпадать с multer в upload.js
      if (files.cover) formData.append('cover', files.cover)
      if (files.fb2) formData.append('fb2', files.fb2)

      // Отправляем через adminApi.createBook (использует requestForm)
      const result = await adminApi.createBook(formData)
      
      setMessage(result.message || 'Книга успешно добавлена!')
      setForm({
        title: '', author: '', year: '', categoryId: '', ISBN: '',
        pages: '', language: 'ru', annotation: '',
      })
      setFiles({ cover: null, fb2: null })
      
      // Сбрасываем file inputs
      document.querySelectorAll('input[type="file"]').forEach(input => input.value = '')
      
    } catch (err) {
      setError(err.message || 'Ошибка при добавлении книги')
    } finally {
      setLoading(false)
      setTimeout(() => { setMessage(''); setError('') }, 5000)
    }
  }

  return (
    <div className="page">
      <h1>Админ-панель: добавить книгу</h1>
      
      {message && <div className="success-msg">{message}</div>}
      {error && <div className="error-msg">{error}</div>}
      
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
            <input type="text" name="ISBN" value={form.ISBN} onChange={handleChange} placeholder="978-5-04-116640-5" />
          </div>
          
          <div className="form-group">
            <label>Страниц</label>
            <input type="number" name="pages" value={form.pages} onChange={handleChange} min="1" />
          </div>
        </div>
        
        <div className="form-group">
          <label>Язык</label>
          <select name="language" value={form.language} onChange={handleChange}>
            <option value="ru">Русский</option>
            <option value="en">English</option>
            <option value="de">Deutsch</option>
            <option value="fr">Français</option>
            <option value="es">Español</option>
          </select>
        </div>
        
        <div className="form-group">
          <label>Аннотация</label>
          <textarea name="annotation" value={form.annotation} onChange={handleChange} rows="4" />
        </div>
        
        <div className="form-group">
          <label>Обложка (JPG/PNG, макс. 10 МБ)</label>
          <input type="file" name="cover" accept=".jpg,.jpeg,.png,.webp" onChange={handleFileChange} />
          {files.cover && <small>Выбрано: {files.cover.name}</small>}
        </div>
        
        <div className="form-group">
          <label>Текст книги (FB2)</label>
          <input type="file" name="fb2" accept=".fb2" onChange={handleFileChange} />
          {files.fb2 && <small>Выбрано: {files.fb2.name}</small>}
        </div>
        
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Загрузка...' : 'Добавить книгу'}
        </button>
      </form>
    </div>
  )
}
