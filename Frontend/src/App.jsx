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

import { useState, useEffect } from "react";
import { Routes, Route, useNavigate, useSearchParams } from "react-router-dom";

// 🔹 CSS-Datei für das Styling importieren
import "./App.css";

// 🔹 Funktionen für die Kommunikation mit dem Backend
// fetchTasks  = alle Tasks aus der Datenbank lesen (GET /tasks)
// updateTask  = eine bestehende Task ändern      (PUT /tasks/:id)
// createTask  = eine neue Task erstellen         (POST /tasks)
import { fetchTasks, updateTask, createTask, deleteTask } from "./api";


// ===============================
// KALENDER-SEITE (Startseite "/")
// ===============================
function CalendarPage() {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState("week"); // "week" oder "month"

  const today = new Date();

  // Woche = heute + nächste 6 Tage
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    return d;
  });

  // Monat = 30 Tage im aktuellen Monat (einfaches Beispiel)
  const monthDays = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth(), i + 1);
    return d;
  });

  const daysToShow = viewMode === "week" ? weekDays : monthDays;

  const handleDayClick = (date) => {
    const isoDate = date.toISOString().split("T")[0];
    navigate(`/board?date=${isoDate}`);
  };

  return (
    <div className="app-shell">
      {/* Seitenleiste links */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <span className="sidebar-logo">📅</span>
          <span className="sidebar-title">Task Manager</span>
        </div>

        <nav className="sidebar-nav">
          <button
            className="sidebar-link active"
            onClick={() => navigate("/")}
          >
            Home
          </button>
          <button
            className="sidebar-link"
            onClick={() => setViewMode("week")}
          >
            Woche
          </button>
          <button
            className="sidebar-link"
            onClick={() => setViewMode("month")}
          >
            Monat
          </button>
          <button
            className="sidebar-link"
            onClick={() => navigate("/board")}
          >
            Board
          </button>
        </nav>
      </aside>

      {/* Hauptbereich rechts */}
      <main className="calendar-main">
        <div className="calendar-page">
          <h1>
            <span role="img" aria-label="calendar">
              📅
            </span>{" "}
            Dein Task Kalender
          </h1>

          {/* kleine Info, welcher Modus */}
          <p className="calendar-subtitle">
            Ansicht: {viewMode === "week" ? "Woche" : "Monat"}
          </p>

          {/* Kreise für Tage */}
          <div className="calendar-circle-grid">
            {daysToShow.map((d, index) => (
              <button
                key={index}
                className="calendar-day-circle"
                onClick={() => handleDayClick(d)}
              >
                <span className="circle-day-number">
                  {d.toLocaleDateString("de-DE", { day: "2-digit" })}
                </span>
                <span className="circle-day-label">
                  {d.toLocaleDateString("de-DE", {
                    weekday: "short",
                    month: "2-digit",
                  })}
                </span>
              </button>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}


// ======================================
// Haupt-Komponente der App
// ======================================
function KanbanPage() {
  // Datum aus der URL, z.B. /board?date=2025-12-26
  const [searchParams] = useSearchParams();
  const selectedDate = searchParams.get("date"); // string oder null

  // Hilfsfunktion: macht aus einem Datum (YYYY-MM-DD) ein Kürzel wie "MON", "TUE", ...
  const getWeekdayCode = (dateStr) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) {
      console.warn("Ungültiges Datum in getWeekdayCode:", dateStr);
      return null;
    }
    const day = d.getDay(); // 0=So, 1=Mo, ...
    const map = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
    return map[day];
  };

  // State
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  // Beim Laden Tasks holen
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError("");
        const data = await fetchTasks();
        setTasks(data);
      } catch (err) {
        console.error(err);
        setError(err.message || "Fehler beim Laden der Tasks");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Tasks nach Status + Arbeitstag / repeat_days filtern
  const tasksByStatus = (status) =>
    tasks.filter((task) => {
      if (!selectedDate) {
        // Kein Tag gewählt → alle Tasks mit diesem Status
        return task.status === status;
      }

      const weekdayCode = getWeekdayCode(selectedDate);

      // repeat_days vom Backend ist z.B. "MON,SAT" oder null
      const repeatStr = task.repeat_days || "";
      const repeatList = repeatStr.split(",").filter(Boolean); // ["MON","SAT"]

      const matchesStatus = task.status === status;
      const matchesWorkDate = task.work_date === selectedDate;
      const matchesRepeat =
        weekdayCode && repeatList.length > 0 && repeatList.includes(weekdayCode);

      return matchesStatus && (matchesWorkDate || matchesRepeat);
    });

  // Status aus der Karte ändern (wie früher)
  const handleStatusChange = async (taskId, newStatus) => {
    try {
      setError("");
      const updatedTask = await updateTask(taskId, { status: newStatus });
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? updatedTask : t))
      );
    } catch (err) {
      console.error(err);
      setError(err.message || "Fehler beim Ändern des Status");
    }
  };

  // Task löschen
  const handleDeleteTask = async (taskId) => {
    const sicher = window.confirm("Willst du diese Task wirklich löschen?");

    if (!sicher) return;

    try {
      setError("");
      await deleteTask(taskId);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    } catch (err) {
      console.error(err);
      setError(err.message || "Fehler beim Löschen der Task");
    }
  };

  // Task bearbeiten: Modal öffnen
  const handleStartEditTask = (task) => {
    setEditingTask(task);
  };

  // Edit-Modal schließen
  const handleCloseEdit = () => {
    setEditingTask(null);
  };

  // Änderungen speichern
  const handleSaveEditTask = async (updatedFields) => {
    try {
      setError("");
      // Backend-Update
      const updated = await updateTask(editingTask.id, updatedFields);

      // State aktualisieren
      setTasks((prev) =>
        prev.map((t) => (t.id === editingTask.id ? updated : t))
      );

      setEditingTask(null);
    } catch (err) {
      console.error(err);
      setError(err.message || "Fehler beim Bearbeiten der Task");
    }
  };

  // Neue Task erstellen
  const handleCreateTask = async (formData) => {
    try {
      setError("");
      setIsCreating(true);

      const created = await createTask(formData);
      console.log("Vom Backend zurück:", created);

      setTasks((prev) => [...prev, created]);
    } catch (err) {
      console.error(err);
      setError(err.message || "Fehler beim Erstellen der Task");
    } finally {
      setIsCreating(false);
    }
  };

  if (loading) {
    return <div className="page-wrapper">Loading tasks...</div>;
  }

  return (
    <div className="page-wrapper">
      <header className="page-header">
        <h1>Task Manager – React Kanban</h1>

        {selectedDate ? (
          <p className="page-subtitle">
            To-Do-Liste für den{" "}
            {new Date(selectedDate).toLocaleDateString("de-DE")}
          </p>
        ) : (
          <p className="page-subtitle">
            Alle Tasks – kein bestimmter Tag ausgewählt.
          </p>
        )}
      </header>

      {error && <p className="error-text">Error: {error}</p>}

      {/* Formular → bekommt selectedDate als initialDate */}
      <NewTaskForm
        onCreate={handleCreateTask}
        isSubmitting={isCreating}
        initialDate={selectedDate}
      />

      {/* Kanban-Spalten */}
      <section className="board">
        <KanbanColumn
          title="To Do"
          tasks={tasksByStatus("To Do")}
          onStatusChange={handleStatusChange}
          onDeleteTask={handleDeleteTask}
          onEditTask={handleStartEditTask}
        />
        <KanbanColumn
          title="In Progress"
          tasks={tasksByStatus("In Progress")}
          onStatusChange={handleStatusChange}
          onDeleteTask={handleDeleteTask}
          onEditTask={handleStartEditTask}
        />
        <KanbanColumn
          title="Done"
          tasks={tasksByStatus("Done")}
          onStatusChange={handleStatusChange}
          onDeleteTask={handleDeleteTask}
          onEditTask={handleStartEditTask}
        />
      </section>
      
      {/* Edit-Modal, wenn eine Task ausgewählt ist */}
      <EditTaskModal
        task={editingTask}
        onClose={handleCloseEdit}
        onSave={handleSaveEditTask}
      />  
    </div>
  );
}

