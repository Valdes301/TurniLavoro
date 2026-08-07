# TurniLavoro 📅 - Guida Docker Compose (GitHub Build) & Raspberry Pi

Applicazione completa e moderna per la gestione dei turni lavorativi, calcolo automatico di ore lavorate, straordinari, maggiorazioni notturne/festive, gestione ferie e permessi ROL, con **estrazione automatica degli orari tramite Intelligenza Artificiale (Google Gemini)**.

---

## 🛠️ Codice `docker-compose.yml`

Salva il seguente codice YAML nel file `/appdata/turnilavoro/docker-compose.yml`:

```yaml
services:
  turnilavoro:
    build:
      context: https://github.com/Valdes301/TurniLavoro.git#main
    container_name: turnilavoro
    restart: unless-stopped
    image: turnilavoro:v1.0
    ports:
      - "2008:3000"
    labels:
      - "com.centurylinklabs.watchtower.enable=false"
    environment:
      - GEMINI_API_KEY=inserisci_qui_la_tua_chiave
      - NODE_ENV=production
      - PORT=3000
    volumes:
      - /appdata/turnilavoro/data:/app/data
```

---

## 🚀 Guida di Installazione Rapida su Raspberry Pi / Server Linux

### 1. Prerequisiti
Se non hai ancora installato Docker sul tuo Raspberry Pi o server Linux, installalo con il comando ufficiale:

```bash
curl -sSL https://get.docker.com | sh
```

### 2. Comando Unico di Creazione e Avvio
Copia ed esegui questo comando nel terminale del tuo Raspberry Pi per creare la struttura delle cartelle, salvare la configurazione YAML e avviare il container tramite GitHub build sulla porta **2008**:

```bash
mkdir -p /appdata/turnilavoro/data && cd /appdata/turnilavoro

cat << 'EOF' > docker-compose.yml
services:
  turnilavoro:
    build:
      context: https://github.com/Valdes301/TurniLavoro.git#main
    container_name: turnilavoro
    restart: unless-stopped
    image: turnilavoro:v1.0
    ports:
      - "2008:3000"
    labels:
      - "com.centurylinklabs.watchtower.enable=false"
    environment:
      - GEMINI_API_KEY=inserisci_qui_la_tua_chiave
      - NODE_ENV=production
      - PORT=3000
    volumes:
      - /appdata/turnilavoro/data:/app/data
EOF

docker compose up -d --build
```

### 3. Accesso all'App
Apri il browser da qualsiasi smartphone, tablet o PC connesso alla rete di casa:
```
http://<IP-DEL-TUO-RASPBERRY>:2008
```

---

## 📅 Estrazione AI dei Turni da PDF / Foto senza Data o Multi-Dipendente

Se il tuo prospetto turni in PDF o foto non contiene la data completa o contiene l'elenco di molti dipendenti (es. `ALBIERO`, `BASSI`, `DE STEFANI`...):

1. **Selezione Dipendente/Cognome**: Nella schermata di estrazione IA, puoi inserire il tuo cognome (es. `BASSI`). L'IA cercherà esattamente la tua riga nella tabella.
2. **Data del Lunedì (Inizio Settimana)**: Se il foglio riporta solo la settimana (es. `Week 31` o i giorni `27, 28, 29, 30, 31, 1, 2`), inserisci la data del Lunedì corrispondente (es. `2026-07-27`). L'IA calcolerà esattamente tutti i giorni della settimana (Lunedì 27/07, Martedì 28/07, ... Domenica 02/08).
3. **Turni Doppi / Spezzati**: L'IA rileva automaticamente se nello stesso giorno hai più fasce orarie e genera i turni corrispondenti.

---

## 🔄 Come Aggiornare l'App quando Modifichi il Codice su GitHub

Poiché il `docker-compose.yml` è collegato al contesto remoto GitHub (`https://github.com/Valdes301/TurniLavoro.git#main`), per applicare nuovi aggiornamenti rilasciati sul tuo repository GitHub basta eseguire un singolo comando:

```bash
cd /appdata/turnilavoro
docker compose build --no-cache && docker compose up -d
```

---

## 💾 Archiviazione Dati Locale e Permanente (`database.json`)

Tutti i dati dell'applicazione (turni inseriti, note, opzioni contrattuali, ferie e presettaggi) vengono salvati in tempo reale nel file JSON locale:
`/appdata/turnilavoro/data/database.json`

Grazie al volume montato (`/appdata/turnilavoro/data:/app/data`), i tuoi dati **rimangono salvati in modo permanente** sul disco/SD del tuo Raspberry Pi.

---

## 🔑 Gestione della Chiave AI Gemini (`GEMINI_API_KEY`)

1. Ottieni una chiave API gratuita su [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Forniscila nel file `docker-compose.yml` tramite l'ambiente `GEMINI_API_KEY` oppure direttamente nell'app dalla pagina Impostazioni.
