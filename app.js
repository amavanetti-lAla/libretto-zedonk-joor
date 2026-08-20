 // ============================================================
// App: navigazione, rendering contenuti, note personali (Firebase)
// ============================================================

let currentSection = SECTIONS[0].id;
let notesUnsub = null;
let stepNotesUnsub = null;
let stepNotesCache = {}; // stepId -> text

function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function stepId(sectionId, groupIndex, stepIndex) {
  return `${sectionId}__g${groupIndex}__s${stepIndex}`;
}

// ---------- Rendering contenuti ----------

function renderNav() {
  const nav = document.getElementById("tagNav");
  nav.innerHTML = "";
  SECTIONS.forEach((s) => {
    const li = document.createElement("li");
    li.className = "tag" + (s.id === currentSection ? " active" : "");
    li.innerHTML = `
      <span class="tag-num">${s.tag}</span>
      <span class="tag-label">
        <span class="tag-title">${s.title}</span>
        <span class="tag-sub">${s.subtitle}</span>
      </span>
    `;
    li.addEventListener("click", () => {
      currentSection = s.id;
      renderNav();
      renderMain();
      const mq = window.matchMedia("(max-width: 860px)");
      if (mq.matches) {
        const main = document.getElementById("main");
        main.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
    nav.appendChild(li);
  });
}

function renderMain() {
  const section = SECTIONS.find((s) => s.id === currentSection);
  const main = document.getElementById("main");

  let html = `
    <div class="section-head">
      <div class="eyebrow">Scheda ${section.tag}</div>
      <h1>${section.title}</h1>
      <p>${section.subtitle}</p>
    </div>
  `;

  section.groups.forEach((group, gi) => {
    html += `<div class="group"><div class="group-label">${group.label}</div>`;
    group.steps.forEach((step, i) => {
      const id = stepId(section.id, gi, i);
      const noteValue = escapeHtml(stepNotesCache[id]);
      html += `
        <div class="docket">
          <div class="docket-row">
            <div class="step-idx">${String(i + 1).padStart(2, "0")}</div>
            <div>
              <p class="step-title">${step.title}</p>
              <p class="step-body">${step.body}</p>
              ${step.detail ? `<p class="step-detail">${step.detail}</p>` : ""}
              ${step.warn ? `<div class="step-warn"><span class="mark">!</span><span>${step.warn}</span></div>` : ""}
              <div class="step-note">
                <div class="step-note-label">✎ tua nota <span class="step-note-saved" data-saved-for="${id}">salvata</span></div>
                <textarea class="step-note-input" data-step-id="${id}" placeholder="Aggiungi qui un tuo appunto su questo passaggio...">${noteValue}</textarea>
              </div>
            </div>
          </div>
        </div>
      `;
    });
    html += `</div>`;
  });

  main.innerHTML = html;
  attachStepNoteHandlers();
}

function attachStepNoteHandlers() {
  document.querySelectorAll(".step-note-input").forEach((ta) => {
    let timeout;
    ta.addEventListener("input", () => {
      clearTimeout(timeout);
      const id = ta.dataset.stepId;
      timeout = setTimeout(() => {
        saveStepNote(id, ta.value);
        const flag = document.querySelector(`.step-note-saved[data-saved-for="${id}"]`);
        if (flag) {
          flag.classList.add("show");
          setTimeout(() => flag.classList.remove("show"), 1200);
        }
      }, 500);
    });
  });
}

// ---------- Note personali ----------

function getWorkspaceId() {
  return localStorage.getItem("zj_workspace") || "";
}

function setWorkspaceId(id) {
  localStorage.setItem("zj_workspace", id);
}

function updateSyncIndicator() {
  const dot = document.getElementById("syncDot");
  const label = document.getElementById("syncLabel");
  const ws = getWorkspaceId();
  const firebaseReady = typeof firebaseDb !== "undefined" && firebaseDb;

  if (firebaseReady && ws) {
    dot.classList.remove("off");
    label.textContent = `Sync attivo · workspace "${ws}"`;
  } else if (!firebaseReady) {
    dot.classList.add("off");
    label.textContent = "Firebase non configurato (vedi README)";
  } else {
    dot.classList.add("off");
    label.textContent = "Imposta un codice workspace per sincronizzare";
  }
}

function renderNotes(notes) {
  const body = document.getElementById("notesBody");
  const ws = getWorkspaceId();

  if (!ws) {
    body.innerHTML = `<p class="setup-notice">Imposta un <strong>codice workspace</strong> qui sopra (una parola a tua scelta, es. <code>marta-2026</code>) e usa lo stesso codice su ogni dispositivo per ritrovare le stesse note.</p>`;
    return;
  }

  if (!notes || notes.length === 0) {
    body.innerHTML = `<p class="setup-notice">Nessuna nota ancora. Usa il pulsante qui sotto per aggiungerne una.</p>`;
    return;
  }

  body.innerHTML = "";
  notes
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
    .forEach((note) => {
      const card = document.createElement("div");
      card.className = "note-card";
      const date = note.updatedAt ? new Date(note.updatedAt).toLocaleDateString("it-IT") : "";
      card.innerHTML = `
        <div class="meta">
          <span>${date}</span>
          <button class="note-del" data-id="${note.id}">elimina</button>
        </div>
        <textarea data-id="${note.id}" placeholder="Scrivi qui...">${note.text || ""}</textarea>
      `;
      body.appendChild(card);
    });

  body.querySelectorAll("textarea").forEach((ta) => {
    let timeout;
    ta.addEventListener("input", () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => saveNote(ta.dataset.id, ta.value), 500);
    });
  });
  body.querySelectorAll(".note-del").forEach((btn) => {
    btn.addEventListener("click", () => deleteNote(btn.dataset.id));
  });
}

// ---- Firebase-backed storage (vedi firebase-config.js) ----
// Se Firebase non è configurato, le note restano solo in localStorage
// come fallback (niente sync multi-dispositivo, ma l'app resta usabile).

function localNotesKey() {
  return `zj_notes_${getWorkspaceId()}`;
}

function loadLocalNotes() {
  try {
    return JSON.parse(localStorage.getItem(localNotesKey()) || "[]");
  } catch {
    return [];
  }
}

function saveLocalNotes(notes) {
  localStorage.setItem(localNotesKey(), JSON.stringify(notes));
}

function subscribeNotes() {
  if (notesUnsub) {
    notesUnsub();
    notesUnsub = null;
  }
  const ws = getWorkspaceId();
  if (!ws) {
    renderNotes([]);
    return;
  }

  if (typeof firebaseDb !== "undefined" && firebaseDb) {
    // Firestore realtime listener
    notesUnsub = firebaseDb
      .collection("workspaces")
      .doc(ws)
      .collection("notes")
      .onSnapshot((snap) => {
        const notes = [];
        snap.forEach((doc) => notes.push({ id: doc.id, ...doc.data() }));
        renderNotes(notes);
      });
  } else {
    renderNotes(loadLocalNotes());
  }
}

function saveNote(id, text) {
  const ws = getWorkspaceId();
  if (!ws) return;

  if (typeof firebaseDb !== "undefined" && firebaseDb) {
    firebaseDb
      .collection("workspaces")
      .doc(ws)
      .collection("notes")
      .doc(id)
      .set({ text, updatedAt: Date.now() }, { merge: true });
  } else {
    const notes = loadLocalNotes();
    const idx = notes.findIndex((n) => n.id === id);
    if (idx >= 0) {
      notes[idx].text = text;
      notes[idx].updatedAt = Date.now();
    }
    saveLocalNotes(notes);
    renderNotes(notes);
  }
}

function addNote() {
  const ws = getWorkspaceId();
  if (!ws) {
    alert("Imposta prima un codice workspace.");
    return;
  }
  const id = "n" + Date.now();
  const newNote = { id, text: "", updatedAt: Date.now() };

  if (typeof firebaseDb !== "undefined" && firebaseDb) {
    firebaseDb.collection("workspaces").doc(ws).collection("notes").doc(id).set(newNote);
  } else {
    const notes = loadLocalNotes();
    notes.push(newNote);
    saveLocalNotes(notes);
    renderNotes(notes);
  }
}

function deleteNote(id) {
  const ws = getWorkspaceId();
  if (!ws) return;

  if (typeof firebaseDb !== "undefined" && firebaseDb) {
    firebaseDb.collection("workspaces").doc(ws).collection("notes").doc(id).delete();
  } else {
    const notes = loadLocalNotes().filter((n) => n.id !== id);
    saveLocalNotes(notes);
    renderNotes(notes);
  }
}

// ---------- Note per-passaggio (in verde, dentro le istruzioni) ----------

function localStepNotesKey() {
  return `zj_stepnotes_${getWorkspaceId()}`;
}

function loadLocalStepNotes() {
  try {
    return JSON.parse(localStorage.getItem(localStepNotesKey()) || "{}");
  } catch {
    return {};
  }
}

function saveLocalStepNotes(map) {
  localStorage.setItem(localStepNotesKey(), JSON.stringify(map));
}

function subscribeStepNotes() {
  if (stepNotesUnsub) {
    stepNotesUnsub();
    stepNotesUnsub = null;
  }
  const ws = getWorkspaceId();
  if (!ws) {
    stepNotesCache = {};
    renderMain();
    return;
  }

  if (typeof firebaseDb !== "undefined" && firebaseDb) {
    stepNotesUnsub = firebaseDb
      .collection("workspaces")
      .doc(ws)
      .collection("stepNotes")
      .onSnapshot((snap) => {
        const map = {};
        snap.forEach((doc) => (map[doc.id] = doc.data().text || ""));
        stepNotesCache = map;
        refreshStepNoteValues();
      });
  } else {
    stepNotesCache = loadLocalStepNotes();
    renderMain();
  }
}

// Aggiorna i valori nel DOM senza ridisegnare tutto (non toglie il focus
// mentre l'utente sta scrivendo in un altro campo).
function refreshStepNoteValues() {
  document.querySelectorAll(".step-note-input").forEach((ta) => {
    if (document.activeElement === ta) return; // non toccare quello che si sta scrivendo
    const id = ta.dataset.stepId;
    const value = stepNotesCache[id] || "";
    if (ta.value !== value) ta.value = value;
  });
}

function saveStepNote(id, text) {
  const ws = getWorkspaceId();
  if (!ws) {
    alert("Imposta prima un codice workspace (pannello Note personali) per salvare gli appunti.");
    return;
  }

  if (typeof firebaseDb !== "undefined" && firebaseDb) {
    firebaseDb
      .collection("workspaces")
      .doc(ws)
      .collection("stepNotes")
      .doc(id)
      .set({ text, updatedAt: Date.now() }, { merge: true });
  } else {
    const map = loadLocalStepNotes();
    map[id] = text;
    saveLocalStepNotes(map);
    stepNotesCache = map;
  }
}

// ---------- Collapse header su scroll (solo mobile) ----------

function initHeaderCollapse() {
  const sidebar = document.getElementById("sidebar");
  const mq = window.matchMedia("(max-width: 860px)");
  let lastY = window.scrollY;
  let ticking = false;

  function onScroll() {
    if (!mq.matches) {
      sidebar.classList.remove("collapsed");
      ticking = false;
      return;
    }
    const y = window.scrollY;
    const goingDown = y > lastY;
    const pastThreshold = y > 60;

    if (goingDown && pastThreshold) {
      sidebar.classList.add("collapsed");
    } else if (!goingDown || y < 20) {
      sidebar.classList.remove("collapsed");
    }
    lastY = y;
    ticking = false;
  }

  window.addEventListener("scroll", () => {
    if (!ticking) {
      window.requestAnimationFrame(onScroll);
      ticking = true;
    }
  });

  mq.addEventListener("change", () => sidebar.classList.remove("collapsed"));
}

// ---------- Area riservata (cifrata) ----------
// I contenuti vengono cifrati nel browser con AES-GCM prima di essere
// salvati. La chiave deriva dalla passphrase inserita dall'utente + un
// "sale" salvato in Firestore (il sale non è segreto, serve solo a
// rendere unica la cifratura). Senza la passphrase giusta, i dati
// restano illeggibili anche a chi ha accesso al database.
//
// Ogni voce può contenere anche delle immagini allegate (fino a
// VAULT_MAX_IMAGES per voce): vengono ridimensionate/compresse via
// <canvas>, convertite in data-URL e cifrate una per una con la stessa
// chiave del testo, ma con IV proprio. Sono salvate separatamente dal
// campo testo (entry.images) così salvare la nota non tocca gli allegati
// e viceversa.

let vaultKey = null; // CryptoKey, solo in memoria, mai salvata
let vaultUnsub = null;
let vaultCache = {}; // id -> {iv, ciphertext, updatedAt, images?}

const VAULT_MAX_IMAGES = 4;
const VAULT_MAX_DOC_CHARS = 900000; // margine sotto il limite di 1MB/documento Firestore

function b64encode(bytes) {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)));
}
function b64decode(str) {
  return Uint8Array.from(atob(str), (c) => c.charCodeAt(0));
}

