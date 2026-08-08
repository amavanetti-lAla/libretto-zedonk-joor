// ============================================================
// CONFIGURAZIONE FIREBASE — sostituisci i valori sotto con quelli
// del TUO progetto Firebase (vedi README.md, sezione "Attivare il sync").
// ============================================================

const firebaseConfig = {
  apiKey: "AIzaSyBeyIZwWqFilocgc7-z5Z1eCQNZPJ-5BvI",
  authDomain: "libretto-operativo-zedonk.firebaseapp.com",
  projectId: "libretto-operativo-zedonk",
  storageBucket: "libretto-operativo-zedonk.firebasestorage.app",
  messagingSenderId: "671087494755",
  appId: "1:671087494755:web:e6e37d57c47769208a1a56"
};

let firebaseDb = null;
if (firebaseConfig) {
  try {
    firebase.initializeApp(firebaseConfig);
    firebaseDb = firebase.firestore();
  } catch (e) {
    console.error("Errore inizializzazione Firebase:", e);
  }
}
