// src/App.jsx
// ======================================
// Task Manager – React Kanban
// ======================================

import { useState, useEffect } from "react";

//import { Routes, Route, useNavigate } from "react-router-dom";
import "./App.css";
import { fetchTasks, updateTask, createTask, deleteTask } from "./api";

//import { Routes, Route, useNavigate, useSearchParams } from "react-router-dom";
//import { Routes, Route } from "react-router-dom";

import { Routes, Route, useNavigate, useSearchParams } from "react-router-dom";

import LoginPage from "./LoginPage";
import ProtectedRoute from "./ProtectedRoute";

import RegisterPage from "./RegisterPage";


function authHeaders() {
  const userEmail = localStorage.getItem("userEmail") || "";
  return {
    "Content-Type": "application/json",
    "X-User-Email": userEmail,
  };
}

function authHeaderOnly() {
  const userEmail = localStorage.getItem("userEmail") || "";
  return { "X-User-Email": userEmail };
}


const dismissedKey = (email) => `dismissedReminders:${email || "guest"}`;

function loadDismissed(email) {
  try {
    return JSON.parse(localStorage.getItem(dismissedKey(email)) || "[]");
  } catch {
    return [];
  }
}

function saveDismissed(email, ids) {
  localStorage.setItem(dismissedKey(email), JSON.stringify(ids));
}




