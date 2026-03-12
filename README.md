# Gestione Prenotazioni Centro Sportivo - Backend

Questo è il backend per l'applicazione di gestione delle consegne di un corriere espresso.

## Requisiti

- Node.js (v18+)
- MySQL

## Installazione e Avvio Locale

1.  Clona il repository.
2.  Installa le dipendenze:
    ```bash
    npm install
    ```
3.  Crea un file `.env` (opzionale, vedi variabili d'ambiente sotto) o configura le variabili nel tuo ambiente.
4.  Avvia il server:
    ```bash
    npm run dev
    ```

## Variabili d'Ambiente

| Variabile | Descrizione | Default |
| :--- | :--- | :--- |
| `PORT` | Porta del server | `3000` |
| `DATABASE_URL` | URL di connessione al database (es. `mysql://user:pass@host:port/db`) | - |
| `DB_HOST` | Host del database (se non usi `DATABASE_URL`) | `localhost` |
| `DB_PORT` | Porta del database | `3306` |
| `DB_USER` | Utente del database | `root` |
| `DB_PASSWORD` | Password del database | `password` |
| `DB_NAME` | Nome del database | `corriere_espresso` |
| `JWT_SECRET` | Segreto per firmare i token JWT | `default-secret` (CAMBIARE IN PRODUZIONE!) |
| `JWT_EXPIRE` | Durata del token JWT | `8h` |

## Deploy su Railway

1.  Crea un nuovo progetto su [Railway](https://railway.app/).
2.  Collega il tuo repository GitHub.
3.  Aggiungi un servizio **MySQL** al progetto.
4.  Nel servizio del backend (questo repository), vai su **Variables** e aggiungi:
    -   `DATABASE_URL`: Copia il valore `MYSQL_URL` dal servizio MySQL.
    -   `JWT_SECRET`: Imposta una stringa segreta sicura.
    -   `JWT_EXPIRE`: (Opzionale) Imposta la durata del token.
5.  Railway rileverà automaticamente il `Dockerfile` e avvierà il deploy.
6.  Una volta completato, il servizio sarà accessibile all'URL fornito da Railway.

## Note

-   Il database viene inizializzato automaticamente all'avvio se le tabelle non esistono.
-   Vengono creati utenti di default (vedi `src/plugins/db.js`).