async function getOrCreateVaultSalt(ws) {
  if (!firebaseDb) {
    // fallback locale: sale salvato per workspace nel browser
    const key = `zj_vaultsalt_${ws}`;
    let saved = localStorage.getItem(key);
    if (!saved) {
      const salt = crypto.getRandomValues(new Uint8Array(16));
      saved = b64encode(salt);
      localStorage.setItem(key, saved);
    }
    return b64decode(saved);
  }
  const ref = firebaseDb.collection("workspaces").doc(ws).collection("secure").doc("meta");
  const snap = await ref.get();
  if (snap.exists && snap.data().salt) {
    return b64decode(snap.data().salt);
  }
  const salt = crypto.getRandomValues(new Uint8Array(16));
  await ref.set({ salt: b64encode(salt) });
  return salt;
}

async function deriveVaultKey(passphrase, saltBytes) {
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey("raw", enc.encode(passphrase), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: saltBytes, iterations: 150000, hash: "SHA-256" },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

async function vaultEncrypt(key, plaintext) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(plaintext));
  return { iv: b64encode(iv), ciphertext: b64encode(ciphertext) };
}

async function vaultDecrypt(key, ivB64, ciphertextB64) {
  const dec = new TextDecoder();
  const plainBuf = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: b64decode(ivB64) },
    key,
    b64decode(ciphertextB64)
  );
  return dec.decode(plainBuf);
}

