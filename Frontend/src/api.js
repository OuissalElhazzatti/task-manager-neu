// src/api.js
// ======================================
// Kommunikation zwischen React und Flask-Backend
// ======================================

const API_BASE_URL = "http://127.0.0.1:5000";

// --------------------------------------
// ✅ Helper: User aus localStorage als Header mitsenden
// --------------------------------------
function authHeaders() {
  const userEmail = localStorage.getItem("userEmail") || "";
  return {
    "Content-Type": "application/json",
    "X-User-Email": userEmail,
  };
}

function authHeaderOnly() {
  const userEmail = localStorage.getItem("userEmail") || "";
  return {
    "X-User-Email": userEmail,
  };
}

// --------------------------------------
// Alle Tasks laden (GET /tasks)
// --------------------------------------
export async function fetchTasks() {
  const res = await fetch(`${API_BASE_URL}/tasks`, {
    headers: authHeaderOnly(),
  });

  if (!res.ok) {
    throw new Error("Fehler beim Laden der Tasks");
  }
  return res.json();
}

// --------------------------------------
// Task löschen (DELETE /tasks/<id>)
// --------------------------------------
export async function deleteTask(id) {
  const res = await fetch(`${API_BASE_URL}/tasks/${id}`, {
    method: "DELETE",
    headers: authHeaderOnly(),
  });

  if (!res.ok) {
    throw new Error("Fehler beim Löschen der Task");
  }

  return res.json(); // {"message": "..."}
}

// --------------------------------------
// Neue Task erstellen (POST /tasks)
// --------------------------------------
export async function createTask(taskData) {
  const res = await fetch(`${API_BASE_URL}/tasks`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(taskData),
  });

  if (!res.ok) {
    throw new Error("Fehler beim Erstellen der Task");
  }

  return res.json();
}

// --------------------------------------
// Task aktualisieren (PUT /tasks/<id>)
// --------------------------------------
export async function updateTask(id, updates) {
  const res = await fetch(`${API_BASE_URL}/tasks/${id}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(updates),
  });

  if (!res.ok) {
    throw new Error("Fehler beim Aktualisieren der Task");
  }

  return res.json();
}

// --------------------------------------
// Notifications laden (GET /notifications)
// (Hinweis: existiert nur, wenn dein Backend das auch hat)
// --------------------------------------
export async function fetchNotifications() {
  const res = await fetch(`${API_BASE_URL}/notifications`, {
    headers: authHeaderOnly(),
  });

  if (!res.ok) {
    throw new Error("Fehler beim Laden der Notifications");
  }
  return res.json();
}

// --------------------------------------
// Auth: Registrierung (POST /auth/register)
// --------------------------------------
export async function registerUser(payload) {
  const res = await fetch(`${API_BASE_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Registrierung fehlgeschlagen");
  }
  return data;
}

// --------------------------------------
// Auth: Login (POST /auth/login)
// --------------------------------------
export async function loginUser(email, password) {
  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Login fehlgeschlagen");
  }
  return data; // { ok: true, user: {...} }
}