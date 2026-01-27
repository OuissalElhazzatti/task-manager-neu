from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()

class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(150), unique=True, nullable=False)
    email = db.Column(db.String(200), unique=True, nullable=False)

    # ✅ NEU: Passwort (gehasht)
    password_hash = db.Column(db.String(255), nullable=False)

    tasks = db.relationship("Task", backref="user", lazy=True)

    # ✅ Passwort setzen
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    # ✅ Passwort prüfen
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            "id": self.id,
            "username": self.username,
            "email": self.email,
        }

class Category(db.Model):
    __tablename__ = "categories"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)

    tasks = db.relationship("Task", backref="category", lazy=True)

    def to_dict(self):
        return {"id": self.id, "name": self.name}

class Task(db.Model):
    __tablename__ = "tasks"

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, default="")
    status = db.Column(db.String(50), default="To Do")
    priority = db.Column(db.String(20), default="medium")

    # work_date = Tag, an dem du daran arbeitest (String "YYYY-MM-DD")
    work_date = db.Column(db.String(10))

    # due_date = Deadline (DateTime)
    due_date = db.Column(db.DateTime)

    # 🔔 NEU: Erinnerungstermin
    reminder_time = db.Column(db.DateTime)

    # Wiederholungstage, z.B. "MON,TUE"
    repeat_days = db.Column(db.String(50))

    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    category_id = db.Column(db.Integer, db.ForeignKey("categories.id"))

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "status": self.status,
            "priority": self.priority,
            "work_date": self.work_date,
            "due_date": self.due_date.isoformat() if self.due_date else None,
            "reminder_time": self.reminder_time.isoformat() if self.reminder_time else None,
            "repeat_days": self.repeat_days,
            "user_id": self.user_id,
            "category_id": self.category_id,
        }