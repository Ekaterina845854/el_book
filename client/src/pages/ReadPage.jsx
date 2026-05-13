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

  // П6 Успешный сценарий: openBook() — открывает на последней странице
  useEffect(() => {
    Promise.all([viewerApi.openBook(id), subscriptionApi.get()])
      .then(([bookData, subData]) => {
        if (!subData.isActive) {
          setNoSubscription(true)
          return
        }
        setTitle(bookData.title)
        setPageContent(bookData.pageContent)
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
      setPageContent(data.pageContent)
      setCurrentPage(data.currentPage)
      setJumpInput(data.currentPage)
      // П6: saveLastPage — сохранить прогресс чтения
      await viewerApi.saveProgress(id, data.currentPage)
      contentRef.current?.scrollTo(0, 0)
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
    <div className="reader-page">
      <div className="reader-header">
        <button className="btn btn-outline" onClick={() => navigate(-1)}>← Назад</button>
        <h2>{title}</h2>
        <span className="reader-page-info">Страница {currentPage} / {totalPages}</span>
      </div>

      <div className="reader-content" ref={contentRef}>
        {pageLoading
          ? <div className="loading">Загрузка страницы...</div>
          : <p className="reader-text">{pageContent}</p>
        }
      </div>

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
            disabled={pageLoading}
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
    </div>
  )
}
