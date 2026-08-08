// Contenuti del libretto — Ciclo Ordine JOOR ↔ Zedonk
// Ogni sezione = una "etichetta" nella nav laterale.
// Ogni step = una scheda nel docket. warn = avviso da verificare/attenzione.

const SECTIONS = [
  {
    id: "ciclo",
    tag: "01",
    title: "Ciclo Ordine",
    subtitle: "JOOR → Zedonk → spedizione → fattura",
    groups: [
      {
        label: "Fase A — Presa ordine su JOOR",
        steps: [
          {
            title: "Inserire articoli",
            body: "Apri il Linesheet, seleziona stile → colore → compila la griglia taglie con le quantità, poi 'Add to Order'.",
            detail: "Da web o da app iPad JOOR for Brands. Ripeti per ogni stile/colore.",
          },
          {
            title: "Approvare l'ordine",
            body: "In Orders, filtra per stato 'Pending', apri l'ordine, verifica i dati, approva (singolarmente o in blocco con Actions).",
            detail: "L'integrazione esporta l'ordine verso Zedonk UNA SOLA VOLTA, al momento dell'approvazione.",
            warn: "Non approvare finché l'ordine non è definitivo: modifiche successive non si risincronizzano da sole.",
          },
        ],
      },
      {
        label: "Fase B — Import in Zedonk",
        steps: [
          {
            title: "Attesa disponibilità",
            body: "JOOR rende disponibili gli ordini Approved/Shipped su base oraria; può volerci fino a un'ora.",
            detail: "Verifica che lo stato di export su JOOR mostri 'Success' prima di procedere.",
          },
          {
            title: "Trigger import",
            body: "Nel Connettore Zedonk, avvia manualmente il task 'Orders Import'.",
            detail: "Se un ordine non arriva: controlla prima lo stato export su JOOR, poi il log in Zedonk.",
            warn: "Non è automatico — qualcuno deve lanciarlo.",
          },
        ],
      },
      {
        label: "Fase C — Gestione ordine in Zedonk",
        steps: [
          {
            title: "Verifica ordine",
            body: "Apri l'ordine importato in Orders, controlla cliente, articoli, taglie, prezzi, sconti, data di consegna.",
            detail: "Il cliente deve avere Account Code coincidente al Customer Code JOOR (vedi sezione Clienti).",
          },
          {
            title: "Conferma d'ordine",
            body: "Genera il PDF 'Order Confirmation' dalla scheda ordine e invialo via email al cliente.",
            detail: "Vedi sezione Documenti per i dettagli.",
          },
        ],
      },
      {
        label: "Fase D — Spedizione e fatturazione",
        steps: [
          {
            title: "Allocazione / Pick",
            body: "L'ordine genera Pick Ticket e Delivery Note (DN) man mano che lo stock viene allocato.",
            detail: "Stato visibile nel popup riepilogativo dell'ordine: On Order, Shipped/Unshipped DNs, Pick Tickets, Balance, Allocated, Invoiced.",
          },
          {
            title: "Spedizione",
            body: "Marca la DN come spedita (Shipped) una volta partita la merce.",
            detail: "Vedi sezione Spedizioni per il dettaglio degli stati.",
          },
          {
            title: "Fatturazione",
            body: "Genera la fattura dalla DN spedita.",
            detail: "Chiude il ciclo: On Order = Invoiced quando tutto è stato fatturato.",
          },
        ],
      },
    ],
  },
  {
    id: "clienti",
    tag: "02",
    title: "Anagrafica Clienti",
    subtitle: "Creare un cliente e farlo comparire su JOOR",
    groups: [
      {
        label: "Creazione cliente",
        steps: [
          {
            title: "Creare in Zedonk",
            body: "Crea la scheda cliente in Zedonk con tutti i dati anagrafici.",
            detail: "Assegna obbligatoriamente un Account Code.",
            warn: "Senza Account Code il cliente NON viene incluso nella sincronizzazione con JOOR.",
          },
          {
            title: "Trigger export",
            body: "Nel Connettore, lancia il task 'Customer' per esportare il cliente verso JOOR.",
            detail: "Non è automatico al salvataggio: va avviato manualmente.",
          },
          {
            title: "Attesa elaborazione",
            body: "JOOR Data Services processa il nuovo record.",
            detail: "Tempo tipico: 2-3 giorni lavorativi (più lungo con liste lunghe di clienti insieme).",
          },
        ],
      },
      {
        label: "Aggiornamenti successivi",
        steps: [
          {
            title: "Modifiche cliente esistente",
            body: "Gli aggiornamenti si sincronizzano da Zedonk a JOOR automaticamente quando il task viene attivato su Zedonk.",
            detail: "Sempre tramite trigger manuale, non in tempo reale.",
          },
        ],
      },
      {
        label: "Attenzione",
        steps: [
          {
            title: "Corrispondenza codici",
            body: "L'Account Code su Zedonk deve corrispondere ESATTAMENTE al Customer Code su JOOR.",
            detail: "",
            warn: "Se non coincide, il sistema crea un cliente duplicato invece di aggiornare quello esistente.",
          },
        ],
      },
    ],
  },
  {
    id: "creazione",
    tag: "03",
    title: "Creazione Ordine",
    subtitle: "Inserire un ordine manualmente in Zedonk",
    groups: [
      {
        label: "Inserimento ordine",
        steps: [
          { title: "Apri sezione Orders", body: "Menu principale → Orders / Sales Orders → pulsante '+ New'.", detail: "" },
          { title: "Seleziona cliente", body: "Il cliente deve già esistere in anagrafica con Account Code assegnato.", detail: "Vedi sezione Clienti se manca ancora." },
          { title: "Dati testata", body: "Imposta stagione, data ordine, data di consegna richiesta, valuta, termini di pagamento/sconto.", detail: "" },
          { title: "Aggiungi articoli", body: "Cerca lo stile per codice/nome → seleziona colore → compila la griglia taglie con le quantità.", detail: "Stessa gerarchia di JOOR: Stile → Colore → Taglia." },
          { title: "Controllo totali", body: "Il sistema calcola automaticamente prezzi totali, sconti e IVA.", detail: "Verifica prima di salvare." },
          { title: "Salva", body: "L'ordine resta in stato 'aperto/pending' finché non viene confermato.", detail: "" },
          { title: "Conferma", body: "Conferma l'ordine per farlo entrare nel flusso di allocazione/produzione.", detail: "Da qui si generano Pick Ticket, DN, fatture." },
        ],
      },
    ],
  },
  {
    id: "documenti",
    tag: "04",
    title: "Conferma & Documenti",
    subtitle: "Proforma, conferma d'ordine, fattura, DN",
    groups: [
      {
        label: "Cosa sono",
        steps: [
          { title: "Documenti disponibili", body: "Zedonk genera: Proforma, Conferma d'Ordine, Fattura, Delivery Note.", detail: "Tutti in PDF, stampabili o inviabili via email dalla scheda ordine." },
        ],
      },
      {
        label: "Generare e inviare",
        steps: [
          { title: "Verifica dati", body: "Apri l'ordine → controlla cliente, articoli, taglie, quantità, prezzi, sconti, data di consegna.", detail: "" },
          { title: "Genera PDF", body: "Dalla scheda ordine, seleziona l'azione 'Order Confirmation' tra i documenti disponibili.", detail: "" },
          { title: "Invio", body: "Stampa oppure invia via email direttamente dal sistema.", detail: "L'invio manuale documento-per-documento è una funzione standard su ogni scheda ordine." },
        ],
      },
      {
        label: "Invio automatico / template",
        steps: [
          {
            title: "Configurazione avanzata",
            body: "Invio automatico e template email personalizzati sono impostazioni di sistema, in genere in un'area Amministrazione riservata.",
            detail: "",
            warn: "Non confermato nei dettagli pubblici. Verifica su Zedonkopedia o contatta il supporto Zedonk.",
          },
        ],
      },
    ],
  },
  {
    id: "spedizioni",
    tag: "05",
    title: "Spedizioni (DN)",
    subtitle: "Stati delle Delivery Note",
    groups: [
      {
        label: "Stati da conoscere",
        steps: [
          { title: "On Order", body: "Quantità totale ordinata.", detail: "" },
          { title: "Shipped DNs", body: "Delivery Note già spedite.", detail: "Verde nel grafico a ciambella." },
          { title: "Unshipped DNs", body: "Bolle create ma non ancora spedite.", detail: "Arancione — merce pronta/documentata ma manca la conferma di spedizione fisica." },
          { title: "Pick Tickets", body: "Documenti di prelievo magazzino generati.", detail: "Giallo/ambra." },
          { title: "Balance", body: "Quantità ancora da evadere/non assegnata.", detail: "Grigio." },
          { title: "Allocated", body: "Quantità riservata a magazzino per l'ordine.", detail: "Rosa/pesca." },
          { title: "Invoiced", body: "Quantità già fatturata.", detail: "Ciano/verde acqua." },
        ],
      },
      {
        label: "Marcare una DN come spedita",
        steps: [
          { title: "Individua la DN", body: "Nell'Order Tracker o dalla scheda ordine, trova la Delivery Note con stato 'Unshipped'.", detail: "" },
          { title: "Apri la DN", body: "Apri il documento specifico.", detail: "" },
          {
            title: "Conferma spedizione",
            body: "Inserisci data di spedizione, corriere, eventuale tracking → conferma.",
            detail: "",
            warn: "Percorso menu esatto da verificare su Zedonkopedia (varia per configurazione account).",
          },
          { title: "Aggiornamento stato", body: "Lo stato passa da Unshipped a Shipped, l'ordine è pronto per la fattura.", detail: "" },
        ],
      },
    ],
  },
  {
    id: "produzione",
    tag: "06",
    title: "Produzione",
    subtitle: "Docket & Production Analysis",
    groups: [
      {
        label: "Docket — cos'è",
        steps: [
          { title: "Definizione", body: "Documento per il produttore/manifattura: quantità richieste per taglia, campioni tessuto/mostrine, scadenza produzione, prezzo concordato.", detail: "È la 'scheda di produzione' operativa." },
          { title: "Origine in Zedonk", body: "Il docket si crea a partire dagli ordini di vendita oppure dallo stock da riordinare (stock to order).", detail: "" },
        ],
      },
      {
        label: "Production Analysis — a cosa serve",
        steps: [
          { title: "Funzione", body: "Analizzare le vendite e generare Ordini di Produzione (Production Orders) da inviare al produttore.", detail: "È il 'ponte' tra vendite e produzione." },
          {
            title: "Logica",
            body: "Incrocia domanda (vendite per stile/colore/taglia), stock disponibile/in transito, fabbisogno netto.",
            detail: "",
            warn: "Dettaglio esatto delle colonne da verificare con uno screenshot reale della schermata.",
          },
          { title: "Da qui si genera", body: "Il Docket per coprire il fabbisogno di produzione individuato.", detail: "" },
        ],
      },
    ],
  },
  {
    id: "faq",
    tag: "07",
    title: "FAQ & Problemi",
    subtitle: "Casi ricorrenti e soluzioni rapide",
    groups: [
      {
        label: "Troubleshooting",
        steps: [
          { title: "Ordine non arriva in Zedonk", body: "Controlla stato export su JOOR (hover per messaggio errore); se 'Success' ma manca in Zedonk, controlla il log del connettore.", detail: "Ricorda: l'import richiede il trigger manuale 'Orders Import'." },
          { title: "Cliente duplicato su JOOR", body: "Verifica che l'Account Code Zedonk coincida esattamente col Customer Code JOOR.", detail: "" },
          { title: "Nuovo cliente non visibile su JOOR", body: "Verifica di aver lanciato il task 'Customer' e attendi 2-3 giorni lavorativi.", detail: "" },
          { title: "Modifiche post-approvazione non sincronizzate", body: "L'export JOOR→Zedonk avviene una sola volta, all'approvazione. Modifiche successive vanno gestite manualmente in Zedonk.", detail: "" },
          { title: "DN bloccata su Unshipped", body: "Apri la DN e conferma la spedizione con data/corriere/tracking.", detail: "Vedi sezione Spedizioni." },
          { title: "Colore/taglia mancante nel linesheet JOOR", body: "Il problema è a monte, nella sincronizzazione dati da Zedonk — non nell'inserimento manuale dell'ordine.", detail: "" },
        ],
      },
    ],
  },
];
