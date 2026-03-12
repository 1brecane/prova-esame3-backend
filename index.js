import Fastify from "fastify";
import autoload from "@fastify/autoload";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import path from "path";
import "dotenv/config";
import { fileURLToPath } from "url";
import { setupErrorHandlers } from "./src/hooks/errorHandler.js";
import { authHook } from "./src/hooks/auth.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const fastify = Fastify({
    pluginTimeout: 60000,
    logger: {
        level: "debug",
        transport: process.env.NODE_ENV !== 'production' ? {
            target: "pino-pretty",
            options: {
                translateTime: "SYS:HH:MM:ss Z",
                ignore: "pid,hostname",
                singleLine: true,
                minimumLevel: "debug",
            },
        } : undefined,
        sync: true,
    }
});

const start = async () => {
    try {
        // CORS per permettere richieste dal frontend
        await fastify.register(cors, {
            origin: true, // Permette tutte le origini (in produzione specificare le origini)
            credentials: true,
        });
        await fastify.register(helmet, { global: true });
        await fastify.register(import("@fastify/sensible"));

        const FASTIFY_PORT = process.env.PORT || process.env.FASTIFY_PORT || 3000;
        const FASTIFY_HOST = process.env.FASTIFY_HOST || "0.0.0.0";

        setupErrorHandlers(fastify);

        await fastify.register(autoload, {
            dir: path.join(__dirname, "src/plugins"),
            options: {},
        });

        authHook(fastify);

        await fastify.register(autoload, {
            dir: path.join(__dirname, "src/routes"),
            options: {},
        });

        await fastify.listen({ port: FASTIFY_PORT, host: FASTIFY_HOST });
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};

const closeServer = () => {
    fastify.log.info("Closing server...");

    const forceKillTimeout = setTimeout(() => {
        fastify.log.warn("Force closing server after timeout");
        throw new Error("Server timeout");
    }, 5000);

    fastify
        .close()
        .then(() => {
            clearTimeout(forceKillTimeout);
            process.exit(0);
        })
        .catch((err) => {
            clearTimeout(forceKillTimeout);
            console.error(err);
            throw new Error("Server close failed");
        });
};

process.on("SIGINT", closeServer);
process.on("SIGTERM", closeServer);

start();
