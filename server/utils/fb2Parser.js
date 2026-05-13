function parseFb2(content) {
    const bodyMatch = content.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
    if (!bodyMatch) return content

    let body = bodyMatch[1]

    const paragraphs = []
    const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi
    let match
    while ((match = pRegex.exec(body)) !== null) {
        const text = match[1].replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim()
        if (text) paragraphs.push(text)
    }

    return paragraphs.join('\n\n') || content.replace(/<[^>]+>/g, ' ').replace(/\s{2,}/g, '\n').trim()
}

module.exports = parseFb2
