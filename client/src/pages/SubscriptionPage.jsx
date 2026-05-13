import { useState, useEffect } from 'react'
import { subscriptionApi } from '../api'

const PLANS = [
  { id: 'monthly', label: 'Месячная', description: '1 месяц', price: '500 ₽' },
  { id: 'yearly', label: 'Годовая', description: '12 месяцев', price: '4500 ₽' },
]

export default function SubscriptionPage() {
  const [subscription, setSubscription] = useState(null)
  const [selectedPlan, setSelectedPlan] = useState('monthly')
  const [step, setStep] = useState('info')
  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState(false)
  const [error, setError] = useState('')

  const [cardNumber, setCardNumber] = useState('')
  const [expiry, setExpiry] = useState('')
  const [cvv, setCvv] = useState('')

  useEffect(() => {
    subscriptionApi.get()
      .then(setSubscription)
      .catch(() => setSubscription({ isPaid: false, isActive: false }))
      .finally(() => setLoading(false))
  }, [])

  // Фильтр только цифр для номера карты и CVV
  const handleCardNumberChange = (e) => {
    let value = e.target.value.replace(/\D/g, '').slice(0, 16)
    // Можно добавить форматирование пробелами, но пока просто цифры
    setCardNumber(value)
  }

  const handleExpiryChange = (e) => {
    let value = e.target.value.replace(/\D/g, '').slice(0, 4)
    if (value.length >= 3) {
      value = value.slice(0, 2) + '/' + value.slice(2)
    }
    setExpiry(value)
  }

  const handleCvvChange = (e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 3)
    setCvv(value)
  }

  async function handlePay(e) {
    e.preventDefault()
    setError('')
    if (cardNumber.length !== 16) {
      setError('Номер карты должен содержать 16 цифр')
      return
    }
    if (!expiry.match(/^(0[1-9]|1[0-2])\/\d{2}$/)) {
      setError('Срок действия должен быть в формате ММ/ГГ')
      return
    }
    if (cvv.length !== 3) {
      setError('CVV должен содержать 3 цифры')
      return
    }
    setPaying(true)
    try {
      const data = await subscriptionApi.pay(selectedPlan, cardNumber, expiry, cvv)
      setSubscription(data.subscription)
      setStep('success')
    } catch (err) {
      setError(err.message)
    } finally {
      setPaying(false)
    }
  }

  function handleCancel() {
    setStep('info')
    setCardNumber('')
    setExpiry('')
    setCvv('')
    setError('')
  }

  function formatDate(dateStr) {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('ru-RU', {
      day: 'numeric', month: 'long', year: 'numeric'
    })
  }

  if (loading) return <div className="loading">Загрузка...</div>

  const isActive = subscription?.isActive

  return (
    <div className="page">
      <h1>Подписка</h1>

      {isActive && (
        <div className="subscription-status active">
          <div className="status-icon">✔</div>
          <div>
            <h3>Подписка активна</h3>
            <p>Тариф: {subscription.plan === 'monthly' ? 'Месячная' : 'Годовая'}</p>
            <p>Действует до: {formatDate(subscription.endDate)}</p>
          </div>
        </div>
      )}

      {!isActive && subscription && (
        <div className="subscription-status inactive">
          <div className="status-icon">✘</div>
          <div>
            <h3>Подписка не активна</h3>
            <p>Оформите подписку для доступа ко всем функциям</p>
          </div>
        </div>
      )}

      {step === 'success' ? (
        <div className="payment-success">
          <div className="success-icon">✔</div>
          <h2>Подписка успешно оформлена!</h2>
          <p>Вы получили полный доступ к сервису.</p>
          <button className="btn btn-primary" onClick={() => setStep('info')}>
            Отлично
          </button>
        </div>
      ) : step === 'payment' ? (
        <form className="payment-form" onSubmit={handlePay}>
          <h2>Оплата подписки</h2>
          <div className="payment-summary">
            <p>Тариф: <strong>{PLANS.find(p => p.id === selectedPlan)?.label}</strong></p>
            <p>Сумма: <strong>{PLANS.find(p => p.id === selectedPlan)?.price}</strong></p>
          </div>

          <div className="form-group">
            <label>Номер карты</label>
            <input
              type="text"
              value={cardNumber}
              onChange={handleCardNumberChange}
              placeholder="0000 0000 0000 0000"
              maxLength={16}
              inputMode="numeric"
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Срок действия</label>
              <input
                type="text"
                value={expiry}
                onChange={handleExpiryChange}
                placeholder="ММ/ГГ"
                maxLength={5}
                required
              />
            </div>
            <div className="form-group">
              <label>CVV</label>
              <input
                type="text"
                value={cvv}
                onChange={handleCvvChange}
                placeholder="123"
                maxLength={3}
                inputMode="numeric"
                required
              />
            </div>
          </div>

          {error && <div className="error-msg">{error}</div>}
          <div className="payment-actions">
            <button type="button" className="btn btn-outline" onClick={handleCancel}>
              Отмена
            </button>
            <button type="submit" className="btn btn-primary" disabled={paying}>
              {paying ? 'Обработка...' : 'Оплатить'}
            </button>
          </div>
        </form>
      ) : (
        <div className="plans-section">
          <h2>Выберите тариф</h2>
          <div className="plans-grid">
            {PLANS.map(plan => (
              <div
                key={plan.id}
                className={`plan-card ${selectedPlan === plan.id ? 'selected' : ''}`}
                onClick={() => setSelectedPlan(plan.id)}
              >
                <h3>{plan.label}</h3>
                <p className="plan-description">{plan.description}</p>
                <p className="plan-price">{plan.price}</p>
              </div>
            ))}
          </div>
          <button className="btn btn-primary" onClick={() => setStep('payment')}>
            Перейти к оплате
          </button>
        </div>
      )}
    </div>
  )
}