//======================================
// NEUE App-Komponente: kümmert sich NUR 
// um die Routen
//======================================
function App() {
  return (
    <>
      {/* 
        Routes = sagt React, welche Seite wann angezeigt wird 
      */}
      <Routes>

        {/* 
          Wenn der User http://localhost:5173/ öffnet
          → Kalender anzeigen
        */}
        <Route path="/" element={<CalendarPage />} />

        {/* 
          Wenn der User http://localhost:5173/board öffnet
          → Kanban Board anzeigen
        */}
        <Route path="/board" element={<KanbanPage />} />
      </Routes>
    </>
  );
}

// -----------------------------------------
// Wichtig: jetzt exportieren wir DIESE App()
// nicht mehr KanbanPage!
// -----------------------------------------
export default App;   // ⭐ NUR DIESER DARF BLEIBEN ⭐


// ======================================
// NEU: Formular-Komponente zum Erstellen
// einer neuen Task
// ======================================

// Props:
// onCreate     = Funktion aus App, die aufgerufen wird, wenn das Formular abgeschickt wird
// isSubmitting = true/false, ob gerade an das Backend gesendet wird
// ======================================
// Formular-Komponente für neue Tasks
// ======================================
function NewTaskForm({ onCreate, isSubmitting, initialDate }) {
  // Titel-Feld
  const [title, setTitle] = useState("");
  // Beschreibung
  const [description, setDescription] = useState("");
  // Status-Dropdown
  const [status, setStatus] = useState("To Do");
  // Priority-Dropdown
  const [priority, setPriority] = useState("high");
  // Deadline (datetime-local)
  const [dueDate, setDueDate] = useState("");

  const [repeatDays, setRepeatDays] = useState([]);

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!title.trim()) {
      alert("Bitte Titel eingeben.");
      return;
    }

    // 🔹 Payload fürs Backend bauen
    const newTaskData = {
      title: title.trim(),
      description: description.trim(),
      status,
      priority,
      // kann leer sein → Backend darf das zulassen
      due_date: dueDate || null,
      // Arbeitstag aus der URL (Kalender-Tag)
      work_date: initialDate || null,
      // NEU: Wiederholungstage (Liste)
      repeat_days: repeatDays,
    };

    console.log("Sende neuen Task:", newTaskData);

    // Nur ausführen, wenn eine Funktion übergeben wurde
    if (typeof onCreate === "function") {
      onCreate(newTaskData);
    } else {
      console.error("❌ onCreate wurde nicht als Funktion übergeben!");
    }

    // Felder zurücksetzen
    setTitle("");
    setDescription("");
    setStatus("To Do");
    setPriority("high");
    setDueDate("");
  };

  return (
    <section className="new-task-card">
      <h2 className="new-task-title">Neue Task erstellen</h2>

      <form className="new-task-form" onSubmit={handleSubmit}>
        {/* Titel */}
        <div className="form-row">
          <label className="form-label">
            Titel *
            <input
              className="form-input"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="z.B. Präsentation vorbereiten"
            />
          </label>
        </div>

        {/* Beschreibung */}
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

        {/* Status + Priority nebeneinander */}
        <div className="form-row form-row-inline">
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

        {/* Deadline-Feld */}
        <div className="form-row">
          <label className="form-label">
            Deadline
            <input
              className="form-input"
              type="datetime-local"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </label>
        </div>

        {/* NEU: Wiederholen an bestimmten Tagen (z.B. Samstag) */}
        <div className="form-row">
          <span className="form-label">Wiederholen an:</span>
          <div className="repeat-days">
            {[
              { code: "MON", label: "Mo" },
              { code: "TUE", label: "Di" },
              { code: "WED", label: "Mi" },
              { code: "THU", label: "Do" },
              { code: "FRI", label: "Fr" },
              { code: "SAT", label: "Sa" },
              { code: "SUN", label: "So" },
            ].map((day) => (
              <label key={day.code} className="repeat-day-option">
                <input
                  type="checkbox"
                  checked={repeatDays.includes(day.code)}
                  onChange={() => {
                    setRepeatDays((prev) =>
                      prev.includes(day.code)
                        ? prev.filter((d) => d !== day.code)
                        : [...prev, day.code]
                    );
                  }}
                />
                {day.label}
              </label>
            ))}
          </div>
        </div>

        {/* Button */}
        <div className="form-row">
          <button
            className="form-button"
            type="submit"
            disabled={isSubmitting}
          >
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

function KanbanColumn({ title, tasks, onStatusChange, onDeleteTask, onEditTask }) {
  return (
    <div className="column">
      <h2 className="column-title">{title}</h2>

      {tasks.length === 0 ? (
        <p className="column-empty">Keine Tasks</p>
      ) : (
        <div className="column-tasks">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onStatusChange={onStatusChange}
              onDeleteTask={onDeleteTask}
              onEditTask={onEditTask}
            />
          ))}
        </div>
      )}
    </div>
  );
}


