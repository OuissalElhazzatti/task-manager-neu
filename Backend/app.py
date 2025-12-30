from flask import Flask, jsonify, request
from flask_cors import CORS
from datetime import datetime
from sqlalchemy import case

# 👉 eigene Models importieren
from models import db, User, Task, Category

# =========================================
# Flask-App & Datenbank konfigurieren
# =========================================
app = Flask(__name__)

# SQLite-DB im Backend-Ordner
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///tasks.db"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db.init_app(app)
CORS(app)

# beim Start Tabellen erstellen
with app.app_context():
    db.create_all()

# erlaubte Status / Prioritäten
ALLOWED_STATUSES = ["To Do", "In Progress", "Done"]
ALLOWED_PRIORITIES = ["low", "medium", "high"]


# =========================================
# Hilfsfunktion: Default-User sicherstellen
# =========================================
def get_or_create_default_user():
    user = User.query.first()
    if not user:
        user = User(username="demo_user", email="demo@example.com")
        db.session.add(user)
        db.session.commit()
    return user


# =========================================
# Debug-Route zum Testen
# =========================================
@app.route("/debug_create_task")
def debug_create_task():
    user = get_or_create_default_user()

    test_task = Task(
        title="Backend Test Task",
        description="Nur zum Testen",
        status="To Do",
        priority="medium",
        work_date="2025-12-28",
        due_date=None,
        reminder_time=None,
        repeat_days=None,
        user_id=user.id,
    )
    db.session.add(test_task)
    db.session.commit()

    return jsonify(test_task.to_dict()), 201


# =========================================
# GET /tasks – alle Tasks holen
# =========================================
@app.route("/tasks", methods=["GET"])
def get_tasks():
    priority_order = case(
        (Task.priority == "high", 1),
        (Task.priority == "medium", 2),
        (Task.priority == "low", 3),
        else_=4,
    )

    tasks = Task.query.order_by(priority_order, Task.id.asc()).all()
    return jsonify([t.to_dict() for t in tasks])


# =========================================
# POST /tasks – neuen Task erstellen
# =========================================
@app.route("/tasks", methods=["POST"])
def create_task():
    try:
        data = request.get_json() or {}

        title = data.get("title")
        description = data.get("description", "")
        status = data.get("status", "To Do")
        priority = data.get("priority", "medium")
        work_date = data.get("work_date")  # "YYYY-MM-DD"

        # vom Frontend: due_date oder deadline
        due_date_str = data.get("due_date") or data.get("deadline")
        reminder_str = data.get("reminder_time") or data.get("reminder")
        repeat_days = data.get("repeat_days")

        # User sicherstellen
        user = get_or_create_default_user()

        # Datum parsen
        due_date = None
        if due_date_str:
            try:
                due_date = datetime.fromisoformat(due_date_str)
            except Exception as e:
                print("Fehler beim Parsen von due_date:", e)
                due_date = None

        reminder_time = None
        if reminder_str:
            try:
                reminder_time = datetime.fromisoformat(reminder_str)
            except Exception as e:
                print("Fehler beim Parsen von reminder_time:", e)
                reminder_time = None

        # repeat_days sicher als String speichern
        if isinstance(repeat_days, list):
            repeat_days = ",".join(repeat_days)
        elif repeat_days is None:
            repeat_days = None
        else:
            repeat_days = str(repeat_days)

        new_task = Task(
            title=title,
            description=description,
            status=status,
            priority=priority,
            work_date=work_date,
            due_date=due_date,
            reminder_time=reminder_time,
            repeat_days=repeat_days,
            user_id=user.id,
        )

        db.session.add(new_task)
        db.session.commit()

        return jsonify(new_task.to_dict()), 201

    except Exception as e:
        # Fehler in der Konsole sehen & Fehler ans Frontend schicken
        print("Fehler in create_task:", e)
        return jsonify({"error": str(e)}), 500


# =========================================
# PUT /tasks/<id> – Task aktualisieren
# =========================================
@app.route("/tasks/<int:task_id>", methods=["PUT"])
def update_task(task_id):
    task = Task.query.get_or_404(task_id)
    data = request.get_json() or {}

    if "title" in data:
        task.title = data["title"] or task.title

    if "description" in data:
        task.description = data["description"] or ""

    if "status" in data:
        new_status = data["status"]
        if new_status in ALLOWED_STATUSES:
            task.status = new_status

    if "priority" in data:
        new_priority = data["priority"].lower()
        if new_priority in ALLOWED_PRIORITIES:
            task.priority = new_priority

    if "work_date" in data:
        task.work_date = data["work_date"] or None

    if "due_date" in data:
        ds = data["due_date"]
        if ds:
            try:
                task.due_date = datetime.fromisoformat(ds)
            except Exception:
                task.due_date = None
        else:
            task.due_date = None

    if "reminder_time" in data:
        rs = data["reminder_time"]
        if rs:
            try:
                task.reminder_time = datetime.fromisoformat(rs)
            except Exception:
                task.reminder_time = None
        else:
            task.reminder_time = None

    if "repeat_days" in data:
        rd = data["repeat_days"]
        if isinstance(rd, list):
            rd = ",".join(rd)
        task.repeat_days = rd or None

    db.session.commit()
    return jsonify(task.to_dict())


# =========================================
# DELETE /tasks/<id> – Task löschen
# =========================================
@app.route("/tasks/<int:task_id>", methods=["DELETE"])
def delete_task(task_id):
    task = Task.query.get_or_404(task_id)
    db.session.delete(task)
    db.session.commit()
    return jsonify({"message": "Task gelöscht"})


# =========================================
# einfache Test-Route: zeigt "Backend funktioniert"
# =========================================
@app.route("/", methods=["GET"])
def backend_ok():
    return """
    <!doctype html>
    <html lang="de">
    <head>
        <meta charset="utf-8">
        <title>Backend Status</title>
        <style>
            body {
                margin: 0;
                padding: 0;
                font-family: Arial, sans-serif;
                background: #ffffff;
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
            }
            .box {
                text-align: center;
            }
            h1 {
                font-size: 32px;
                margin-bottom: 10px;
            }
            p {
                font-size: 18px;
                color: #555;
            }
        </style>
    </head>
    <body>
        <div class="box">
            <h1>✅ Backend funktioniert</h1>
            <p>Flask & Datenbank wurden erfolgreich gestartet.</p>
        </div>
    </body>
    </html>
    """



# =========================================
# Start
# =========================================
if __name__ == "__main__":
    app.run(debug=True)