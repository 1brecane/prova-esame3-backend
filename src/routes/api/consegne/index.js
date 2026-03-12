import { randomBytes } from "crypto";

async function consegneRoutes(fastify) {
    const db = fastify.db;

    // Lista tutte le consegne
    fastify.get(
        "/",
        {
            schema: { 
                tags: ["Consegne"],
                querystring: {
                    type: 'object',
                    properties: {
                        stato: { type: 'string' },
                        cliente: { type: 'integer' }
                    }
                }
            },
            onRequest: [fastify.authenticate],
        },
        async (request, reply) => {
            const { stato, cliente } = request.query || {};
            
            let sql = "SELECT * FROM Consegne";
            const params = [];
            const conditions = [];

            if (stato) {
                conditions.push("Stato = ?");
                params.push(stato);
            }

            if (cliente) {
                conditions.push("ClienteID = ?");
                params.push(cliente);
            }

            if (conditions.length > 0) {
                sql += " WHERE " + conditions.join(" AND ");
            }

            const fields = await db.query(sql, params);
            return fields;
        },
    );

    // Ottieni una consegna con un id
    fastify.get(
        "/:id",
        {
            schema: {
                tags: ["Consegne"],
                params: {
                    type: "object",
                    properties: {
                        id: { type: "integer" },
                    },
                },
            },
            onRequest: [fastify.authenticate],
        },
        async (request, reply) => {
            const { id } = request.params;
            const fields = await db.query(
                "SELECT * FROM Consegne WHERE ConsegnaID = ?",
                [id],
            );
            if (fields.length === 0) {
                return reply.code(404).send({ error: "Campo non trovato" });
            }
            return fields[0];
        },
    );

    // Crea nuova consegna
    fastify.post(
        "/",
        {
            schema: {
                tags: ["Consegne"],
                body: {
                    type: "object",
                    required: ["ClienteID", "DataRitiro", "DataConsegna"],
                    properties: {
                        ClienteID: { type: "integer" },
                        DataRitiro: { type: "string", format: "date" },
                        DataConsegna: { type: "string", format: "date" },
                        Stato: { type: "string", enum: ["da ritirare", "in deposito", "in consegna", "consegnato", "in giacenza"]}
                    },
                },
            },
            onRequest: [fastify.authenticate],
        },
        async (request, reply) => {
            const { ClienteID, DataRitiro, DataConsegna, Stato } = request.body || {};

            // Validazione campi obbligatori
            if (!ClienteID || !DataRitiro || !DataConsegna ) {
                return reply
                    .code(400)
                    .send({
                        error: "ClienteID, DataRititro e DataConsegna sono obbligatori",
                    });
            }
            // Validazione Cliente
            const cliente = await db.query("SELECT * FROM Clienti WHERE ClienteID = ?", [ClienteID]);
            if (cliente.length === 0) {
                return reply.code(404).send({ error: "Cliente non trovato" });
            }
            // Validazione date
            if( DataRitiro > DataConsegna) {
                return reply
                    .code(400)
                    .send({
                        error: "La data del ritiro del corriere non può essere dopo la consegna al cliente",
                    });
            }

            const ChiaveConsegna = randomBytes(4).toString("hex").toUpperCase()

            const result = await db.execute(
                "INSERT INTO Consegne (ClienteID, DataRitiro, DataConsegna, Stato, ChiaveConsegna) VALUES (?, ?, ?, ?, ?)",
                [
                    ClienteID,
                    DataRitiro,
                    DataConsegna,
                    Stato,
                    ChiaveConsegna
                ],
            );

            return reply.code(201).send({
                ConsegnaID: result.insertId,
                ClienteID,
                DataRitiro,
                DataConsegna,
                Stato,
                ChiaveConsegna,
            });
        },
    );

    // Aggiorna consegna
    fastify.put(
        "/:id",
        {
            schema: {
                tags: ["Consegne"],
                params: {
                    type: "object",
                    properties: {
                        id: { type: "integer" },
                    },
                },
                body: {
                    type: "object",
                    properties: {
                        ClienteID: { type: "integer" },
                        DataRitiro: { type: "string", format: "date" },
                        DataConsegna: { type: "string", format: "date" },
                        Stato: { type: "string",  enum: ["da ritirare", "in deposito", "in consegna", "consegnato", "in giacenza"] }
                    },
                },
            },
            onRequest: [fastify.authenticate],
        },
        async (request, reply) => {
            const { id } = request.params;
            const { ClienteID, DataRitiro, DataConsegna, Stato } = request.body || {};

            // Validazione Cliente
            const cliente = await db.query("SELECT * FROM Clienti WHERE ClienteID = ?", [ClienteID]);
            if (cliente.length === 0) {
                return reply.code(404).send({ error: "Cliente non trovato" });
            }
            // Validazione date
            if( DataRitiro > DataConsegna) {
                return reply
                    .code(400)
                    .send({
                        error: "La data del ritiro del corriere non può essere dopo la consegna al cliente",
                    });
            }

            const result = await db.execute(
                "UPDATE Consegne SET ClienteID = ?, DataRitiro = ?, DataConsegna = ?, Stato = ? WHERE ConsegnaID = ?",
                [ClienteID, DataRitiro, DataConsegna, Stato, id],
            );

            if (result.affectedRows === 0) {
                return reply.code(404).send({ error: "Consegna non trovata" });
            }

            return { message: "Consegna aggiornata" };
        },
    );

    // Elimina consegna
    fastify.delete(
        "/:id",
        {
            schema: {
                tags: ["Consegne"],
                params: {
                    type: "object",
                    properties: {
                        id: { type: "integer" },
                    },
                },
            },
            onRequest: [fastify.authenticate],
        },
        async (request, reply) => {
            const { id } = request.params;
            const result = await db.execute(
                "DELETE FROM Consegne WHERE ConsegnaID = ?",
                [id],
            );

            if (result.affectedRows === 0) {
                return reply.code(404).send({ error: "Cosnegna non trovata" });
            }

            return { message: "Consegna eliminata" };
        },
    );
}

export default consegneRoutes;