// ======================================
// Edit-Modal für bestehende Tasks
// ======================================
function EditTaskModal({ task, onClose, onSave }) {
  if (!task) return null;

  const [title, setTitle] = useState(task.title || "");
  const [description, setDescription] = useState(task.description || "");
  const [status, setStatus] = useState(task.status || "To Do");
  const [priority, setPriority] = useState(task.priority || "high");

  // Deadline
  const initialDue =
    task.due_date && task.due_date.length >= 16
      ? task.due_date.slice(0, 16)
      : "";
  const [dueDate, setDueDate] = useState(initialDue);

  // NEU: Repeat Days (String → Array)
  const initialRepeat =
    (task.repeat_days || "")
      .split(",")
      .map((d) => d.trim())
      .filter(Boolean); // z.B. ["MON","SAT"]
  const [repeatDays, setRepeatDays] = useState(initialRepeat);

  const handleSubmit = (e) => {
    e.preventDefault();

    onSave({
      title: title.trim(),
      description: description.trim(),
      status,
      priority,
      due_date: dueDate || null,
      repeat_days: repeatDays,
    });
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <h2>Task bearbeiten</h2>

        <form onSubmit={handleSubmit} className="edit-task-form">
          <label className="form-label">
            Titel
            <input
              className="form-input"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>

          <label className="form-label">
            Beschreibung
            <textarea
              className="form-textarea"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>

          <div className="form-row form-row-inline">
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

          <label className="form-label">
            Deadline
            <input
              className="form-input"
              type="datetime-local"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </label>

          {/* NEU: Wiederholen an bestimmten Tagen */}
          <div className="form-row">
            <span className="form-label">Wiederholen an:</span>
            <div className="repeat-days">
              {[
                { code: "MON", label: "Mo" },
                { code: "TUE", label: "Di" },
                { code: "WED", label: "Mi" },
                { code: "THU", label: "Do" },
                { code: "FRI", label: "Fr" },
                { code: "SAT", label: "Sa" },
                { code: "SUN", label: "So" },
              ].map((day) => (
                <label key={day.code} className="repeat-day-option">
                  <input
                    type="checkbox"
                    checked={repeatDays.includes(day.code)}
                    onChange={() => {
                      setRepeatDays((prev) =>
                        prev.includes(day.code)
                          ? prev.filter((d) => d !== day.code)
                          : [...prev, day.code]
                      );
                    }}
                  />
                  {day.label}
                </label>
              ))}
            </div>
          </div>

          <div className="form-row form-row-inline modal-actions">
            <button
              type="button"
              className="form-button secondary"
              onClick={onClose}
            >
              Abbrechen
            </button>
            <button type="submit" className="form-button">
              Speichern
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}



// ======================================
// Task-Karte (einzelne Aufgabe im Board)
// ======================================

function TaskCard({ task, onStatusChange, onDeleteTask, onEditTask }) {

  const deadlineText = task.due_date
    ? new Date(task.due_date).toLocaleString("de-DE")
    : null;

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
      {deadlineText && (
         <p className="task-deadline">
           <strong>Deadline:</strong> {deadlineText}
         </p>
      )}

      {/* Aktionen oben rechts: Bearbeiten & Löschen (sichtbar bei Hover) */}
      <div className="task-actions">
        <button
          type="button"
          className="icon-button"
          onClick={() => onEditTask && onEditTask(task)}
        >
          ✏️
        </button>
        <button
          type="button"
          className="icon-button"
          onClick={() => onDeleteTask && onDeleteTask(task.id)}
        >
          🗑️
        </button>
      </div>

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

