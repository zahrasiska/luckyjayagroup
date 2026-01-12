-- Create user_preferences table
CREATE TABLE IF NOT EXISTS prive.user_preferences (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    application_id INT NOT NULL,
    pref_key VARCHAR(100) NOT NULL,
    pref_value TEXT, -- JSON string
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, application_id, pref_key)
);
