# Libretto Operativo — Zedonk ↔ JOOR

App statica (HTML/CSS/JS puro, nessuna build) con il tuo libretto di
istruzioni e un'area note personali sincronizzata tra dispositivi.

---

## 1. Pubblicare su GitHub Pages (link accessibile da ovunque)

1. Vai su [github.com](https://github.com) e crea un account se non ce l'hai.
2. Crea un nuovo repository (es. `libretto-zedonk-joor`).
   - Puoi impostarlo **pubblico**: non contiene dati sensibili tuoi,
     solo procedure — i tuoi appunti personali vivono su Firebase, non nel codice.
3. Carica tutti i file di questa cartella nel repository:
   - `index.html`
   - `style.css`
   - `app.js`
   - `data.js`
   - `firebase-config.js`
   - (puoi farlo trascinando i file nella pagina "Add file → Upload files" su GitHub, senza usare la riga di comando)
4. Vai su **Settings → Pages** del repository.
5. In "Build and deployment", seleziona **Deploy from a branch**, branch `main`, cartella `/root`.
6. Salva. Dopo 1-2 minuti il sito sarà live a un indirizzo tipo:
   `https://tuonomeutente.github.io/libretto-zedonk-joor/`

Questo è il link che potrai aprire da qualsiasi dispositivo.

---

## 2. Attivare il sync delle note tra dispositivi (Firebase — gratuito)

Senza questo passaggio l'app funziona lo stesso, ma le note restano
salvate solo nel browser del dispositivo che usi (non sincronizzate).

1. Vai su [console.firebase.google.com](https://console.firebase.google.com)
   e accedi con un account Google.
2. **Aggiungi progetto** → dagli un nome (es. `libretto-zedonk`) → crea.
   (Puoi disattivare Google Analytics, non serve.)
3. Nel menu laterale vai su **Build → Firestore Database** → **Crea database**.
   - Scegli la modalità **Produzione**, poi seleziona una regione vicina (es. `eur3`).
4. Vai su **Regole** (tab in alto in Firestore) e incolla queste regole,
   poi **Pubblica**:

   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /workspaces/{workspace}/notes/{note} {
         allow read, write: if true;
       }
     }
   }
   ```

   ⚠️ **Nota sulla sicurezza**: queste regole sono aperte — chiunque
   conosca il tuo "codice workspace" (quello che imposti nell'app)
   può leggere/scrivere quelle note. Per uso personale va bene, ma
   scegli un codice workspace non banale (es. `giulia-zedonk-9214`
   invece di `note`), un po' come una password debole ma sufficiente.

5. Torna alla Panoramica del progetto → icona **`</>`** (Aggiungi app web).
   Dagli un nickname, non serve Firebase Hosting, clicca "Registra app".
6. Copia l'oggetto `firebaseConfig` che ti viene mostrato — è simile a:

   ```js
   const firebaseConfig = {
     apiKey: "AIzaSy...",
     authDomain: "libretto-zedonk.firebaseapp.com",
     projectId: "libretto-zedonk",
     storageBucket: "libretto-zedonk.appspot.com",
     messagingSenderId: "...",
     appId: "..."
   };
   ```

7. Apri il file `firebase-config.js` nel repository (puoi modificarlo
   direttamente su GitHub, cliccando sulla matita ✏️) e incolla questi
   valori al posto di `null`, cioè cambia:

   ```js
   const firebaseConfig = null;
   ```

   in:

   ```js
   const firebaseConfig = {
     apiKey: "...",
     authDomain: "...",
     projectId: "...",
     storageBucket: "...",
     messagingSenderId: "...",
     appId: "..."
   };
   ```

8. Salva ("Commit changes" su GitHub). Dopo qualche secondo GitHub Pages
   si aggiorna da solo con la nuova versione.

---

## 3. Usare le note sincronizzate

1. Apri il sito, clicca **📝 Note personali** in basso a destra.
2. Inserisci un **codice workspace** a tua scelta (es. `marta-2026`) e
   premi Salva.
3. Su ogni altro dispositivo, apri lo stesso sito e inserisci **lo
   stesso codice workspace**: ritroverai le stesse note, aggiornate
   in tempo reale.

---

## 4. Aggiornare i contenuti del libretto

Tutte le procedure sono in `data.js`, come un semplice elenco di
sezioni → gruppi → step. Per modificarle basta editare quel file
(anche direttamente su GitHub, senza strumenti particolari) e salvare
— nessuna conoscenza di programmazione avanzata richiesta, è solo testo.
