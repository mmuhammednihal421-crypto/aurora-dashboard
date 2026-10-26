
CREATE TABLE IF NOT EXISTS routine_entries (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id TEXT NOT NULL,
    activity_date DATE NOT NULL,
    activity_id TEXT NOT NULL,
    target_hours NUMERIC(5, 2) NOT NULL DEFAULT 0,
    actual_hours NUMERIC(5, 2) NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, activity_date, activity_id)
);

CREATE TABLE IF NOT EXISTS tasks (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id TEXT NOT NULL,
    activity_date DATE NOT NULL,
    title TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'Personal',
    done BOOLEAN NOT NULL DEFAULT FALSE,
    hours NUMERIC(5, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_routine_entries_user_date
ON routine_entries (user_id, activity_date);

CREATE INDEX IF NOT EXISTS idx_tasks_user_date
ON tasks (user_id, activity_date);