// ===============================
// KALENDER-SEITE (Startseite "/")
// ===============================
function CalendarPage() {
  const navigate = useNavigate();
  
  // ✅ Lokales ISO-Datum (YYYY-MM-DD) OHNE UTC-Shift
  const toLocalISO = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  // ✅ Wochentag-Code aus ISO-String ("YYYY-MM-DD")
  const getWeekdayCode = (dateStr) => {
    const d = new Date(dateStr);
    const map = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
    return map[d.getDay()];
  };

  // ✅ repeat_days robust lesen (String "MON,TUE" ODER Array ["MON","TUE"])
  const normalizeRepeatList = (repeat_days) => {
    if (!repeat_days) return [];
    if (Array.isArray(repeat_days)) {
      return repeat_days.map((x) => String(x).trim()).filter(Boolean);
    }
    return String(repeat_days)
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
  };

  const today = new Date();
  const todayIso = toLocalISO(today);

  // "week" = Tagesansicht (Tag), "month" = Monatsübersicht
  const [viewMode, setViewMode] = useState("week");

  // aktuell ausgewähltes Datum (für Text "Aufgaben für ...")
  const [selectedDate, setSelectedDate] = useState(todayIso);

  // Monat, der im Kalender angezeigt wird
  const [currentMonthDate, setCurrentMonthDate] = useState(() => new Date());

  // Tasks
  const [dayTasks, setDayTasks] = useState([]); // Tasks für den Tag
  const [monthTasks, setMonthTasks] = useState([]); // echte work_date-Tasks im Monat
  const [allTasksCache, setAllTasksCache] = useState([]); // alle Tasks (für repeat)

  const [loadingDay, setLoadingDay] = useState(false);
  const [errorDay, setErrorDay] = useState("");

  // Formular-Status (Tag-Ansicht)
  const [isCreatingHome, setIsCreatingHome] = useState(false);
  const [showFormHome, setShowFormHome] = useState(false);

  // Reminder-Logik (nur für Tag)
  const [now, setNow] = useState(new Date());
  
  const [isAuth, setIsAuth] = useState(localStorage.getItem("isAuth") === "true");
  const [userEmail, setUserEmail] = useState(localStorage.getItem("userEmail") || "");
   
  const [dismissedReminderIds, setDismissedReminderIds] = useState(() =>
  loadDismissed(localStorage.getItem("userEmail") || "")
  );


   useEffect(() => {
  // immer wenn isAuth wechselt, Email neu lesen
  setUserEmail(localStorage.getItem("userEmail") || "");
   }, [isAuth]);


  useEffect(() => {
  setDismissedReminderIds(loadDismissed(userEmail));
   }, [userEmail]);


  // Edit-Modal im Tag-Modus
  const [editingTaskHome, setEditingTaskHome] = useState(null);

  // Filter für Monatsliste & Highlight (null = alle Tage, "YYYY-MM-DD" = nur dieser Tag)
  const [monthFilterDate, setMonthFilterDate] = useState(null);

  

  // Woche = heute + nächste 6 Tage
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    return d;
  });

  // Basisdatum für den Monat = currentMonthDate
  const year = currentMonthDate.getFullYear();
  const month = currentMonthDate.getMonth(); // 0 = Jan

  // Anzahl der Tage in diesem Monat
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Alle Tage des Monats
  const monthDays = Array.from({ length: daysInMonth }, (_, i) => {
    return new Date(year, month, i + 1);
  });

  const daysToShow = viewMode === "week" ? weekDays : monthDays;

  // =========================
  // Klick auf einen Tag im Kalender
  // =========================
  const handleDayClick = (date) => {
    const isoDate = toLocalISO(date);

    // Monat auf den Monat dieses Datums setzen
    setCurrentMonthDate(new Date(date.getFullYear(), date.getMonth(), 1));

    if (viewMode === "week") {
      setSelectedDate(isoDate);
      return;
    }

    // MONAT-Modus: Filter an/aus schalten
    setMonthFilterDate((prev) => (prev === isoDate ? null : isoDate));

    // selectedDate setzen, damit oben der Text stimmt
    setSelectedDate(isoDate);
  };

  const goToPrevMonth = () => {
    setCurrentMonthDate((prev) => {
      const next = new Date(prev.getFullYear(), prev.getMonth() - 1, 1);
      setSelectedDate(toLocalISO(next));
      setMonthFilterDate(null);
      return next;
    });
  };

  const goToNextMonth = () => {
    setCurrentMonthDate((prev) => {
      const next = new Date(prev.getFullYear(), prev.getMonth() + 1, 1);
      setSelectedDate(toLocalISO(next));
      setMonthFilterDate(null);
      return next;
    });
  };

  // Uhrzeit für Reminder
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(id);
  }, []);

  // =========================
  // Tasks für Tag + Monat laden
  // =========================
  useEffect(() => {
    const loadTasksForDayAndMonth = async () => {
      try {
        setLoadingDay(true);
        setErrorDay("");

        const allTasks = await fetchTasks();
        setAllTasksCache(allTasks);

        // ---------- TAG: work_date ODER repeat_days ----------
        const weekdayCode = getWeekdayCode(selectedDate);

        const tasksForDay = allTasks.filter((task) => {
          const repeatList = normalizeRepeatList(task.repeat_days);

          const matchesWorkDate = task.work_date === selectedDate;
          const matchesRepeat = repeatList.includes(weekdayCode);

          return matchesWorkDate || matchesRepeat;
        });
        setDayTasks(tasksForDay);

        // ---------- MONAT: echte work_date-Tasks im Monat ----------
        const y = currentMonthDate.getFullYear();
        const m = currentMonthDate.getMonth();

        const tasksForMonth = allTasks.filter((task) => {
          if (!task.work_date) return false;
          const d = new Date(task.work_date);
          return d.getFullYear() === y && d.getMonth() === m;
        });

        setMonthTasks(tasksForMonth);
      } catch (err) {
        console.error(err);
        setErrorDay(err.message || "Fehler beim Laden der Tasks");
      } finally {
        setLoadingDay(false);
      }
    };

    if (selectedDate) loadTasksForDayAndMonth();
  }, [selectedDate, currentMonthDate]);

  // =========================
  // Reminder für Tag
  // =========================
  const dueReminders = dayTasks.filter((task) => {
    if (!task.reminder_time) return false;
    if (dismissedReminderIds.includes(task.id)) return false;
    return new Date(task.reminder_time) <= now;
  });

  const handleDismissReminderHome = (taskId) => {
  setDismissedReminderIds((prev) => {
    const next = prev.includes(taskId) ? prev : [...prev, taskId];
    saveDismissed(userEmail, next);
    return next;
  });
};

  // =========================
  // Status / Delete / Edit
  // =========================
  const handleStatusChangeHome = async (taskId, newStatus) => {
    try {
      setErrorDay("");
      const updated = await updateTask(taskId, { status: newStatus });

      setDayTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
      setMonthTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
      setAllTasksCache((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
    } catch (err) {
      console.error(err);
      setErrorDay(err.message || "Fehler beim Ändern des Status");
    }
  };

  const handleDeleteTaskHome = async (taskId) => {
    if (!window.confirm("Task löschen?")) return;
    try {
      setErrorDay("");
      await deleteTask(taskId);

      setDayTasks((prev) => prev.filter((t) => t.id !== taskId));
      setMonthTasks((prev) => prev.filter((t) => t.id !== taskId));
      setAllTasksCache((prev) => prev.filter((t) => t.id !== taskId));
    } catch (err) {
      console.error(err);
      setErrorDay(err.message || "Fehler beim Löschen der Task");
    }
  };

  const handleSaveEditHome = async (fields) => {
    if (!editingTaskHome) return;
    try {
      setErrorDay("");
      const updated = await updateTask(editingTaskHome.id, fields);

      setDayTasks((prev) =>
        prev.map((t) => (t.id === editingTaskHome.id ? updated : t))
      );
      setMonthTasks((prev) =>
        prev.map((t) => (t.id === editingTaskHome.id ? updated : t))
      );
      setAllTasksCache((prev) =>
        prev.map((t) => (t.id === editingTaskHome.id ? updated : t))
      );

      setEditingTaskHome(null);
    } catch (err) {
      console.error(err);
      setErrorDay(err.message || "Fehler beim Bearbeiten der Task");
    }
  };

  // ✅ WICHTIG: work_date aus dem Formular NICHT überschreiben!
  const handleCreateTaskHome = async (formData) => {
    try {
      setErrorDay("");
      setIsCreatingHome(true);

      const payload = {
        ...formData,
        // ✅ Priorität: Datum aus Formular (work_date)
        // Fallback: selectedDate (falls Formular keins schickt)
        work_date: formData?.work_date || selectedDate || null,
      };

      const created = await createTask(payload);

      // Cache immer aktualisieren
      setAllTasksCache((prev) => [...prev, created]);

      // Tag-Liste: nur wenn es wirklich zum aktuell ausgewählten Tag passt
      const weekdayCode = getWeekdayCode(selectedDate);
      const repeatList = normalizeRepeatList(created.repeat_days);

      const matchesWorkDate = created.work_date === selectedDate;
      const matchesRepeat = repeatList.includes(weekdayCode);

      if (matchesWorkDate || matchesRepeat) {
        setDayTasks((prev) => [...prev, created]);
      }

      // Monatsliste: nur echte work_date im aktuell angezeigten Monat
      if (created.work_date) {
        const d = new Date(created.work_date);
        if (
          d.getFullYear() === currentMonthDate.getFullYear() &&
          d.getMonth() === currentMonthDate.getMonth()
        ) {
          setMonthTasks((prev) => [...prev, created]);
        }
      }

      setShowFormHome(false);
    } catch (err) {
      console.error(err);
      setErrorDay(err.message || "Fehler beim Erstellen der Task");
    } finally {
      setIsCreatingHome(false);
    }
  };

  // Tasks im Tag-Modus nach Status
  const tasksByStatusDay = (status) => dayTasks.filter((t) => t.status === status);

  // Datum schön anzeigen
  const selectedDateLabel = new Date(selectedDate).toLocaleDateString("de-DE", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  // =========================
  // ✅ Repeat-Tasks, die im Monat vorkommen (ab heute / ab Startdatum)
  // =========================
  const getRepeatsForMonth = () => {
    const monthStartIso = toLocalISO(new Date(year, month, 1));
    const monthEndIso = toLocalISO(new Date(year, month, daysInMonth));

    const visibleStartIso = monthStartIso < todayIso ? todayIso : monthStartIso;

    // Monat komplett Vergangenheit -> keine repeats
    if (visibleStartIso > monthEndIso) return [];

    const weekdaySet = new Set();
    const start = new Date(visibleStartIso);
    const end = new Date(monthEndIso);

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      weekdaySet.add(getWeekdayCode(toLocalISO(d)));
    }

    const repeatTasks = allTasksCache.filter((task) => {
      const repeatList = normalizeRepeatList(task.repeat_days);
      if (repeatList.length === 0) return false;

      // Startdatum: wenn work_date existiert und NACH Monatsende -> nein
      if (task.work_date && task.work_date > monthEndIso) return false;

      // irgendein Wiederholungstag kommt im (sichtbaren) Monat vor?
      return repeatList.some((code) => weekdaySet.has(code));
    });

    // Duplikate vermeiden (falls Task auch work_date in diesem Monat hat)
    const monthIds = new Set(monthTasks.map((t) => t.id));
    return repeatTasks.filter((t) => !monthIds.has(t.id));
  };

  // =========================
  // ✅ Monatsliste:
  // - Ohne Filter: work_date-Tasks + repeats im Monat
  // - Mit Filter: work_date==Tag + repeats für diesen Tag (nicht rückwirkend)
  // =========================
  const visibleMonthTasks = (() => {
    // OHNE Filter: "Alle Aufgaben in diesem Monat"
    if (monthFilterDate === null) {
      const repeatsInMonth = getRepeatsForMonth();

      const merged = [...monthTasks, ...repeatsInMonth];
      const unique = [];
      const seen = new Set();
      for (const t of merged) {
        if (!seen.has(t.id)) {
          seen.add(t.id);
          unique.push(t);
        }
      }
      return unique;
    }

    // MIT Filter: Aufgaben an diesem Tag
    const weekdayCode = getWeekdayCode(monthFilterDate);

    const exact = monthTasks.filter((t) => t.work_date === monthFilterDate);

    const repeats = allTasksCache.filter((task) => {
      const repeatList = normalizeRepeatList(task.repeat_days);
      if (repeatList.length === 0) return false;

      if (task.work_date === monthFilterDate) return false;

      // repeats NICHT vor heute
      if (monthFilterDate < todayIso) return false;

      // erst ab Startdatum (work_date) wenn gesetzt
      if (task.work_date && monthFilterDate < task.work_date) return false;

      return repeatList.includes(weekdayCode);
    });

    const merged = [...exact, ...repeats];
    const unique = [];
    const seen = new Set();
    for (const t of merged) {
      if (!seen.has(t.id)) {
        seen.add(t.id);
        unique.push(t);
      }
    }
    return unique;
  })();

  const monthSectionTitle =
    monthFilterDate === null
      ? "Alle Aufgaben in diesem Monat"
      : `Aufgaben am ${new Date(monthFilterDate).toLocaleDateString("de-DE", {
          weekday: "long",
          day: "2-digit",
          month: "long",
          year: "numeric",
        })}`;

   return (
  <div className="app-shell app-shell--with-topbar">
    {/* TOPBAR über ALLEM: Sidebar + Content */}
    <div className="topbar">
      <div className="topbar-inner">
        <h1>
          <span role="img" aria-label="calendar">
            📋
          </span>{" "}
          Dein Task Kalender
        </h1>

        {viewMode === "month" && (
          <div className="month-nav">
            <button
              type="button"
              className="month-nav-button"
              onClick={goToPrevMonth}
            >
              ⬅
            </button>
            <span className="month-nav-label">
              {currentMonthDate.toLocaleDateString("de-DE", {
                month: "long",
                year: "numeric",
              })}
            </span>
            <button
              type="button"
              className="month-nav-button"
              onClick={goToNextMonth}
            >
              ➜
            </button>
          </div>
        )}
      </div>
    </div>

    {/* ROW: Sidebar links + Main rechts */}
    <div className="app-row">
      <aside className="sidebar">
        <div className="sidebar-header">
          <span className="sidebar-logo">📋</span>
          <span className="sidebar-title">Task Manager</span>
        </div>

        <nav className="sidebar-nav">
          <button
            className={"sidebar-link" + (viewMode === "week" ? " active" : "")}
            onClick={() => {
              setViewMode("week");
              setSelectedDate(todayIso);
              setMonthFilterDate(null);
              setCurrentMonthDate(new Date(today.getFullYear(), today.getMonth(), 1));
            }}
          >
            Woche
          </button>

          <button
            className={"sidebar-link" + (viewMode === "month" ? " active" : "")}
            onClick={() => {
              setViewMode("month");
              setMonthFilterDate(null);
              const d = new Date(selectedDate);
              setCurrentMonthDate(new Date(d.getFullYear(), d.getMonth(), 1));
            }}
          >
            Monat
          </button>

        {/* LOGIN / LOGOUT – GENAU HIER */}
  <button
  className="sidebar-link"
  onClick={() => {
    if (isAuth) {
      // Logout
      localStorage.removeItem("isAuth");
      localStorage.removeItem("userEmail");
      setIsAuth(false);
      navigate("/login");
    } else {
      navigate("/login");
    }
  }}
>
  {isAuth ? "Logout" : "Login"}
</button>



        </nav>
      </aside>

      

      <main className="calendar-main">
        <div className="calendar-page">
          <p className="calendar-subtitle">
            Ansicht: {viewMode === "week" ? "Tag" : "Monat"}
          </p>

          <div className="calendar-circle-grid">
            {daysToShow.map((d, index) => {
              const iso = toLocalISO(d);

              const isSelected =
                viewMode === "week" ? iso === selectedDate : monthFilterDate === iso;

              return (
                <button
                  key={index}
                  className={
                    "calendar-day-circle" +
                    (isSelected ? " calendar-day-circle-selected" : "")
                  }
                  onClick={() => handleDayClick(d)}
                >
                  <span className="circle-day-number">
                    {d.getDate().toString().padStart(2, "0")}
                  </span>
                  <span className="circle-day-label">
                    {d.toLocaleDateString("de-DE", { weekday: "short" })}
                  </span>
                </button>
              );
            })}
          </div>

          <h2 className="today-title">Aufgaben für {selectedDateLabel}</h2>

          {loadingDay && <p className="today-info">Lade Tasks...</p>}
          {errorDay && <p className="today-error">Fehler: {errorDay}</p>}

          {!loadingDay && dayTasks.length === 0 && !errorDay && (
            <p className="today-info">Du hast für diesen Tag keine Aufgaben. 🎉</p>
          )}

          {!loadingDay && dueReminders.length > 0 && (
            <div className="reminder-bar">
              <span className="reminder-title">🔔 Erinnerungen:</span>
              <div className="reminder-list">
                {dueReminders.map((t) => (
                  <div key={t.id} className="reminder-item">
                    <span className="reminder-text">{t.title}</span>
                    <button
                      className="reminder-dismiss"
                      onClick={() => handleDismissReminderHome(t.id)}
                    >
                      OK
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {viewMode === "week" && (
            <>
              <div className="home-form-wrapper">
                <button
                  type="button"
                  className="open-form-button"
                  onClick={() => setShowFormHome((prev) => !prev)}
                >
                  {showFormHome ? "− Neue Task erstellen" : "+ Neue Task erstellen"}
                </button>

                {showFormHome && (
                  <div className="home-form-panel">
                    <NewTaskForm
                      onCreate={handleCreateTaskHome}
                      isSubmitting={isCreatingHome}
                      initialDate={selectedDate}
                    />
                  </div>
                )}
              </div>

              <section className="board">
                <KanbanColumn
                  title="To Do"
                  tasks={tasksByStatusDay("To Do")}
                  onStatusChange={handleStatusChangeHome}
                  onDeleteTask={handleDeleteTaskHome}
                  onEditTask={setEditingTaskHome}
                />
                <KanbanColumn
                  title="In Progress"
                  tasks={tasksByStatusDay("In Progress")}
                  onStatusChange={handleStatusChangeHome}
                  onDeleteTask={handleDeleteTaskHome}
                  onEditTask={setEditingTaskHome}
                />
                <KanbanColumn
                  title="Done"
                  tasks={tasksByStatusDay("Done")}
                  onStatusChange={handleStatusChangeHome}
                  onDeleteTask={handleDeleteTaskHome}
                  onEditTask={setEditingTaskHome}
                />
              </section>

              <EditTaskModal
                task={editingTaskHome}
                onClose={() => setEditingTaskHome(null)}
                onSave={handleSaveEditHome}
              />
            </>
          )}

          {viewMode === "month" && (
            <section className="today-section">
              <h2 className="today-title">{monthSectionTitle}</h2>

              {visibleMonthTasks.length === 0 ? (
                <p className="today-info">Keine Aufgaben für diese Auswahl.</p>
              ) : (
                <div className="today-task-list">
                  {visibleMonthTasks.map((task) => {
                    const workDateText = task.work_date
                      ? new Date(task.work_date).toLocaleDateString("de-DE")
                      : null;

                    const priorityClass =
                      task.priority === "high"
                        ? "priority-dot-high"
                        : task.priority === "medium"
                        ? "priority-dot-medium"
                        : "priority-dot-low";

                    return (
                      <div key={task.id} className="today-task-card">
                        <div className="today-task-main">
                          <span className="today-task-title">{task.title}</span>
                          {task.description && (
                            <span className="today-task-desc">{task.description}</span>
                          )}
                          {workDateText && (
                            <span className="today-task-desc">📅 {workDateText}</span>
                          )}
                          {!workDateText && task.repeat_days && (
                            <span className="today-task-desc">
                              🔁 Wiederholt:{" "}
                              {Array.isArray(task.repeat_days)
                                ? task.repeat_days.join(",")
                                : task.repeat_days}
                            </span>
                          )}
                        </div>

                        <div className="today-task-meta">
                          <span className={`today-priority-dot ${priorityClass}`}></span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}
        </div>
      </main>
    </div>
  </div>
);
}

// ======================================
// BOARD-SEITE ("/board")
// ======================================
function KanbanPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const selectedDate = searchParams.get("date");

  const getWeekdayCode = (dateStr) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    const map = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
    return map[d.getDay()];
  };

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [isCreating, setIsCreating] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  const [now, setNow] = useState(new Date());
  const [dismissedReminderIds, setDismissedReminderIds] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await fetchTasks();
        setTasks(data);
      } catch (err) {
        setError(err.message || "Fehler beim Laden");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(id);
  }, []);

  const tasksByStatus = (status) =>
    tasks.filter((task) => {
      if (!selectedDate) return task.status === status;

      const weekdayCode = getWeekdayCode(selectedDate);
      const repeatDays = (task.repeat_days || "")
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean);

      const matchStatus = task.status === status;
      const matchExact = task.work_date === selectedDate;
      const matchRepeat = repeatDays.includes(weekdayCode);

      return matchStatus && (matchExact || matchRepeat);
    });

  const dueReminders = tasks.filter((task) => {
    if (!task.reminder_time) return false;
    if (dismissedReminderIds.includes(task.id)) return false;
    return new Date(task.reminder_time) <= now;
  });

  const dismissReminder = (id) =>
    setDismissedReminderIds((prev) => [...prev, id]);

  const changeStatus = async (taskId, newStatus) => {
    try {
      const updated = await updateTask(taskId, { status: newStatus });
      setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
    } catch (err) {
      setError(err.message);
    }
  };

  const deleteTaskHandler = async (taskId) => {
    if (!window.confirm("Task löschen?")) return;
    try {
      await deleteTask(taskId);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    } catch (err) {
      setError(err.message);
    }
  };

  const startEdit = (task) => setEditingTask(task);
  const closeEdit = () => setEditingTask(null);

  const saveEdit = async (fields) => {
    try {
      const updated = await updateTask(editingTask.id, fields);
      setTasks((p) => p.map((t) => (t.id === editingTask.id ? updated : t)));
      setEditingTask(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const createTaskHandler = async (formData) => {
    try {
      setIsCreating(true);
      const created = await createTask(formData);
      setTasks((prev) => [...prev, created]);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsCreating(false);
    }
  };

  if (loading)
    return (
      <div className="app-shell">
        <aside className="sidebar">
          <div className="sidebar-header">
            <span className="sidebar-logo">📅</span>
            <span className="sidebar-title">Task Manager</span>
          </div>
        </aside>
        <main className="board-main">
          <div className="page-wrapper">Loading...</div>
        </main>
      </div>
    );

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-header">
          <span className="sidebar-logo">📅</span>
          <span className="sidebar-title">Task Manager</span>
        </div>

        <nav className="sidebar-nav">
          <button className="sidebar-link" onClick={() => navigate("/")}>
            Tag
          </button>
          <button className="sidebar-link" onClick={() => navigate("/")}>
            Monat
          </button>
          <button className="sidebar-link active">Board</button>
        </nav>
      </aside>

      <main className="board-main">
        <div className="page-wrapper">
          <header className="page-header">
            <h1>Task Manager – React Kanban</h1>

            {selectedDate ? (
              <p className="page-subtitle">
                To-Do Liste für{" "}
                {new Date(selectedDate).toLocaleDateString("de-DE")}
              </p>
            ) : (
              <p className="page-subtitle">Alle Tasks</p>
            )}
          </header>

          {error && <p className="error-text">{error}</p>}

          {dueReminders.length > 0 && (
            <div className="reminder-bar">
              <span className="reminder-title">🔔 Erinnerungen:</span>

              <div className="reminder-list">
                {dueReminders.map((t) => (
                  <div key={t.id} className="reminder-item">
                    <span className="reminder-text">{t.title}</span>
                    <button
                      className="reminder-dismiss"
                      onClick={() => dismissReminder(t.id)}
                    >
                      OK
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <NewTaskForm
            onCreate={createTaskHandler}
            isSubmitting={isCreating}
            initialDate={selectedDate}
          />

          <section className="board">
            <KanbanColumn
              title="To Do"
              tasks={tasksByStatus("To Do")}
              onStatusChange={changeStatus}
              onDeleteTask={deleteTaskHandler}
              onEditTask={startEdit}
            />

            <KanbanColumn
              title="In Progress"
              tasks={tasksByStatus("In Progress")}
              onStatusChange={changeStatus}
              onDeleteTask={deleteTaskHandler}
              onEditTask={startEdit}
            />

            <KanbanColumn
              title="Done"
              tasks={tasksByStatus("Done")}
              onStatusChange={changeStatus}
              onDeleteTask={deleteTaskHandler}
              onEditTask={startEdit}
            />
          </section>

          <EditTaskModal
            task={editingTask}
            onClose={closeEdit}
            onSave={saveEdit}
          />
        </div>
      </main>
    </div>
  );
}

// ======================================
// Formular für neue Tasks
// ======================================
function NewTaskForm({ onCreate, isSubmitting, initialDate }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("To Do");
  const [priority, setPriority] = useState("high");

  // ✅ NEU: Datum der Aufgabe (work_date) frei wählbar
  const [taskDate, setTaskDate] = useState(initialDate || "");

  const [dueDate, setDueDate] = useState("");
  const [repeatDays, setRepeatDays] = useState([]);
  const [reminderTime, setReminderTime] = useState("");

  // ✅ Wenn sich initialDate ändert (z.B. anderer Tag angeklickt),
  // setze taskDate automatisch auf diesen Tag – aber nur wenn taskDate leer ist
  useEffect(() => {
    if (!taskDate && initialDate) setTaskDate(initialDate);
  }, [initialDate, taskDate]);

  // ✅ Hilfsfunktion: "jetzt" als datetime-local string (YYYY-MM-DDTHH:MM)
  const getNowLocalInputValue = () => {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const y = now.getFullYear();
    const m = pad(now.getMonth() + 1);
    const d = pad(now.getDate());
    const hh = pad(now.getHours());
    const mm = pad(now.getMinutes());
    return `${y}-${m}-${d}T${hh}:${mm}`;
  };

  const minDateTime = getNowLocalInputValue();

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!title.trim()) {
      alert("Bitte Titel eingeben.");
      return;
    }

    // ✅ work_date muss gesetzt sein
    if (!taskDate) {
      alert("Bitte ein Datum für die Aufgabe auswählen.");
      return;
    }

    // ✅ Validierung: Deadline darf nicht in der Vergangenheit liegen
    if (dueDate) {
      const due = new Date(dueDate);
      const now = new Date();
      if (due < now) {
        alert("Deadline darf nicht in der Vergangenheit liegen.");
        return;
      }
    }

    // ✅ Validierung: Erinnerung darf nicht in der Vergangenheit liegen
    if (reminderTime) {
      const rem = new Date(reminderTime);
      const now = new Date();
      if (rem < now) {
        alert("Erinnerung darf nicht in der Vergangenheit liegen.");
        return;
      }
    }

    // ✅ Optional: Erinnerung soll nicht NACH der Deadline sein (wenn beides gesetzt)
    if (dueDate && reminderTime) {
      const due = new Date(dueDate);
      const rem = new Date(reminderTime);
      if (rem > due) {
        alert("Erinnerung darf nicht nach der Deadline liegen.");
        return;
      }
    }

    const newTaskData = {
      title: title.trim(),
      description: description.trim(),
      status,
      priority,
      due_date: dueDate || null,

      // ✅ WICHTIG: hier nehmen wir taskDate, nicht initialDate
      work_date: taskDate,

      repeat_days: repeatDays,
      reminder_time: reminderTime || null,
    };

    if (typeof onCreate === "function") {
      onCreate(newTaskData);
    }

    setTitle("");
    setDescription("");
    setStatus("To Do");
    setPriority("high");
    setDueDate("");
    setReminderTime("");
    setRepeatDays([]);

    // taskDate lassen wir absichtlich stehen (damit du mehrere Tasks für denselben Tag machen kannst)
  };

  return (
    <section className="new-task-card">
      <h2 className="new-task-title">Neue Task erstellen</h2>

      <form className="new-task-form" onSubmit={handleSubmit}>
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

        {/* ✅ NEU: Datum der Aufgabe */}
        <div className="form-row">
          <label className="form-label">
            Datum der Aufgabe *
            <input
              className="form-input"
              type="date"
              value={taskDate}
              onChange={(e) => setTaskDate(e.target.value)}
            />
          </label>
        </div>

        <div className="form-row">
          <label className="form-label">
            Deadline
            <input
              className="form-input"
              type="datetime-local"
              value={dueDate}
              min={minDateTime}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </label>
        </div>

        <div className="form-row">
          <label className="form-label">
            Erinnerung (optional)
            <input
              className="form-input"
              type="datetime-local"
              value={reminderTime}
              min={minDateTime}
              onChange={(e) => setReminderTime(e.target.value)}
            />
          </label>
        </div>

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

        <div className="form-row">
          <button className="form-button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Wird erstellt..." : "Task erstellen"}
          </button>
        </div>
      </form>
    </section>
  );
}

// ======================================
// Kanban-Spalte
// ======================================
function KanbanColumn({
  title,
  tasks,
  onStatusChange,
  onDeleteTask,
  onEditTask,
}) {
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
// Edit-Modal
// ======================================
function EditTaskModal({ task, onClose, onSave }) {
  if (!task) return null;

  const [title, setTitle] = useState(task.title || "");
  const [description, setDescription] = useState(task.description || "");
  const [status, setStatus] = useState(task.status || "To Do");
  const [priority, setPriority] = useState(task.priority || "high");

  const initialDue =
    task.due_date && task.due_date.length >= 16 ? task.due_date.slice(0, 16) : "";
  const [dueDate, setDueDate] = useState(initialDue);

  const initialReminder =
    task.reminder_time && task.reminder_time.length >= 16
      ? task.reminder_time.slice(0, 16)
      : "";
  const [reminderTime, setReminderTime] = useState(initialReminder);

  const initialRepeat =
    (task.repeat_days || "")
      .split(",")
      .map((d) => d.trim())
      .filter(Boolean);
  const [repeatDays, setRepeatDays] = useState(initialRepeat);

  // ✅ Hilfsfunktion: "jetzt" als datetime-local string (YYYY-MM-DDTHH:MM)
  const getNowLocalInputValue = () => {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const y = now.getFullYear();
    const m = pad(now.getMonth() + 1);
    const d = pad(now.getDate());
    const hh = pad(now.getHours());
    const mm = pad(now.getMinutes());
    return `${y}-${m}-${d}T${hh}:${mm}`;
  };

  const minDateTime = getNowLocalInputValue();

  const handleSubmit = (e) => {
    e.preventDefault();

    // ✅ Validierung: Deadline darf nicht in der Vergangenheit liegen
    if (dueDate) {
      const due = new Date(dueDate);
      const now = new Date();
      if (due < now) {
        alert("Deadline darf nicht in der Vergangenheit liegen.");
        return;
      }
    }

    // ✅ Validierung: Erinnerung darf nicht in der Vergangenheit liegen
    if (reminderTime) {
      const rem = new Date(reminderTime);
      const now = new Date();
      if (rem < now) {
        alert("Erinnerung darf nicht in der Vergangenheit liegen.");
        return;
      }
    }

    // ✅ Optional: Erinnerung soll nicht NACH der Deadline sein
    if (dueDate && reminderTime) {
      const due = new Date(dueDate);
      const rem = new Date(reminderTime);
      if (rem > due) {
        alert("Erinnerung darf nicht nach der Deadline liegen.");
        return;
      }
    }

    onSave({
      title: title.trim(),
      description: description.trim(),
      status,
      priority,
      due_date: dueDate || null,
      reminder_time: reminderTime || null,
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
              min={minDateTime}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </label>

          <label className="form-label">
            Erinnerung (optional)
            <input
              className="form-input"
              type="datetime-local"
              value={reminderTime}
              min={minDateTime}
              onChange={(e) => setReminderTime(e.target.value)}
            />
          </label>

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
            <button type="button" className="form-button secondary" onClick={onClose}>
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
// Task-Karte
// ======================================
function TaskCard({ task, onStatusChange, onDeleteTask, onEditTask }) {
  const deadlineText = task.due_date
    ? new Date(task.due_date).toLocaleString("de-DE")
    : null;

  const priorityClass =
    task.priority === "high"
      ? "priority-dot-high"
      : task.priority === "medium"
      ? "priority-dot-medium"
      : "priority-dot-low";

  const handleSelectChange = (event) => {
    const newStatus = event.target.value;
    onStatusChange(task.id, newStatus);
  };

  return (
    <article className="task-card">
      <h3 className="task-title">{task.title}</h3>

      {task.description && (
        <p className="task-description">{task.description}</p>
      )}

      {deadlineText && (
        <p className="task-deadline">
          <strong>Deadline:</strong> {deadlineText}
        </p>
      )}

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

      <div className="task-meta">
        <label className="status-label">
          Status:
          <select
            className="status-select"
            value={task.status}
            onChange={handleSelectChange}
          >
            <option value="To Do">To Do</option>
            <option value="In Progress">In Progress</option>
            <option value="Done">Done</option>
          </select>
        </label>

        <span className={`priority-dot ${priorityClass}`}></span>
      </div>
    </article>
  );
}

// ======================================
// App-Komponente: kümmert sich NUR um Routen
// ======================================
//function App() {
//  return (
//   <Routes>
//      <Route path="/" element={<CalendarPage />} />
//      <Route path="/board" element={<KanbanPage />} />
//    </Routes>
//  );
//}

// ⬇️ GANZ UNTEN, EINZIGER EXPORT
//export default App;
export default function App() {
  return (
    <Routes>
      {/* 🔐 Login-Seite (frei zugänglich) */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* 🏠 Startseite – geschützt */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <CalendarPage />
          </ProtectedRoute>
        }
      />

      {/* 📋 Board – geschützt */}
      <Route
        path="/board"
        element={
          <ProtectedRoute>
            <KanbanPage />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}



