import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { catalogApi, libraryApi, ratingsApi, subscriptionApi, viewerApi } from '../api'
import { useAuth } from '../context/AuthContext'
import StarRating from '../components/StarRating'

export default function BookPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [book, setBook] = useState(null)
  const [ratings, setRatings] = useState([])
  const [inLibrary, setInLibrary] = useState(false)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [myRating, setMyRating] = useState(null)
  const [score, setScore] = useState(0)
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(true)
  const [ratingLoading, setRatingLoading] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [editingRating, setEditingRating] = useState(false)
  const [editScore, setEditScore] = useState(0)
  const [editComment, setEditComment] = useState('')
  const [error, setError] = useState('')
  const [notification, setNotification] = useState('')

  useEffect(() => {
    Promise.all([
      // П2: getInfoAboutBook(bookId)
      catalogApi.getOne(id),
      // П8: getBookRatings(bookId) → { ratings, bookRating }
      ratingsApi.getForBook(id),
      // П5: showUserLibrary()
      libraryApi.getLibrary(),
      // П9: getSubscription()
      subscriptionApi.get(),
    ]).then(([bookData, ratingsData, libraryData, subData]) => {
      setBook(bookData)

      const ratingsList = ratingsData.ratings || []
      setRatings(ratingsList)

      const found = (libraryData.books || []).find(e => e.bookId === Number(id))
      setInLibrary(!!found)

      setIsSubscribed(!!subData.isActive)

      const mine = ratingsList.find(r => r.userId === user.id)
      if (mine) { setMyRating(mine); setScore(mine.score); setEditScore(mine.score); setEditComment(mine.comment || '') }
    }).catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [id, user.id])

  // П4: addBookInUserLibrary
  async function handleAddToLibrary() {
    try {
      await libraryApi.addBook(id)
      setInLibrary(true)
      showNotification('Книга добавлена в библиотеку')
    } catch (err) {
      showNotification(err.message)
    }
  }

  async function handleRemoveFromLibrary() {
    try {
      await libraryApi.removeBook(id)
      setInLibrary(false)
      showNotification('Книга удалена из библиотеки')
    } catch (err) {
      showNotification(err.message)
    }
  }

  // П7: saveTextBook (скачать книгу)
  async function handleDownload(format = 'txt') {
    if (!isSubscribed) { navigate('/subscription'); return }
    setDownloading(true)
    try {
      await viewerApi.downloadBook(id, format, book.title)
    } catch (err) {
      showNotification(err.message)
    } finally {
      setDownloading(false)
    }
  }

  // П8: addReview(userId, bookId, score, comment)
  async function handleRating(e) {
    e.preventDefault()
    if (!score) { showNotification('Выберите оценку'); return }
    setRatingLoading(true)
    try {
      const result = await ratingsApi.add(id, score, comment)
      setMyRating(result.rating)
      setRatings(prev => [...prev, result.rating])
      // Обновляем средний рейтинг книги
      const updatedBook = await catalogApi.getOne(id)
      setBook(updatedBook)
      showNotification('Оценка сохранена')
    } catch (err) {
      showNotification(err.message)
    } finally {
      setRatingLoading(false)
    }
  }

  async function handleUpdateRating(e) {
    e.preventDefault()
    if (!editScore) { showNotification('Выберите оценку'); return }
    setRatingLoading(true)
    try {
      await ratingsApi.update(id, editScore, editComment)
      const updated = { ...myRating, score: editScore, comment: editComment }
      setMyRating(updated)
      setRatings(prev => prev.map(r => r.id === myRating.id ? updated : r))
      setEditingRating(false)
      const updatedBook = await catalogApi.getOne(id)
      setBook(updatedBook)
      showNotification('Отзыв обновлён')
    } catch (err) {
      showNotification(err.message)
    } finally {
      setRatingLoading(false)
    }
  }

  async function handleDeleteRating() {
    if (!window.confirm('Удалить ваш отзыв?')) return
    setRatingLoading(true)
    try {
      await ratingsApi.deleteRating(id)
      setRatings(prev => prev.filter(r => r.id !== myRating.id))
      setMyRating(null)
      setScore(0)
      setEditScore(0)
      setEditComment('')
      const updatedBook = await catalogApi.getOne(id)
      setBook(updatedBook)
      showNotification('Отзыв удалён')
    } catch (err) {
      showNotification(err.message)
    } finally {
      setRatingLoading(false)
    }
  }

  function showNotification(msg) {
    setNotification(msg)
    setTimeout(() => setNotification(''), 3000)
  }

  if (loading) return <div className="loading">Загрузка...</div>
  if (error) return <div className="page"><div className="error-msg">{error}</div></div>
  if (!book) return null

  // Фильтруем 'text' из форматов для скачивания — это внутренний маркер наличия текста
  const downloadFormats = (book.availableFormats || []).filter(f => f !== 'text')

  return (
    <div className="page">
      <button className="btn btn-outline back-btn" onClick={() => navigate(-1)}>← Назад</button>

      <div className="book-detail">
        <div className="book-detail-cover">
          {book.coverUrl
            ? <img src={book.coverUrl} alt={book.title} />
            : <div className="book-cover-placeholder large">📖</div>
          }
        </div>
        <div className="book-detail-info">
          <h1>{book.title}</h1>
          <p className="book-author-large">{book.author}</p>
          {/* book.category — поле из ассоциации Book.belongsTo(Category) */}
          {book.category && (
            <span
              className="book-genre genre-clickable"
              title="Смотреть все книги этого жанра"
              onClick={() => navigate(`/?genre=${book.category.id}`)}
            >
              {book.category.name}
            </span>
          )}

          <div className="book-meta">
            {book.year && <span>Год: {book.year}</span>}
            {book.pages && <span>Страниц: {book.pages}</span>}
            {book.ISBN && <span>ISBN: {book.ISBN}</span>}
          </div>

          <div className="book-rating-display">
            <StarRating value={Math.round(book.rating)} readonly />
            <span>{book.rating ? book.rating.toFixed(1) : 'Нет оценок'} ({ratings.length})</span>
          </div>

          {book.annotation && (
            <div className="book-annotation">
              <h3>Аннотация</h3>
              <p>{book.annotation}</p>
            </div>
          )}

          <div className="book-actions">
            {inLibrary ? (
              <>
                <button
                  className="btn btn-primary"
                  onClick={() => isSubscribed ? navigate(`/read/${id}`) : navigate('/subscription')}
                  title={!isSubscribed ? 'Требуется подписка' : ''}
                >
                  {isSubscribed ? 'Читать онлайн' : '🔒 Читать онлайн'}
                </button>

                {downloadFormats.length > 0 && downloadFormats.map(fmt => (
                  <button
                    key={fmt}
                    className="btn btn-outline"
                    onClick={() => handleDownload(fmt)}
                    disabled={downloading}
                    title={!isSubscribed ? 'Требуется подписка' : `Скачать .${fmt.toUpperCase()}`}
                  >
                    {downloading ? 'Скачивание...' : isSubscribed ? `Скачать .${fmt.toUpperCase()}` : `🔒 .${fmt.toUpperCase()}`}
                  </button>
                ))}
                {book.hasText && !downloadFormats.length && (
                  <button
                    className="btn btn-outline"
                    onClick={() => handleDownload('txt')}
                    disabled={downloading}
                    title={!isSubscribed ? 'Требуется подписка' : 'Скачать как .txt'}
                  >
                    {downloading ? 'Скачивание...' : isSubscribed ? 'Скачать .TXT' : '🔒 Скачать .TXT'}
                  </button>
                )}

                <button className="btn btn-outline" onClick={handleRemoveFromLibrary}>
                  Удалить из библиотеки
                </button>

                {!isSubscribed && (
                  <p className="subscription-hint">
                    Для чтения и скачивания необходима{' '}
                    <span className="link-like" onClick={() => navigate('/subscription')}>
                      активная подписка
                    </span>
                  </p>
                )}
              </>
            ) : (
              <button className="btn btn-primary" onClick={handleAddToLibrary}>
                + Добавить в библиотеку
              </button>
            )}
          </div>
        </div>
      </div>

      {/* П8: раздел оценок */}
      <div className="ratings-section">
        <h2>Отзывы и оценки</h2>

        {!myRating && inLibrary && (
          <form className="rating-form" onSubmit={handleRating}>
            <h3>Оставить отзыв</h3>
            <div className="form-group">
              <label>Ваша оценка</label>
              <StarRating value={score} onChange={setScore} />
            </div>
            <div className="form-group">
              <label>Комментарий (необязательно)</label>
              <textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder="Ваше впечатление о книге..."
                rows={3}
                maxLength={1000}
              />
              <small>{comment.length}/1000</small>
            </div>
            <button type="submit" className="btn btn-primary" disabled={ratingLoading || !score}>
              {ratingLoading ? 'Сохранение...' : 'Сохранить отзыв'}
            </button>
          </form>
        )}

        {myRating && !editingRating && (
          <div className="my-rating">
            <div className="my-rating-header">
              <span>Ваша оценка:</span>
              <StarRating value={myRating.score} readonly />
              <div className="my-rating-actions">
                <button
                  className="btn btn-sm btn-outline"
                  onClick={() => { setEditScore(myRating.score); setEditComment(myRating.comment || ''); setEditingRating(true) }}
                >
                  Редактировать
                </button>
                <button
                  className="btn btn-sm btn-danger"
                  onClick={handleDeleteRating}
                  disabled={ratingLoading}
                >
                  Удалить
                </button>
              </div>
            </div>
            {myRating.comment && <p className="my-rating-comment">{myRating.comment}</p>}
          </div>
        )}

        {myRating && editingRating && (
          <form className="rating-form" onSubmit={handleUpdateRating}>
            <h3>Редактировать отзыв</h3>
            <div className="form-group">
              <label>Ваша оценка</label>
              <StarRating value={editScore} onChange={setEditScore} />
            </div>
            <div className="form-group">
              <label>Комментарий (необязательно)</label>
              <textarea
                value={editComment}
                onChange={e => setEditComment(e.target.value)}
                placeholder="Ваше впечатление о книге..."
                rows={3}
                maxLength={1000}
              />
              <small>{editComment.length}/1000</small>
            </div>
            <div className="rating-edit-actions">
              <button type="submit" className="btn btn-primary" disabled={ratingLoading || !editScore}>
                {ratingLoading ? 'Сохранение...' : 'Сохранить'}
              </button>
              <button type="button" className="btn btn-outline" onClick={() => setEditingRating(false)}>
                Отмена
              </button>
            </div>
          </form>
        )}

        <div className="ratings-list">
          {ratings.length === 0 ? (
            <p className="empty-state">Отзывов пока нет. Будьте первым!</p>
          ) : (
            ratings.map(r => (
              <div key={r.id} className="rating-item">
                <StarRating value={r.score} readonly />
                {r.comment && <p>{r.comment}</p>}
              </div>
            ))
          )}
        </div>
      </div>

      {notification && <div className="notification">{notification}</div>}
    </div>
  )
}
