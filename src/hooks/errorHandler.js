export function setupErrorHandlers(fastify) {
    fastify.setNotFoundHandler((request, reply) => {
        reply.code(404).send({
            error: "Route not found",
            path: request.url,
        });
    });

    fastify.setErrorHandler((error, request, reply) => {
        const statusCode = error.statusCode || 500;
        request.log.error(
            {
                path: request.url,
                method: request.method,
                errorType: error.name,
                errorMessage: error.message,
                statusCode,
            },
            "Request failed"
        );

        reply.code(statusCode).send({
            error: statusCode >= 500 ? "Internal Server Error" : error.message,
            path: request.url,
        });
    });
}
