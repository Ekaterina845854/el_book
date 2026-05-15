import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { viewerApi, subscriptionApi } from '../api'

export default function ReadPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [title, setTitle] = useState('')
  const [pageContent, setPageContent] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [jumpInput, setJumpInput] = useState(1)
  const [loading, setLoading] = useState(true)
  const [pageLoading, setPageLoading] = useState(false)
  const [error, setError] = useState('')
  const [noSubscription, setNoSubscription] = useState(false)
  const contentRef = useRef(null)
  const isDark = typeof window !== 'undefined' && localStorage.getItem('theme') === 'dark';

  // П6 Успешный сценарий: openBook() — открывает на последней странице
  useEffect(() => {
    Promise.all([viewerApi.openBook(id), subscriptionApi.get()])
      .then(([bookData, subData]) => {
        if (!subData.isActive) {
          setNoSubscription(true)
          return
        }
        setTitle(bookData.title)
        setPageContent(bookData.content || bookData.pageContent || '')
        setCurrentPage(bookData.currentPage)
        setTotalPages(bookData.totalPages)
        setJumpInput(bookData.currentPage)
      })
      .catch(err => {
        if (
          err.message.includes('подписка') ||
          err.message.includes('subscription') ||
          err.message.includes('Требуется')
        ) {
          setNoSubscription(true)
        } else {
          setError(err.message)
        }
      })
      .finally(() => setLoading(false))
  }, [id])

  // П6 Альт. сценарий 3: ручная навигация — loadPageContent(bookId, page)
  const goToPage = useCallback(async (page) => {
    const target = Math.max(1, Math.min(page, totalPages))
    if (target === currentPage) return
    setPageLoading(true)
    try {
      const data = await viewerApi.openBook(id, target)
      setPageContent(data.content || data.pageContent || '')
      setCurrentPage(data.currentPage)
      setJumpInput(data.currentPage)
      // П6: saveLastPage — сохранить прогресс чтения
      await viewerApi.saveProgress(id, data.currentPage)
      if (contentRef.current) contentRef.current.scrollTop = 0
    } catch (err) {
      setError(err.message)
    } finally {
      setPageLoading(false)
    }
  }, [id, currentPage, totalPages])

  if (loading) return <div className="loading">Загрузка книги...</div>

  if (noSubscription) {
    return (
      <div className="page">
        <div className="subscription-required">
          <div className="subscription-required-icon">🔒</div>
          <h2>Требуется подписка</h2>
          <p>Для чтения книг онлайн необходима активная подписка.</p>
          <div className="subscription-required-actions">
            <button className="btn btn-primary" onClick={() => navigate('/subscription')}>
              Оформить подписку
            </button>
            <button className="btn btn-outline" onClick={() => navigate(-1)}>
              Назад
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (error) return (
    <div className="page">
      <div className="error-msg">{error}</div>
      <button className="btn btn-outline" onClick={() => navigate(-1)}>← Назад</button>
    </div>
  )

  return (
    <div className={`reader-page ${isDark ? 'dark' : ''}`}>
      <div className="reader-header">
        <button className="btn btn-outline" onClick={() => navigate(-1)}>← Назад</button>
        <h2>{title}</h2>
        <span className="reader-page-info">Страница {currentPage} / {totalPages}</span>
      </div>

      <div 
        className="reader-content" 
        ref={contentRef}
        dangerouslySetInnerHTML={{ __html: pageContent }}
        style={{
          minHeight: '60vh',
          padding: '20px 15px',
          lineHeight: '1.7',
          fontSize: '18px',
          color: 'var(--text-color, #1e293b)',
          background: 'var(--bg-color, #f8fafc)',
          borderRadius: '8px'
        }}
      />

      <div className="reader-nav">
        <button
          className="btn btn-outline"
          disabled={currentPage === 1 || pageLoading}
          onClick={() => goToPage(currentPage - 1)}
        >
          ← Предыдущая
        </button>
        <div className="reader-page-jump">
          <input
            type="number"
            min={1}
            max={totalPages}
            value={jumpInput}
            onChange={e => setJumpInput(e.target.value)}
            onBlur={() => goToPage(parseInt(jumpInput) || 1)}
            onKeyDown={e => e.key === 'Enter' && goToPage(parseInt(jumpInput) || 1)}
            style={{ width: '60px', textAlign: 'center', margin: '0 5px' }}
          />
          <span>/ {totalPages}</span>
        </div>
        <button
          className="btn btn-outline"
          disabled={currentPage === totalPages || pageLoading}
          onClick={() => goToPage(currentPage + 1)}
        >
          Следующая →
        </button>
      </div>

      {/* 🔒 Встроенные стили для контента книги */}
      <style>{`
        .reader-content p {
          margin: 0 0 1.2em 0;
          text-indent: 1.5em;
          text-align: justify;
          line-height: 1.6;
          color: var(--text);
        }
        .reader-content h2, .reader-content h3 {
          text-align: center;
          margin: 1.5em 0 0.8em;
          font-weight: bold;
          color: var(--text);
        }
        .reader-content h2 { font-size: 1.6em; }
        .reader-content h3 { font-size: 1.3em; }
        .reader-content blockquote {
          margin: 1em 2em;
          font-style: italic;
          border-left: 3px solid var(--border);
          padding-left: 1em;
          color: var(--text);
        }
        .reader-content .poem {
          white-space: pre-line;
          margin: 1em 0;
        }
        .reader-content br {
          display: block;
          margin: 0.3em 0;
        }
        .reader-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 15px;
          flex-wrap: wrap;
          gap: 10px;
        }
        .reader-nav {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 20px;
          padding-top: 15px;
          border-top: 1px solid var(--border);
        }
        .reader-page-jump {
          display: flex;
          align-items: center;
          gap: 5px;
        }
        .reader-page-info {
          font-size: 0.9em;
          opacity: 0.8;
        }
        @media (max-width: 600px) {
          .reader-content { font-size: 16px !important; padding: 15px 10px !important; }
          .reader-header { flex-direction: column; align-items: flex-start; }
          .reader-nav { flex-direction: column; gap: 10px; }
        }
      `}</style>
    </div>
  )
}
