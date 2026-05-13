class ApiError extends Error {
    constructor(status, message) {
        super(message)
        this.status = status
    }

    static badRequest(msg) { return new ApiError(400, msg) }
    static unauthorized(msg) { return new ApiError(401, msg) }
    static forbidden(msg) { return new ApiError(403, msg) }
    static notFound(msg) { return new ApiError(404, msg) }
    static internal(msg) { return new ApiError(500, msg) }
}

function errorHandlingMiddleware(err, req, res, next) {
    if (err instanceof ApiError) {
        return res.status(err.status).json({message: err.message})
    }
    console.error(err)
    return res.status(500).json({message: 'Unexpected error'})
}

module.exports = {ApiError, errorHandlingMiddleware}
