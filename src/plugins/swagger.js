import fp from "fastify-plugin";
import path from "path";
import { fileURLToPath } from "url";
import fastifySwagger from "@fastify/swagger";
import fastifySwaggerUi from "@fastify/swagger-ui";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const swaggerPath = path.resolve(currentDir, "../../swagger.yaml");
const swaggerBaseDir = path.resolve(currentDir, "../..");

export default fp(async function swaggerPlugin(fastify, options) {
    await fastify.register(fastifySwagger, {
        mode: "static",
        specification: {
            path: swaggerPath,
            baseDir: swaggerBaseDir,
        },
        exposeRoute: true,
    });

    fastify.register(fastifySwaggerUi, {
        routePrefix: "/docs",
    });
});
