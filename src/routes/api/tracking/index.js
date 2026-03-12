async function trackingRoutes(fastify) {
    const db = fastify.db;

    // Get tracking
    fastify.get("/:ChiaveConsegna/:DataRitiro", { 
        schema: { 
            tags: ["Tracking"],
            params: {
                type: 'object',
                properties: {
                    ChiaveConsegna: { type: 'string' },
                    DataRitiro: { type: 'string', format: 'date'}
                }
            }
        },
    }, async (request, reply) => {
        const { ChiaveConsegna, DataRitiro } = request.params;
        const trackings = await db.query(
            `SELECT C.Stato, C.DataRitiro, C.DataConsegna, CL.Nominativo, CL.Via, CL.Comune, CL.Provincia 
             FROM Consegne C
             JOIN Clienti CL ON C.ClienteID = CL.ClienteID
             WHERE C.ChiaveConsegna = ? AND C.DataRitiro = ?`, 
            [ChiaveConsegna, DataRitiro]
        );
        console.log("Tracking result:", trackings);
        if (trackings.length === 0) {
            return reply.code(404).send({ error: "Consegna non trovata" });
        }
        return trackings[0];
    });

}

export default trackingRoutes;
