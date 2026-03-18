async function clientiRoutes(fastify) {
    const db = fastify.db;

    // Lista di tutti i clienti
    fastify.get("/", { 
        schema: { tags: ["Clienti"] },
        onRequest: [fastify.authenticate] 
    }, async (request, reply) => {
        const clients = await db.query("SELECT * FROM Clienti");
        return clients;
    });

    // Get client by ID
    fastify.get("/:id", { 
        schema: { 
            tags: ["Clienti"],
            params: {
                type: 'object',
                properties: {
                    id: { type: 'integer' }
                }
            }
        },
        onRequest: [fastify.authenticate] 
    }, async (request, reply) => {
        const { id } = request.params;
        const clients = await db.query("SELECT * FROM Clienti WHERE ClienteID = ?", [id]);
        if (clients.length === 0) {
            return reply.code(404).send({ error: "Cliente non trovato" });
        }
        return clients[0];
    });

    // Crea nuovo cliente
    fastify.post("/", { 
        schema: { 
            tags: ["Clienti"],
            body: {
                type: 'object',
                required: ['Nominativo', 'Via', 'Comune', 'Provincia'],
                properties: {
                    Nominativo: { type: 'string' },
                    Via: { type: 'string' },
                    Comune: { type: 'string' },
                    Provincia: { type: 'string' },
                    Telefono: { type: 'string' },
                    Email: { type: 'string', format: 'email' },
                    Note: { type: 'string' }
                }
            }
        },
        onRequest: [fastify.authenticate] 
    }, async (request, reply) => {
        const { Nominativo, Via, Comune, Provincia, Telefono, Email, Note } = request.body || {};

        if (!Nominativo || !Via || !Comune || !Provincia) {
            return reply.code(400).send({ error: "Il nominativo , la via, il comune e la provincia sono obbligatori" });
        }
        // Validazione formato mail
        if (Email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(Email)) {
            return reply.code(400).send({ error: "Formato email non valido" });
        }

        const result = await db.execute(
            "INSERT INTO Clienti (Nominativo, Via, Comune, Provincia, Telefono, Email, Note) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [Nominativo, Via, Comune, Provincia, Telefono, Email, Note]
        );

        return reply.code(201).send({
            ClienteID: result.insertId,
            Nominativo,
            Via,
            Comune,
            Provincia,
            Telefono,
            Email,
            Note
        });
    });

    // Modifica intero cliente
    fastify.put("/:id", { 
        schema: { 
            tags: ["Clienti"],
            params: {
                type: 'object',
                properties: {
                    id: { type: 'integer' }
                }
            },
            body: {
                type: 'object',
                properties: {
                    Nominativo: { type: 'string' },
                    Via: { type: 'string' },
                    Comune: { type: 'string' },
                    Provincia: { type: 'string' },
                    Telefono: { type: 'string' },
                    Email: { type: 'string', format: 'email' },
                    Note: { type: 'string' }
                }
            }
        },
        onRequest: [fastify.authenticate] 
    }, async (request, reply) => {
        const { id } = request.params;

        const { Nominativo, Via, Comune, Provincia, Telefono, Email, Note } = request.body || {};

        if (!Nominativo || !Via || !Comune || !Provincia) {
            return reply.code(400).send({ error: "Il nominativo , la via, il comune e la provincia sono obbligatori" });
        }
        // Validazione formato mail
        if (Email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(Email)) {
            return reply.code(400).send({ error: "Formato email non valido" });
        }

        const result = await db.execute(
            "UPDATE Clienti SET Nominativo = ?, Via = ?, Comune = ?, Provincia =?,  Telefono = ?, Email = ?, Note = ? WHERE ClienteID = ?",
            [Nominativo, Via, Comune, Provincia, Telefono, Email, Note, id]
        );

        if (result.affectedRows === 0) {
            return reply.code(404).send({ error: "Cliente non trovato" });
        }

        return { message: "Cliente aggiornato" };
    });

    // Elimina cliente
    fastify.delete("/:id", { 
        schema: { 
            tags: ["Clienti"],
            params: {
                type: 'object',
                properties: {
                    id: { type: 'integer' }
                }
            }
        },
        onRequest: [fastify.authenticate] 
    }, async (request, reply) => {
        const { id } = request.params;
 
        // Controllo se ci sono consegne associate al cliente
        const consegne = await db.query("SELECT ConsegnaID FROM Consegne WHERE ClienteID = ?", [id]);
        if (consegne.length > 0) {
            return reply.code(409).send({ error: "Impossibile eliminare il cliente: esistono consegne associate" });
        }

        const result = await db.execute("DELETE FROM Clienti WHERE ClienteID = ?", [id]);
        
        if (result.affectedRows === 0) {
            return reply.code(404).send({ error: "Cliente non trovato" });
        }

        return { message: "Cliente eliminato" };
    });
}

export default clientiRoutes;