async function unlockVault() {
  const ws = getWorkspaceId();
  const errEl = document.getElementById("vaultError");
  errEl.textContent = "";

  if (!ws) {
    errEl.textContent = "Imposta prima un codice workspace in 'Note personali'.";
    return;
  }
  const passInput = document.getElementById("vaultPassphrase");
  const passphrase = passInput.value;
  if (!passphrase) {
    errEl.textContent = "Inserisci una passphrase.";
    return;
  }

  try {
    const salt = await getOrCreateVaultSalt(ws);
    const key = await deriveVaultKey(passphrase, salt);

    // Verifica la passphrase provando a decifrare una voce esistente, se c'è.
    const existingIds = Object.keys(vaultCache);
    if (existingIds.length > 0) {
      const test = vaultCache[existingIds[0]];
      await vaultDecrypt(key, test.iv, test.ciphertext); // lancia errore se sbagliata
    }

    vaultKey = key;
    passInput.value = "";
    document.getElementById("vaultGate").style.display = "none";
    document.getElementById("vaultBody").style.display = "flex";
    document.getElementById("vaultFoot").style.display = "block";
    await renderVaultEntries();
  } catch (e) {
    errEl.textContent = "Passphrase errata, oppure dati non leggibili con questa chiave.";
  }
}

function lockVault() {
  vaultKey = null;
  document.getElementById("vaultGate").style.display = "block";
  document.getElementById("vaultBody").style.display = "none";
  document.getElementById("vaultFoot").style.display = "none";
  document.getElementById("vaultBody").innerHTML = "";
}

