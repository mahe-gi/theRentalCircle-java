-- Baseline migration to verify database connectivity and migration execution
CREATE TABLE IF NOT EXISTS platform_system_info (
    id SERIAL PRIMARY KEY,
    initialized_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    version VARCHAR(32) NOT NULL
);

INSERT INTO platform_system_info (version) VALUES ('1.0.0-slice1');
