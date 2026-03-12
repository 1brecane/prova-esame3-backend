import Fastify from "fastify";
import autoload from "@fastify/autoload";
import fastifySwagger from "@fastify/swagger";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function generate() {
	const fastify = Fastify({
		logger: true,
	});
	try {
        // Mock DB and Auth for swagger generation
        fastify.decorate("db", {
            query: async () => [],
            execute: async () => ({ insertId: 1, affectedRows: 1 }),
            getConnection: async () => ({ release: () => {} })
        });
        
        fastify.decorate("authenticate", async (req, reply) => {});
        fastify.decorate("authorizeAdmin", async (req, reply) => {});

		await fastify.register(fastifySwagger, {
			openapi: {
				info: {
					title: "Backend prova esame - Gestire delle consegne di un corriere espresso",
					description: "API documentation generated from Fastify route schemas",
					version: process.env.npm_package_version || "0.0.1",
				},
				servers: [{ url: "http://localhost:3000" }],
                components: {
                    securitySchemes: {
                        bearerAuth: {
                            type: 'http',
                            scheme: 'bearer',
                            bearerFormat: 'JWT'
                        }
                    }
                },
                security: [{ bearerAuth: [] }]
			},
			exposeRoute: false,
		});

		await fastify.register(autoload, {
			dir: path.join(path.resolve(), "src/routes"),
			options: {},
		});

		await fastify.ready();

		const yaml = fastify.swagger({ yaml: true });
		const outPath = path.resolve(
			path.join(__dirname, "../..", "swagger.yaml")
		);
		await fs.promises.writeFile(outPath, yaml, "utf8");

		await fastify.close();

		fastify.log.info(`Swagger spec generated at ${outPath}`);
	} catch (err) {
		fastify.log.error(err);
		process.exit(1);
	}
}

await generate();