function subscribeVault() {
  if (vaultUnsub) {
    vaultUnsub();
    vaultUnsub = null;
  }
  const ws = getWorkspaceId();
  if (!ws) return;

  if (firebaseDb) {
    vaultUnsub = firebaseDb
      .collection("workspaces")
      .doc(ws)
      .collection("secure")
      .onSnapshot((snap) => {
        const map = {};
        snap.forEach((doc) => {
          if (doc.id === "meta") return;
          map[doc.id] = doc.data();
        });
        vaultCache = map;
        if (vaultKey) renderVaultEntries();
      });
  } else {
    try {
      vaultCache = JSON.parse(localStorage.getItem(`zj_vault_${ws}`) || "{}");
    } catch {
      vaultCache = {};
    }
  }
}

function saveVaultLocal() {
  const ws = getWorkspaceId();
  if (!ws || firebaseDb) return;
  localStorage.setItem(`zj_vault_${ws}`, JSON.stringify(vaultCache));
}

async function renderVaultEntries() {
  const body = document.getElementById("vaultBody");
  const ids = Object.keys(vaultCache);

  if (ids.length === 0) {
    body.innerHTML = `<p class="setup-notice">Nessuna voce ancora. Usa "+ nuova voce riservata" qui sotto.</p>`;
    return;
  }

  body.innerHTML = "";
  for (const id of ids.sort((a, b) => (vaultCache[b].updatedAt || 0) - (vaultCache[a].updatedAt || 0))) {
    const entry = vaultCache[id];
    let text = "";
    try {
      text = entry.iv ? await vaultDecrypt(vaultKey, entry.iv, entry.ciphertext) : "";
    } catch {
      text = "⚠️ Impossibile decifrare (passphrase diversa da quella usata per salvare questa voce).";
    }

    const imageUrls = [];
    for (const img of entry.images || []) {
      try {
        imageUrls.push(await vaultDecrypt(vaultKey, img.iv, img.ciphertext));
      } catch {
        imageUrls.push(null);
      }
    }

    const date = entry.updatedAt ? new Date(entry.updatedAt).toLocaleDateString("it-IT") : "";
    const card = document.createElement("div");
    card.className = "note-card";
    card.innerHTML = `
      <div class="meta">
        <span>${date}</span>
        <button class="note-del" data-id="${id}">elimina</button>
      </div>
      <textarea data-id="${id}" placeholder="Scrivi qui...">${escapeHtml(text)}</textarea>
      <div class="vault-images" data-id="${id}">
        ${imageUrls
          .map((url, i) =>
            url
              ? `<div class="vault-image-thumb">
                   <img src="${url}" data-id="${id}" data-idx="${i}" class="vault-image-view" alt="allegato" />
                   <button class="vault-image-del" data-id="${id}" data-idx="${i}">✕</button>
                 </div>`
              : `<div class="vault-image-thumb vault-image-error">⚠️</div>`
          )
          .join("")}
      </div>
      <div class="vault-image-add">
        <label class="vault-image-add-btn">
          📷 aggiungi immagine
          <input type="file" accept="image/*" data-id="${id}" class="vault-image-input" hidden />
        </label>
      </div>
    `;
    body.appendChild(card);
  }

  body.querySelectorAll("textarea").forEach((ta) => {
    let timeout;
    ta.addEventListener("input", () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => saveVaultEntry(ta.dataset.id, ta.value), 500);
    });
  });
  body.querySelectorAll(".note-del").forEach((btn) => {
    btn.addEventListener("click", () => deleteVaultEntry(btn.dataset.id));
  });
  body.querySelectorAll(".vault-image-input").forEach((input) => {
    input.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file) addVaultImage(input.dataset.id, file);
      input.value = "";
    });
  });
  body.querySelectorAll(".vault-image-del").forEach((btn) => {
    btn.addEventListener("click", () => deleteVaultImage(btn.dataset.id, Number(btn.dataset.idx)));
  });
  body.querySelectorAll(".vault-image-view").forEach((img) => {
    img.addEventListener("click", () => openVaultImageLightbox(img.src));
  });
}

