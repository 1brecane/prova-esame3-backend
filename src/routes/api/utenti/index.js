import bcrypt from "bcryptjs";
import { signUserToken } from "../../../hooks/auth.js";

const PASSWORD_MIN_LENGTH = 6;

async function utentiRoutes(fastify) {
    const db = fastify.db;

    // Login (API pubblica)
    fastify.post(
        "/login",
        {
            schema: {
                tags: ["Utenti"],
                body: {
                    type: "object",
                    required: ["Email", "Password"],
                    properties: {
                        Email: { type: "string", format: "email" },
                        Password: { type: "string" },
                    },
                },
            },
        },
        async (request, reply) => {
            const { Email, Password } = request.body || {};

            if (!Email || !Password) {
                return reply
                    .code(400)
                    .send({ error: "Email e Password sono obbligatorie" });
            }

            const rows = await db.query(
                "SELECT UtenteID, Email, Password, Admin FROM Utenti WHERE Email = ?",
                [Email],
            );
            const user = rows[0];

            if (!user) {
                return reply
                    .code(401)
                    .send({ error: "Credenziali non valide" });
            }

            const ok = await bcrypt.compare(Password, user.Password);
            if (!ok) {
                return reply
                    .code(401)
                    .send({ error: "Credenziali non valide" });
            }

            const token = signUserToken(user);

            return reply.send({
                token,
                utente: {
                    UtenteID: user.UtenteID,
                    Email: user.Email,
                    Admin: !!user.Admin,
                },
            });
        },
    );

    // --- Gestione solo amministratore ---

    // Lista degli utenti
    fastify.get(
        "/",
        {
            schema: { tags: ["Utenti"] },
            onRequest: [fastify.authenticate, fastify.authorizeAdmin],
        },
        async (request, reply) => {
            const users = await db.query(
                "SELECT UtenteID, Email, Admin FROM Utenti",
            );
            return users;
        },
    );

    // Crea nuovo utente
    fastify.post(
        "/",
        {
            schema: {
                tags: ["Utenti"],
                body: {
                    type: "object",
                    required: ["Email", "Password"],
                    properties: {
                        Email: { type: "string", format: "email" },
                        Password: { type: "string", minLength: 6 },
                        Admin: { type: "boolean" },
                    },
                },
            },
            onRequest: [fastify.authenticate, fastify.authorizeAdmin],
        },
        async (request, reply) => {
            const { Email, Password, Admin } = request.body || {};

            // Validazione email e password
            if (!Email || !Password) {
                return reply.code(400).send({
                    error: "Email e Password sono obbligatori",
                });
            }
            // Validazione lunghezza password
            if (Password.length < PASSWORD_MIN_LENGTH) {
                return reply.code(400).send({
                    error: `Password troppo corta (min ${PASSWORD_MIN_LENGTH})`,
                });
            }
            // Validazione formato email
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(Email)) {
                return reply
                    .code(400)
                    .send({ error: "Formato email non valido" });
            }

            const isAdmin = Admin === true;

            // Controlla se la mail è già registrata
            const existing = await db.query(
                "SELECT UtenteID FROM Utenti WHERE Email = ?",
                [Email],
            );
            if (existing.length > 0) {
                return reply.code(409).send({ error: "Email già registrata" });
            }

            const password = await bcrypt.hash(Password, 10);

            const result = await db.query(
                `
            INSERT INTO Utenti (Email, Password, Admin)
            VALUES (?, ?, ?)
        `,
                [Email, password, isAdmin],
            );

            return reply.code(201).send({
                UtenteID: result.insertId,
                Email,
                Admin: isAdmin,
            });
        },
    );

    // Aggiorna utente
    fastify.put(
        "/:id",
        {
            schema: {
                tags: ["Utenti"],
                params: {
                    type: "object",
                    properties: {
                        id: { type: "integer" },
                    },
                },
                body: {
                    type: "object",
                    required: ["Email"],
                    properties: {
                        Email: { type: "string", format: "email" },
                        Password: { type: "string", minLength: 6 },
                        Admin: { type: "boolean" },
                    },
                },
            },
            onRequest: [fastify.authenticate, fastify.authorizeAdmin],
        },
        async (request, reply) => {
            const { id } = request.params;
            const { Email, Password, Admin } = request.body || {};

            // Validazione email
            if (!Email) {
                return reply.code(400).send({
                    error: "Campo email obbligatorio",
                });
            }

            const password = Password;
            // Validazione lunghezza password
            if (password) {
                if (password.length < PASSWORD_MIN_LENGTH) {
                    return reply.code(400).send({
                        error: `Password troppo corta (min ${PASSWORD_MIN_LENGTH})`,
                    });
                }
            }

            // Validazione formato email
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(Email)) {
                return reply
                    .code(400)
                    .send({ error: "Formato email non valido" });
            }

            const isAdmin = Admin === true;

            // Controlla se la mail è già registrata
            const existing = await db.query(
                "SELECT UtenteID FROM Utenti WHERE Email = ? AND UtenteID != ?",
                [Email, id],
            );
            if (existing.length > 0) {
                return reply.code(409).send({ error: "Email già registrata" });
            }

            let sql = "UPDATE Utenti SET Email = ?, Admin = ?";
            const params = [Email, isAdmin];

            if (password) {
                sql += ", Password = ?";
                params.push(password);
            }

            sql += " WHERE UtenteID = ?";
            params.push(id);

            const result = await db.execute(sql, params);

            if (result.affectedRows === 0) {
                return reply.code(404).send({ error: "Utente non trovato" });
            }

            return { message: "Utente aggiornato" };
        },
    );

    // Elimina utente
    fastify.delete(
        "/:id",
        {
            schema: { tags: ["Utenti"] },
            onRequest: [fastify.authenticate, fastify.authorizeAdmin],
        },
        async (request, reply) => {
            const { id } = request.params;

            const result = await db.execute(
                "DELETE FROM Utenti WHERE UtenteID = ?",
                [id],
            );

            if (result.affectedRows === 0) {
                return reply.code(404).send({ error: "Utente non trovato" });
            }

            return { message: "Utente eliminato" };
        },
    );
}

export default utentiRoutes;
