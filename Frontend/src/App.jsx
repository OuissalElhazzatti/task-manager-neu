// src/App.jsx
// ======================================
// Task Manager – Kanban-Board mit Status-Dropdown
// Holt Tasks vom Backend und zeigt sie in drei Spalten:
// "To Do" | "In Progress" | "Done"
// Status kann per Dropdown geändert werden,
// Priority wird als farbiger Punkt (ohne Text) angezeigt.
// ======================================

import { useEffect, useState } from "react";
import "./App.css"; // CSS für Layout & Responsive
// ⬇️ WICHTIG: wir brauchen fetchTasks UND updateTask
import { fetchTasks, updateTask } from "./api";

function App() {
  // 🔹 State-Variablen
  const [tasks, setTasks] = useState([]);       // alle Tasks aus dem Backend
  const [loading, setLoading] = useState(true); // sind wir gerade am Laden?
  const [error, setError] = useState("");       // Text einer Fehlermeldung

  // 🔹 Beim ersten Laden der Seite Tasks holen
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);   // wir sind am Laden
        setError("");       // evtl. alten Fehler löschen

        // 👉 Daten vom Backend holen: GET /tasks
        const data = await fetchTasks();
        setTasks(data);     // im State speichern
      } catch (err) {
        // Wenn etwas schief geht (z.B. Backend aus):
        setError(err.message);
      } finally {
        setLoading(false);  // fertig geladen (egal ob Erfolg oder Fehler)
      }
    };

    loadData(); // Funktion wirklich ausführen
  }, []); // [] = nur einmal ausführen, wenn die Komponente geladen wird

  // 🔹 Hilfsfunktion: Tasks nach Status filtern
  // Beispiel: tasksByStatus("To Do") → alle Tasks mit status === "To Do"
  const tasksByStatus = (status) =>
    tasks.filter((task) => task.status === status);

  // 🔹 Status einer Task ändern (wird von TaskCard aufgerufen)
  const handleStatusChange = async (taskId, newStatus) => {
    try {
      setError("");

      // 1) Backend updaten: PUT /tasks/<id> mit { status: "..." }
      const updatedTask = await updateTask(taskId, { status: newStatus });

      // 2) React-State updaten: die entsprechende Task ersetzen
      setTasks((prevTasks) =>
        prevTasks.map((t) => (t.id === taskId ? updatedTask : t))
      );
    } catch (err) {
      setError(err.message);
    }
  };

  // 🔹 Anzeige, solange wir noch laden
  if (loading) {
    return <div className="page-wrapper">Loading tasks...</div>;
  }

  // 🔹 Haupt-UI
  return (
    <div className="page-wrapper">
      {/* Kopfbereich der Seite */}
      <header className="page-header">
        <h1>Task Manager – React Kanban</h1>
        <p className="page-subtitle">
          Ein einfaches Kanban-Board, Status per Dropdown änderbar, Priority als Farbe.
        </p>
      </header>

      {/* Fehler anzeigen, falls es einen gibt */}
      {error && <p className="error-text">Error: {error}</p>}

      {/* 🔹 Unser Kanban-Board mit drei Spalten */}
      <section className="board">
        {/* Spalte 1: To Do */}
        <KanbanColumn
          title="To Do"
          tasks={tasksByStatus("To Do")}
          onStatusChange={handleStatusChange} // 👈 weitergeben
        />

        {/* Spalte 2: In Progress */}
        <KanbanColumn
          title="In Progress"
          tasks={tasksByStatus("In Progress")}
          onStatusChange={handleStatusChange}
        />

        {/* Spalte 3: Done */}
        <KanbanColumn
          title="Done"
          tasks={tasksByStatus("Done")}
          onStatusChange={handleStatusChange}
        />
      </section>
    </div>
  );
}

// ======================================
// Komponente für EINE Spalte im Kanban-Board
// z.B. "To Do", "In Progress", "Done"
// ======================================
function KanbanColumn({ title, tasks, onStatusChange }) {
  return (
    <div className="column">
      {/* Spaltentitel */}
      <h2 className="column-title">{title}</h2>

      {/* Wenn keine Tasks in dieser Spalte sind */}
      {tasks.length === 0 ? (
        <p className="column-empty">Keine Tasks</p>
      ) : (
        /* Sonst alle Tasks als Karten anzeigen */
        <div className="column-tasks">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onStatusChange={onStatusChange} // 👈 an jede Karte weitergeben
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ======================================
// Komponente für EINE Task-Karte
// Zeigt Titel, Beschreibung (wenn vorhanden),
// Status-Dropdown und Priority-Punkt (ohne Text).
// ======================================
function TaskCard({ task, onStatusChange }) {
  // 🔹 Priority → CSS-Klasse für farbigen Punkt bestimmen
  const priorityClass =
    task.priority === "high"
      ? "priority-dot-high"
      : task.priority === "medium"
      ? "priority-dot-medium"
      : "priority-dot-low";

  // 🔹 Handler für Änderung im Dropdown
  const handleSelectChange = (event) => {
    const newStatus = event.target.value;  // "To Do", "In Progress", "Done"
    onStatusChange(task.id, newStatus);    // Funktion aus App aufrufen
  };

  return (
    <article className="task-card">
      {/* Titel der Task */}
      <h3 className="task-title">{task.title}</h3>

      {/* Beschreibung nur anzeigen, wenn es eine gibt */}
      {task.description && (
        <p className="task-description">{task.description}</p>
      )}

      {/* Metadaten: Status-Dropdown & Priority-Punkt */}
      <div className="task-meta">
        {/* Status-Dropdown */}
        <label className="status-label">
          Status:
          <select
            className="status-select"
            value={task.status}           // aktueller Status
            onChange={handleSelectChange} // bei Änderung → Backend updaten
          >
            {/* Diese Werte müssen zu deiner DB passen */}
            <option value="To Do">To Do</option>
            <option value="In Progress">In Progress</option>
            <option value="Done">Done</option>
          </select>
        </label>

        {/* Priority als farbiger Punkt, ohne Text */}
        <span className={`priority-dot ${priorityClass}`}></span>
      </div>
    </article>
  );
}

export default App;