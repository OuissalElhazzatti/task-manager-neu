// src/api.js
// ======================================
// Diese Datei kümmert sich um die Kommunikation
// zwischen React und deinem Flask-Backend.
// 💡 Die Datei enthält 4 Funktionen:

//   1️⃣ fetchTasks() → Tasks holen
//   2️⃣ createTask() → neue Task erstellen
//   3️⃣ updateTask() → eine Task updaten
//   4️⃣ fetchNotifications() → Notifications holen
// ======================================

// 👉 Backend-URL anpassen, falls nötig
// Wenn dein Flask-Server mit `flask run` läuft, ist es meistens:
const API_BASE_URL = "http://127.0.0.1:5000";

// --------------------------------------
// Alle Tasks laden (GET /tasks)
// --------------------------------------
export async function fetchTasks() {
  const res = await fetch(`${API_BASE_URL}/tasks`);
  if (!res.ok) {
    throw new Error("Fehler beim Laden der Tasks");
  }
  return res.json();
}

// --------------------------------------
// Neue Task erstellen (POST /tasks)
// --------------------------------------
export async function createTask(taskData) {
  const res = await fetch(`${API_BASE_URL}/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });

  if (!res.ok) {
    throw new Error("Fehler beim Aktualisieren der Task");
  }

  return res.json();
}

// --------------------------------------
// Notifications laden (GET /notifications)
// --------------------------------------
export async function fetchNotifications() {
  const res = await fetch(`${API_BASE_URL}/notifications`);
  if (!res.ok) {
    throw new Error("Fehler beim Laden der Notifications");
  }
  return res.json();
}