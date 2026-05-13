// П8 — ContentFilterService: validateContent(comment)
// Проверяет: spam, нецензурная лексика, запрещённые ссылки, лимит символов

const MAX_COMMENT_LENGTH = 2000

// Простые паттерны для учебного проекта — в production заменить на ML-сервис
const SPAM_PATTERNS = [
    /купи|скидка|акция|бесплатно|заработок|казино|ставки|http:\/\//gi,
]

const PROFANITY_PATTERNS = [
    /\b(хуй|пизд|ёбан|блядь|сука|пиздец|ёб|хуёв|нахуй|нахуйй)\b/gi,
]

const FORBIDDEN_LINK_PATTERNS = [
    /https?:\/\/[^\s]+/gi,
    /www\.[^\s]+\.[a-z]{2,}/gi,
    /t\.me\/[^\s]+/gi,
]

/**
 * П8 — validateContent(comment)
 * Альтернативные сценарии 2–5
 * @returns {{ valid: boolean, reason?: string, code?: string }}
 */
function validateContent(comment) {
    // Альт. сценарий 5: пустой текст — разрешаем (оценка без текста OK)
    if (!comment || comment.trim() === '') {
        return {valid: true, empty: true}
    }

    // Альт. сценарий 4: превышен лимит символов
    if (comment.length > MAX_COMMENT_LENGTH) {
        return {
            valid: false,
            code: 'COMMENT_TOO_LONG',
            reason: `Максимум ${MAX_COMMENT_LENGTH} символов, текущее: ${comment.length}`,
        }
    }

    // Альт. сценарий 2: запрещённые ссылки
    for (const pattern of FORBIDDEN_LINK_PATTERNS) {
        if (pattern.test(comment)) {
            pattern.lastIndex = 0
            return {
                valid: false,
                code: 'FORBIDDEN_LINKS',
                reason: 'Впечатление содержит запрещённые ссылки',
            }
        }
        pattern.lastIndex = 0
    }

    // Альт. сценарий 2: нецензурная лексика
    for (const pattern of PROFANITY_PATTERNS) {
        if (pattern.test(comment)) {
            pattern.lastIndex = 0
            return {
                valid: false,
                code: 'PROFANITY',
                reason: 'Впечатление содержит недопустимую лексику',
            }
        }
        pattern.lastIndex = 0
    }

    // Альт. сценарий 2: спам-паттерны
    for (const pattern of SPAM_PATTERNS) {
        if (pattern.test(comment)) {
            pattern.lastIndex = 0
            return {
                valid: false,
                code: 'SPAM',
                reason: 'Впечатление содержит спам или рекламу',
            }
        }
        pattern.lastIndex = 0
    }

    return {valid: true}
}

module.exports = {validateContent, MAX_COMMENT_LENGTH}
