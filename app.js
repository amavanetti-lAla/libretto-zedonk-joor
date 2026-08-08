// ============================================================
// App: navigazione, rendering contenuti, note personali (Firebase)
// ============================================================

let currentSection = SECTIONS[0].id;
let notesUnsub = null;

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

  section.groups.forEach((group) => {
    html += `<div class="group"><div class="group-label">${group.label}</div>`;
    group.steps.forEach((step, i) => {
      html += `
        <div class="docket">
          <div class="docket-row">
            <div class="step-idx">${String(i + 1).padStart(2, "0")}</div>
            <div>
              <p class="step-title">${step.title}</p>
              <p class="step-body">${step.body}</p>
              ${step.detail ? `<p class="step-detail">${step.detail}</p>` : ""}
              ${step.warn ? `<div class="step-warn"><span class="mark">!</span><span>${step.warn}</span></div>` : ""}
            </div>
          </div>
        </div>
      `;
    });
    html += `</div>`;
  });

  main.innerHTML = html;
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

// ---------- Init ----------

document.addEventListener("DOMContentLoaded", () => {
  renderNav();
  renderMain();

  const wsInput = document.getElementById("workspaceInput");
  wsInput.value = getWorkspaceId();
  updateSyncIndicator();
  subscribeNotes();

  document.getElementById("workspaceSave").addEventListener("click", () => {
    const val = wsInput.value.trim().toLowerCase().replace(/\s+/g, "-");
    setWorkspaceId(val);
    updateSyncIndicator();
    subscribeNotes();
  });

  document.getElementById("addNoteBtn").addEventListener("click", addNote);

  document.getElementById("notesToggle").addEventListener("click", () => {
    document.getElementById("notesDrawer").classList.add("open");
  });
  document.getElementById("notesClose").addEventListener("click", () => {
    document.getElementById("notesDrawer").classList.remove("open");
  });
});
