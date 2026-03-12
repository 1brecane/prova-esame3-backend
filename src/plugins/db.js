import fp from "fastify-plugin";
import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";

async function initSchema(connection) {
    // Utenti
    await connection.execute(`
        CREATE TABLE IF NOT EXISTS Utenti (
            UtenteID INT AUTO_INCREMENT PRIMARY KEY,
            Email VARCHAR(255) NOT NULL UNIQUE,
            Password VARCHAR(255) NOT NULL,
            Admin BOOLEAN NOT NULL DEFAULT FALSE
        )
    `);

    // Clienti
    await connection.execute(`
        CREATE TABLE IF NOT EXISTS Clienti (
            ClienteID INT AUTO_INCREMENT PRIMARY KEY,
            Nominativo VARCHAR(100) NOT NULL,
            Via VARCHAR(100) NOT NULL,
            Comune VARCHAR(100) NOT NULL,
            Provincia VARCHAR(100) NOT NULL,
            Telefono VARCHAR(20),
            Email VARCHAR(255),
            Note TEXT
        )
    `);

    // Consegne
    await connection.execute(`
        CREATE TABLE IF NOT EXISTS Consegne (
            ConsegnaID INT AUTO_INCREMENT PRIMARY KEY,
            ClienteID INT NOT NULL,
            DataRitiro DATE NOT NULL,
            DataConsegna DATE NOT NULL,
            Stato VARCHAR(20),
            ChiaveConsegna VARCHAR(255),
            FOREIGN KEY (ClienteID) REFERENCES Clienti(ClienteID)
        )
    `);
}

async function seedData(connection) {
    // Check if we have operators
    const [rows] = await connection.execute(
        "SELECT COUNT(*) as count FROM Utenti",
    );
    if (rows[0].count > 0) {
        return;
    }

    console.log("Seeding database...");

    // Seed Utenti
    const passwordUser = await bcrypt.hash("password", 10);

    await connection.execute(
        `
        INSERT INTO Utenti (Email, Password, Admin) VALUES 
        ('admin@express.it', ?, TRUE),
        ('user1@express.it', ?, FALSE),
        ('user2@express.it', ?, FALSE)
    `,
        [passwordUser, passwordUser, passwordUser],
    );

    // Seed Clienti
    await connection.execute(`
        INSERT INTO Clienti (Nominativo, Via, Comune, Provincia, Telefono, Email, Note) VALUES 
        ('Mario Rossi', 'Via Roma 17', 'Roma', 'Roma', '3339876543', 'mariorossi@email.com', 'Cliente abituale'),
        ('Gianluca Botty', 'Via Brombeis 400/A', 'Napoli', 'Napoli', '11222333344444', 'gianluchinobotty400@email.com', 'Manager zoo "Le giraffe"'),
        ('Luigi Verdi', 'Corso Italia 10', 'Milano', 'Milano', '3331112223', 'luigiverdi@email.com', 'Preferisce consegna mattutina'),
        ('Anna Bianchi', 'Piazza San Marco 5', 'Venezia', 'Venezia', '3334445556', 'annabianchi@email.com', NULL),
        ('Giovanni Neri', 'Via Garibaldi 20', 'Torino', 'Torino', '3337778889', 'giovannineri@email.com', 'Citofono rotto'),
        ('Elena Gialli', 'Viale dei Pini 3', 'Firenze', 'Firenze', '3330001112', 'elenagialli@email.com', 'Negozio di fiori'),
        ('Francesco Blu', 'Via Dante 15', 'Bologna', 'Bologna', '3332223334', 'francescoblu@email.com', NULL),
        ('Maria Rosa', 'Corso Vittorio Emanuele 8', 'Palermo', 'Palermo', '3335556667', 'mariarosa@email.com', 'Piano terra'),
        ('Paolo Arancio', 'Via Mazzini 12', 'Genova', 'Genova', '3338889990', 'paoloarancio@email.com', 'Ufficio'),
        ('Laura Viola', 'Piazza del Duomo 1', 'Verona', 'Verona', '3331234567', 'lauraviola@email.com', 'Bar all angolo'),
        ('Roberto Marrone', 'Via dei Mille 4', 'Bari', 'Bari', '3339871234', 'robertomarrone@email.com', NULL),
        ('Simona Grigio', 'Viale Kennedy 7', 'Cagliari', 'Cagliari', '3336549870', 'simonagrigio@email.com', 'Lasciare in portineria')
    `);

 
}

export default fp(async function dbPlugin(fastify, options) {
    const poolConfig = process.env.DATABASE_URL || {
        host: process.env.DB_HOST || "localhost",
        port: Number(process.env.DB_PORT || 3306),
        user: process.env.DB_USER || "root",
        password: process.env.DB_PASSWORD || "password",
        database: process.env.DB_NAME || "corriere_espresso",
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
    };
    const pool = mysql.createPool(poolConfig);

    let connection;
    let retries = 10;

    while (retries > 0) {
        try {
            connection = await pool.getConnection();
            fastify.log.info("Database connected successfully");
            await initSchema(connection);
            await seedData(connection);
            break;
        } catch (err) {
            retries--;
            fastify.log.warn(
                `Database connection failed. Retries left: ${retries}. Error: ${err.message}`,
            );
            if (retries === 0) {
                fastify.log.error(
                    "Could not connect to database after multiple attempts",
                );
                throw err;
            }
            await new Promise((resolve) => setTimeout(resolve, 5000));
        } finally {
            if (connection) connection.release();
        }
    }

    fastify.decorate("db", {
        pool,
        async query(sql, params) {
            const [rows] = await pool.query(sql, params);
            return rows;
        },
        async execute(sql, params) {
            const [result] = await pool.execute(sql, params);
            return result;
        },
        async getConnection() {
            return pool.getConnection();
        },
    });

    fastify.addHook("onClose", async () => {
        await pool.end();
    });
});