async function saveVaultEntry(id, plaintext) {
  if (!vaultKey) return;
  const { iv, ciphertext } = await vaultEncrypt(vaultKey, plaintext);
  const ws = getWorkspaceId();
  const entry = { iv, ciphertext, updatedAt: Date.now() };

  if (firebaseDb) {
    firebaseDb.collection("workspaces").doc(ws).collection("secure").doc(id).set(entry, { merge: true });
  } else {
    vaultCache[id] = { ...(vaultCache[id] || {}), ...entry };
    saveVaultLocal();
  }
}

async function saveVaultImages(id, images) {
  const ws = getWorkspaceId();
  const patch = { images, updatedAt: Date.now() };

  if (firebaseDb) {
    firebaseDb.collection("workspaces").doc(ws).collection("secure").doc(id).set(patch, { merge: true });
  } else {
    vaultCache[id] = { ...(vaultCache[id] || {}), ...patch };
    saveVaultLocal();
    await renderVaultEntries();
  }
}

function resizeImageFile(file, maxDim = 1400, quality = 0.65) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Lettura file fallita."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Immagine non valida."));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width >= height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

async function addVaultImage(id, file) {
  if (!vaultKey) return;
  if (!file || !file.type.startsWith("image/")) {
    alert("Seleziona un file immagine valido.");
    return;
  }

  const entry = vaultCache[id] || { updatedAt: Date.now() };
  const currentImages = entry.images || [];
  if (currentImages.length >= VAULT_MAX_IMAGES) {
    alert(`Puoi allegare al massimo ${VAULT_MAX_IMAGES} immagini per voce.`);
    return;
  }

  let dataUrl;
  try {
    dataUrl = await resizeImageFile(file);
  } catch {
    alert("Impossibile leggere l'immagine.");
    return;
  }

  const encryptedImage = await vaultEncrypt(vaultKey, dataUrl);
  const images = [...currentImages, encryptedImage];

  if (JSON.stringify({ ...entry, images }).length > VAULT_MAX_DOC_CHARS) {
    alert("Questa immagine è troppo grande (o la voce ha già troppi allegati). Prova con un'immagine più piccola o rimuovine una esistente.");
    return;
  }

  await saveVaultImages(id, images);
}

