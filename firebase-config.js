// ============================================================
// CONFIGURAZIONE FIREBASE — sostituisci i valori sotto con quelli
// del TUO progetto Firebase (vedi README.md, sezione "Attivare il sync").
//
// Se lasci firebaseConfig = null, l'app funziona comunque ma le note
// restano salvate solo nel browser del dispositivo che stai usando
// (nessun sync multi-dispositivo).
// ============================================================

const firebaseConfig = null;

/* Esempio — decommenta e compila con i tuoi dati reali:

const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "tuoprogetto.firebaseapp.com",
  projectId: "tuoprogetto",
  storageBucket: "tuoprogetto.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};

*/

let firebaseDb = null;
if (firebaseConfig) {
  try {
    firebase.initializeApp(firebaseConfig);
    firebaseDb = firebase.firestore();
  } catch (e) {
    console.error("Errore inizializzazione Firebase:", e);
  }
}
