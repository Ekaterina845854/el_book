import { useNavigate } from 'react-router-dom'

export default function BookCard({ book, onAdd, inLibrary, isInLibrary, compact }) {
  const inLib = inLibrary || isInLibrary
  const navigate = useNavigate()

  if (compact) {
    return (
      <div className="book-row" onClick={() => navigate(`/books/${book.id}`)}>
        <div className="book-row-thumb">
          {book.coverUrl
            ? <img src={book.coverUrl} alt={book.title} />
            : <div className="book-row-thumb-placeholder">📖</div>
          }
        </div>
        <div className="book-row-info">
          <span className="book-row-title">{book.title}</span>
          <div className="book-row-meta">
            <span className="book-row-author">{book.author}</span>
            {book.year && <span className="book-row-year">{book.year}</span>}
            {book.category && <span className="book-genre">{book.category.name}</span>}
          </div>
        </div>
        <span className="book-row-rating">★ {book.rating ? book.rating.toFixed(1) : '—'}</span>
        {onAdd && (
          <button
            className={`btn btn-sm ${inLib ? 'btn-outline' : 'btn-primary'}`}
            onClick={e => { e.stopPropagation(); onAdd(book.id) }}
          >
            {inLib ? 'В библиотеке' : '+ Добавить'}
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="book-card" onClick={() => navigate(`/books/${book.id}`)}>
      <div className="book-cover">
        {book.coverUrl
          ? <img src={book.coverUrl} alt={book.title} />
          : <div className="book-cover-placeholder">📖</div>
        }
      </div>
      <div className="book-info">
        <h3 className="book-title">{book.title}</h3>
        <p className="book-author">{book.author}</p>
        {book.category && <span className="book-genre">{book.category.name}</span>}
        <div className="book-footer">
          <span className="book-rating">★ {book.rating ? book.rating.toFixed(1) : '—'}</span>
          {onAdd && (
            <button
              className={`btn ${inLib ? 'btn-outline' : 'btn-primary'}`}
              onClick={e => { e.stopPropagation(); onAdd(book.id) }}
            >
              {inLib ? 'В библиотеке' : '+ Добавить'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