async function deleteVaultImage(id, imageIndex) {
  const entry = vaultCache[id];
  if (!entry || !entry.images) return;
  const images = entry.images.filter((_, i) => i !== imageIndex);
  await saveVaultImages(id, images);
}

function openVaultImageLightbox(src) {
  const overlay = document.createElement("div");
  overlay.className = "vault-lightbox";
  overlay.innerHTML = `<img src="${src}" alt="anteprima" />`;
  overlay.addEventListener("click", () => overlay.remove());
  document.body.appendChild(overlay);
}

async function addVaultEntry() {
  if (!vaultKey) return;
  const id = "v" + Date.now();
  await saveVaultEntry(id, "");
  if (!firebaseDb) {
    vaultCache[id] = vaultCache[id] || { updatedAt: Date.now() };
    await renderVaultEntries();
  }
}

function deleteVaultEntry(id) {
  const ws = getWorkspaceId();
  if (firebaseDb) {
    firebaseDb.collection("workspaces").doc(ws).collection("secure").doc(id).delete();
  } else {
    delete vaultCache[id];
    saveVaultLocal();
    renderVaultEntries();
  }
}

// ---------- Init ----------

document.addEventListener("DOMContentLoaded", () => {
  renderNav();
  renderMain();
  initHeaderCollapse();

  const wsInput = document.getElementById("workspaceInput");
  wsInput.value = getWorkspaceId();
  updateSyncIndicator();
  subscribeNotes();
  subscribeStepNotes();

  document.getElementById("workspaceSave").addEventListener("click", () => {
    const val = wsInput.value.trim().toLowerCase().replace(/\s+/g, "-");
    setWorkspaceId(val);
    updateSyncIndicator();
    subscribeNotes();
    subscribeStepNotes();
  });

  document.getElementById("addNoteBtn").addEventListener("click", addNote);

  document.getElementById("notesToggle").addEventListener("click", () => {
    document.getElementById("notesDrawer").classList.add("open");
  });
  document.getElementById("notesClose").addEventListener("click", () => {
    document.getElementById("notesDrawer").classList.remove("open");
  });

  document.getElementById("vaultToggle").addEventListener("click", () => {
    document.getElementById("vaultDrawer").classList.add("open");
    subscribeVault();
  });
  document.getElementById("vaultClose").addEventListener("click", () => {
    document.getElementById("vaultDrawer").classList.remove("open");
  });
  document.getElementById("vaultUnlock").addEventListener("click", unlockVault);
  document.getElementById("vaultPassphrase").addEventListener("keydown", (e) => {
    if (e.key === "Enter") unlockVault();
  });
  document.getElementById("vaultLockBtn").addEventListener("click", lockVault);
  document.getElementById("addVaultBtn").addEventListener("click", addVaultEntry);
});
