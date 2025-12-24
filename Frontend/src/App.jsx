// src/App.jsx
// ======================================
// Task Manager – React Kanban
// - Holt Tasks vom Backend (Flask)
// - Zeigt sie nach Status in 3 Spalten
// - Status änderbar per Dropdown
// - Priority als farbiger Punkt
// - NEU: Formular zum Erstellen neuer Tasks
// ======================================

// 🔹 React Hooks importieren:
// useState = Werte speichern, die sich ändern (State)
// useEffect = Code ausführen, wenn die Komponente geladen wird (z.B. Daten laden)
import { useEffect, useState } from "react";

// 🔹 CSS-Datei für das Styling importieren
import "./App.css";

// 🔹 Funktionen für die Kommunikation mit dem Backend
// fetchTasks  = alle Tasks aus der Datenbank lesen (GET /tasks)
// updateTask  = eine bestehende Task ändern      (PUT /tasks/:id)
// createTask  = eine neue Task erstellen         (POST /tasks)
import { fetchTasks, updateTask, createTask } from "./api";

// ======================================
// Haupt-Komponente der App
// ======================================
function App() {
  // ---------- STATE-VARIABLEN ----------

  // 🔹 tasks: Liste aller Tasks, die wir vom Backend erhalten
  // Beispiel-Inhalt: [{id: 1, title: "X", status: "To Do", priority: "high"}, ...]
  const [tasks, setTasks] = useState([]);

  // 🔹 loading: true, solange wir noch auf die Antwort vom Backend warten
  const [loading, setLoading] = useState(true);

  // 🔹 error: wenn irgendetwas schiefgeht (z.B. Server down),
  // speichern wir hier die Fehlermeldung als Text
  const [error, setError] = useState("");

  // 🔹 isCreating: zeigt an, ob wir gerade eine neue Task ans Backend schicken
  // wenn true → Button im Formular zeigt "Wird erstellt..."
  const [isCreating, setIsCreating] = useState(false);

  // ---------- DATEN BEIM LADEN HOLEN ----------

  // useEffect mit [] bedeutet:
  // → führe diesen Code einmal aus, wenn die Komponente das erste Mal angezeigt wird
  useEffect(() => {
    // Wir definieren eine async-Funktion, um await benutzen zu können
    const loadData = async () => {
      try {
        // bevor wir laden:
        setLoading(true);  // "wir sind am Laden" aktivieren
        setError("");      // alte Fehlermeldung löschen

        // 👉 Tasks vom Backend holen (GET http://127.0.0.1:5000/tasks)
        const data = await fetchTasks();

        // Die Antwort (Array von Tasks) in den State speichern
        setTasks(data);
      } catch (err) {
        // Wenn ein Fehler auftritt (z.B. Backend nicht erreichbar):
        // err.message enthält die Fehlermeldung
        setError(err.message);
      } finally {
        // Egal ob Erfolg oder Fehler: Laden beenden
        setLoading(false);
      }
    };

    // definierte Funktion wirklich aufrufen
    loadData();
  }, []); // [] = nur beim ersten Render

  // ---------- HILFSFUNKTION: NACH STATUS FILTERN ----------

  // Diese Funktion nimmt einen Status (z.B. "To Do")
  // und gibt nur die Tasks zurück, die diesen Status haben.
  const tasksByStatus = (status) =>
    tasks.filter((task) => task.status === status);

  // ---------- STATUS ÄNDERN (DROPDOWN IN TASK-KARTE) ----------

  // Wird von TaskCard aufgerufen, wenn der User einen neuen Status im Dropdown wählt.
  // taskId   = ID der zu ändernden Task
  // newStatus = neuer Status (z.B. "Done")
  const handleStatusChange = async (taskId, newStatus) => {
    try {
      setError(""); // alte Fehlermeldung löschen

      // 1) Backend aufrufen:
      // updateTask schickt ein PUT /tasks/:id mit Body { status: newStatus }
      const updatedTask = await updateTask(taskId, { status: newStatus });

      // 2) React-State aktualisieren:
      // Wir gehen durch alle Tasks und ersetzen nur die mit der passenden ID.
      setTasks((prevTasks) =>
        prevTasks.map((t) => (t.id === taskId ? updatedTask : t))
      );
    } catch (err) {
      // Falls etwas schiefgeht, Fehlermeldung anzeigen
      setError(err.message);
    }
  };

  // ---------- NEU: NEUE TASK ERSTELLEN (FORMULAR) ----------

  // formData enthält ein Objekt:
  // { title: "...", description: "...", status: "...", priority: "..." }
  const handleCreateTask = async (formData) => {
    try {
      setError("");        // alte Fehlermeldung löschen
      setIsCreating(true); // wir sind gerade am Erstellen → Button deaktivieren

      // 1) Neue Task an das Backend senden (POST /tasks)
      const created = await createTask(formData);

      // 2) Neue Task in unsere vorhandene Liste einfügen
      // [...prev, created] = alle alten Tasks + die neue hintendran
      setTasks((prev) => [...prev, created]);
    } catch (err) {
      setError(err.message);
    } finally {
      // Egal ob Fehler oder Erfolg → Erstellen ist fertig
      setIsCreating(false);
    }
  };

  // ---------- FALL: WIR LADEN NOCH ----------

  // Solange loading === true ist, zeigen wir nur einen einfachen Text
  if (loading) {
    return <div className="page-wrapper">Loading tasks...</div>;
  }

  // ---------- HAUPTRENDER DER APP ----------

  return (
    <div className="page-wrapper">
      {/* Kopfbereich oben */}
      <header className="page-header">
        <h1>Task Manager – React Kanban</h1>
        <p className="page-subtitle">
          Ein einfaches Kanban-Board, Status per Dropdown änderbar, Priority als
          Farbe.
        </p>
      </header>

      {/* Fehlermeldung anzeigen, falls eine vorhanden ist */}
      {error && <p className="error-text">Error: {error}</p>}

      {/* NEU: Formular zum Erstellen neuer Tasks */}
      {/* onCreate → sagt dem Formular, welche Funktion es aufrufen soll, wenn man auf "Task erstellen" klickt */}
      {/* isSubmitting → sagt dem Formular, ob der Button gerade disabled sein soll */}
      <NewTaskForm onCreate={handleCreateTask} isSubmitting={isCreating} />

      {/* Kanban-Board mit 3 Spalten */}
      <section className="board">
        <KanbanColumn
          title="To Do"
          tasks={tasksByStatus("To Do")}        // nur Tasks mit Status "To Do"
          onStatusChange={handleStatusChange}  // Funktion zum Status ändern weitergeben
        />
        <KanbanColumn
          title="In Progress"
          tasks={tasksByStatus("In Progress")}
          onStatusChange={handleStatusChange}
        />
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
// NEU: Formular-Komponente zum Erstellen
// einer neuen Task
// ======================================

// Props:
// onCreate     = Funktion aus App, die aufgerufen wird, wenn das Formular abgeschickt wird
// isSubmitting = true/false, ob gerade an das Backend gesendet wird
function NewTaskForm({ onCreate, isSubmitting }) {
  // ---------- LOKALER STATE NUR FÜR DAS FORMULAR ----------

  // Titel-Feld
  const [title, setTitle] = useState("");

  // Beschreibung-Feld
  const [description, setDescription] = useState("");

  // Status-Auswahl (Dropdown), Standardwert: "To Do"
  const [status, setStatus] = useState("To Do");

  // Priority-Auswahl (Dropdown), Standardwert: "high"
  const [priority, setPriority] = useState("high");

  // Wird aufgerufen, wenn der User im Formular auf "Task erstellen" klickt
  const handleSubmit = (event) => {
    // Verhindert, dass der Browser die Seite neu lädt
    event.preventDefault();

    // Mini-Validierung:
    // Wenn der Titel leer ist, zeigen wir eine Alert-Meldung
    if (!title.trim()) {
      alert("Bitte Titel eingeben.");
      return;
    }

    // Objekt mit den neuen Taskdaten zusammenbauen
    const newTaskData = {
      title: title.trim(),
      description: description.trim(),
      status,    // aktueller Status-Wert aus dem State
      priority,  // aktuelle Priority
    };

    // Eltern-Komponente (App) informieren:
    // App ruft dann handleCreateTask(newTaskData) auf
    onCreate(newTaskData);

    // Felder im Formular zurücksetzen
    setTitle("");
    setDescription("");
    setStatus("To Do");
    setPriority("high");
  };

  // ---------- JSX (HTML-ähnliche Struktur) FÜR DAS FORMULAR ----------

  return (
    <section className="new-task-card">
      <h2 className="new-task-title">Neue Task erstellen</h2>

      {/* onSubmit = welche Funktion soll aufgerufen werden, wenn das Formular abgeschickt wird */}
      <form className="new-task-form" onSubmit={handleSubmit}>
        {/* Titel-Feld */}
        <div className="form-row">
          <label className="form-label">
            Titel *
            <input
              className="form-input"
              type="text"
              value={title}                       // Wert kommt aus dem State
              onChange={(e) => setTitle(e.target.value)} // bei Eingabe → State aktualisieren
              placeholder="z.B. Präsentation vorbereiten"
            />
          </label>
        </div>

        {/* Beschreibung-Feld */}
        <div className="form-row">
          <label className="form-label">
            Beschreibung
            <textarea
              className="form-textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Optional: kurze Beschreibung"
            />
          </label>
        </div>

        {/* Status- und Priority-Auswahl nebeneinander */}
        <div className="form-row form-row-inline">
          {/* Status-Dropdown */}
          <label className="form-label">
            Status
            <select
              className="form-select"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="To Do">To Do</option>
              <option value="In Progress">In Progress</option>
              <option value="Done">Done</option>
            </select>
          </label>

          {/* Priority-Dropdown */}
          <label className="form-label">
            Priority
            <select
              className="form-select"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
            >
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </label>
        </div>

        {/* Button zum Erstellen */}
        <div className="form-row">
          <button className="form-button" type="submit" disabled={isSubmitting}>
            {/* Text ändert sich je nach isSubmitting */}
            {isSubmitting ? "Wird erstellt..." : "Task erstellen"}
          </button>
        </div>
      </form>
    </section>
  );
}

// ======================================
// Spalte im Kanban-Board
// ======================================

function KanbanColumn({ title, tasks, onStatusChange }) {
  return (
    <div className="column">
      <h2 className="column-title">{title}</h2>

      {/* Falls keine Tasks in dieser Spalte sind */}
      {tasks.length === 0 ? (
        <p className="column-empty">Keine Tasks</p>
      ) : (
        // Sonst alle Tasks als Karten anzeigen
        <div className="column-tasks">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}               // React braucht einen eindeutigen key
              task={task}                 // die Task selbst
              onStatusChange={onStatusChange} // Funktion zum Status ändern
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ======================================
// Task-Karte (einzelne Aufgabe im Board)
// ======================================

function TaskCard({ task, onStatusChange }) {
  // Priority wird in eine CSS-Klasse übersetzt,
  // damit wir im CSS die richtige Farbe setzen können.
  const priorityClass =
    task.priority === "high"
      ? "priority-dot-high"
      : task.priority === "medium"
      ? "priority-dot-medium"
      : "priority-dot-low";

  // Wird aufgerufen, wenn im Status-Dropdown ein neuer Wert gewählt wird
  const handleSelectChange = (event) => {
    const newStatus = event.target.value; // neuer Status aus dem <select>
    onStatusChange(task.id, newStatus);   // App informieren
  };

  return (
    <article className="task-card">
      {/* Titel anzeigen */}
      <h3 className="task-title">{task.title}</h3>

      {/* Beschreibung nur anzeigen, wenn sie existiert */}
      {task.description && (
        <p className="task-description">{task.description}</p>
      )}

      {/* Untere Zeile: Status-Dropdown + Priority-Punkt */}
      <div className="task-meta">
        {/* Status-Dropdown */}
        <label className="status-label">
          Status:
          <select
            className="status-select"
            value={task.status}          // aktueller Status
            onChange={handleSelectChange} // bei Änderung → handleSelectChange
          >
            <option value="To Do">To Do</option>
            <option value="In Progress">In Progress</option>
            <option value="Done">Done</option>
          </select>
        </label>

        {/* Priority-Farbpunkt (keine Schrift, nur Farbe) */}
        <span className={`priority-dot ${priorityClass}`}></span>
      </div>
    </article>
  );
}

// Diese Komponente ist die "Hauptkomponente" und wird in main.jsx gerendert
export default App;