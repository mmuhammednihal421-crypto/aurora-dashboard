
import { useEffect, useMemo, useState } from "react";
import "./RoutineTracker.css";

const DEFAULT_ACTIVITIES = [
  { id: "class", name: "Class", target: 120, category: "Learning" },
  { id: "work", name: "Work", target: 120, category: "Work" },
  { id: "study", name: "Study", target: 120, category: "Learning" },
  { id: "practice", name: "Practice", target: 30, category: "Learning" },
  { id: "walk", name: "Morning Walk", target: 60, category: "Health" },
  { id: "english", name: "English Practice", target: 30, category: "Learning" },
];

const todayKey = () => new Date().toLocaleDateString("en-CA");

const dateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const loadData = () => {
  try {
    return JSON.parse(localStorage.getItem("aurora-routine-v1")) || {};
  } catch {
    return {};
  }
};

const formatTime = (minutes) => {
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;

  if (hours && remaining) return `${hours}h ${remaining}m`;
  if (hours) return `${hours}h`;
  return `${remaining}m`;
};

export default function RoutineTracker() {
  const [database, setDatabase] = useState(loadData);
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [activityName, setActivityName] = useState("");
  const [activityCategory, setActivityCategory] = useState("Personal");
  const [targetInputs, setTargetInputs] = useState({});
  const [durationInputs, setDurationInputs] = useState({});
  const [editingTargets, setEditingTargets] = useState(false);

  useEffect(() => {
    localStorage.setItem("aurora-routine-v1", JSON.stringify(database));
  }, [database]);

  const day = database[selectedDate] || { targets: {}, logs: [] };

  const targets = useMemo(() => {
    const result = {};

    DEFAULT_ACTIVITIES.forEach((activity) => {
      result[activity.id] =
        day.targets?.[activity.id] ?? activity.target;
    });

    (day.customActivities || []).forEach((activity) => {
      result[activity.id] =
        day.targets?.[activity.id] ?? activity.target ?? 0;
    });

    return result;
  }, [day]);

  const activities = [
    ...DEFAULT_ACTIVITIES,
    ...(day.customActivities || []),
  ];

  const updateDay = (updater) => {
    setDatabase((previous) => {
      const current = previous[selectedDate] || {
        targets: {},
        logs: [],
        customActivities: [],
      };

      return {
        ...previous,
        [selectedDate]: updater({
          targets: {},
          logs: [],
          customActivities: [],
          ...current,
        }),
      };
    });
  };

  const getCompleted = (activityId) =>
    (day.logs || [])
      .filter((log) => log.activityId === activityId)
      .reduce((total, log) => total + log.minutes, 0);

  const totalCompleted = (day.logs || []).reduce(
    (total, log) => total + log.minutes,
    0
  );

  const totalTarget = activities.reduce(
    (total, activity) => total + (targets[activity.id] || 0),
    0
  );

  const addLog = (activityId, minutes) => {
    if (!Number.isFinite(minutes) || minutes <= 0) return;

    updateDay((current) => ({
      ...current,
      logs: [
        ...current.logs,
        {
          id: `${Date.now()}-${Math.random()}`,
          activityId,
          minutes,
          createdAt: new Date().toISOString(),
        },
      ],
    }));

    setDurationInputs((previous) => ({
      ...previous,
      [activityId]: "",
    }));
  };

  const changeTarget = (activityId, value) => {
    const minutes = Math.max(0, Number(value) || 0);

    updateDay((current) => ({
      ...current,
      targets: { ...current.targets, [activityId]: minutes },
    }));
  };

  const addCustomActivity = (event) => {
    event.preventDefault();
    const name = activityName.trim();
    if (!name) return;

    const id = `custom-${Date.now()}`;

    updateDay((current) => ({
      ...current,
      customActivities: [
        ...(current.customActivities || []),
        { id, name, category: activityCategory, target: 0 },
      ],
    }));

    setActivityName("");
    setActivityCategory("Personal");
  };

  const yesterday = new Date(`${selectedDate}T12:00:00`);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = dateKey(yesterday);
  const previousDay = database[yesterdayKey] || { logs: [] };

  const previousTotal = (previousDay.logs || []).reduce(
    (total, log) => total + log.minutes,
    0
  );

  const difference = totalCompleted - previousTotal;
  const overallProgress =
    totalTarget > 0
      ? Math.min(100, (totalCompleted / totalTarget) * 100)
      : 0;

  return (
    <main className="routine-page">
      <header className="routine-header">
        <div>
          <p className="routine-eyebrow">YOUR PERSONAL SPACE</p>
          <h1>Daily Routine <span>✦</span></h1>
          <p className="routine-muted">
            Track your effort, adjust your goals, and celebrate your progress.
          </p>
        </div>

        <label className="routine-date">
          <span>Choose day</span>
          <input
            type="date"
            value={selectedDate}
            onChange={(event) => setSelectedDate(event.target.value)}
            max={todayKey()}
          />
        </label>
      </header>

      <section className="routine-summary">
        <article className="routine-card summary-card">
          <span>Completed</span>
          <strong>{formatTime(totalCompleted)}</strong>
          <small>Actual time logged</small>
        </article>

        <article className="routine-card summary-card">
          <span>Today's target</span>
          <strong>{formatTime(totalTarget)}</strong>
          <small>Targets for the selected day</small>
        </article>

        <article className="routine-card summary-card">
          <span>Yesterday</span>
          <strong>{formatTime(previousTotal)}</strong>
          <small>
            {difference > 0
              ? `${formatTime(difference)} more today`
              : difference < 0
                ? `${formatTime(Math.abs(difference))} less today`
                : "Same total as yesterday"}
          </small>
        </article>
      </section>

      <section className="routine-card routine-overview">
        <div className="routine-section-heading">
          <div>
            <h2>Daily progress</h2>
            <p>Actual logged time compared with your targets.</p>
          </div>
          <strong>{Math.round(overallProgress)}%</strong>
        </div>

        <div className="routine-progress-track">
          <div
            className="routine-progress-fill"
            style={{ width: `${overallProgress}%` }}
          />
        </div>

        {totalCompleted > totalTarget && (
          <p className="routine-success">
            ✨ You have exceeded your total target by{" "}
            {formatTime(totalCompleted - totalTarget)}!
          </p>
        )}
      </section>

      <section className="routine-section-heading activity-heading">
        <div>
          <h2>Your activities</h2>
          <p>Log time in minutes. You can record multiple sessions.</p>
        </div>
        <button
          className="routine-button secondary"
          onClick={() => setEditingTargets((value) => !value)}
        >
          {editingTargets ? "Done editing" : "Adjust today's targets"}
        </button>
      </section>

      <section className="routine-activity-list">
        {activities.map((activity) => {
          const completed = getCompleted(activity.id);
          const target = targets[activity.id] || 0;
          const progress = target > 0 ? (completed / target) * 100 : 0;
          const extra = completed - target;

          return (
            <article className="routine-card activity-card" key={activity.id}>
              <div className="activity-top">
                <div>
                  <span className="activity-category">{activity.category}</span>
                  <h3>{activity.name}</h3>
                </div>
                <div className="activity-time">
                  <strong>{formatTime(completed)}</strong>
                  <span>completed</span>
                </div>
              </div>

              <div className="activity-target-row">
                <span>Target: {formatTime(target)}</span>
                {completed > target && (
                  <span className="routine-success">
                    +{formatTime(extra)} extra
                  </span>
                )}
              </div>

              <div className="routine-progress-track">
                <div
                  className="routine-progress-fill"
                  style={{
                    width: `${Math.min(100, progress)}%`,
                  }}
                />
              </div>

              {editingTargets && (
                <label className="routine-field">
                  Today's target in minutes
                  <input
                    type="number"
                    min="0"
                    value={targetInputs[activity.id] ?? target}
                    onChange={(event) =>
                      setTargetInputs((previous) => ({
                        ...previous,
                        [activity.id]: event.target.value,
                      }))
                    }
                  />
                  <button
                    className="routine-button secondary"
                    onClick={() => {
                      changeTarget(
                        activity.id,
                        targetInputs[activity.id] ?? target
                      );
                      setTargetInputs((previous) => {
                        const next = { ...previous };
                        delete next[activity.id];
                        return next;
                      });
                    }}
                  >
                    Save today's target
                  </button>
                </label>
              )}

              <form
                className="routine-log-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  addLog(
                    activity.id,
                    Number(durationInputs[activity.id])
                  );
                }}
              >
                <label className="routine-field">
                  Minutes completed
                  <input
                    type="number"
                    min="1"
                    placeholder="e.g. 60"
                    value={durationInputs[activity.id] ?? ""}
                    onChange={(event) =>
                      setDurationInputs((previous) => ({
                        ...previous,
                        [activity.id]: event.target.value,
                      }))
                    }
                    required
                  />
                </label>
                <button className="routine-button" type="submit">
                  + Log time
                </button>
              </form>
            </article>
          );
        })}
      </section>

      <section className="routine-card quick-add-card">
        <h2>Quick-add an activity</h2>
        <p className="routine-muted">
          For errands, home tasks, friends, or unexpected work.
        </p>

        <form className="quick-add-form" onSubmit={addCustomActivity}>
          <label className="routine-field">
            Activity name
            <input
              value={activityName}
              onChange={(event) => setActivityName(event.target.value)}
              placeholder="e.g. Helped at home"
              required
            />
          </label>

          <label className="routine-field">
            Category
            <select
              value={activityCategory}
              onChange={(event) => setActivityCategory(event.target.value)}
            >
              <option>Personal</option>
              <option>Work</option>
              <option>Learning</option>
              <option>Health</option>
              <option>Home</option>
              <option>Friends</option>
              <option>Urgent</option>
            </select>
          </label>

          <button className="routine-button" type="submit">
            + Add activity
          </button>
        </form>
      </section>

      <section className="routine-card history-card">
        <h2>Today's time log</h2>
        {(day.logs || []).length === 0 ? (
          <p className="routine-muted">No time logged for this day yet.</p>
        ) : (
          <div className="routine-log-list">
            {[...(day.logs || [])].reverse().map((log) => {
              const activity = activities.find(
                (item) => item.id === log.activityId
              );

              return (
                <div className="routine-log-item" key={log.id}>
                  <div>
                    <strong>{activity?.name || "Activity"}</strong>
                    <span>
                      {new Date(log.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <strong>{formatTime(log.minutes)}</strong>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
