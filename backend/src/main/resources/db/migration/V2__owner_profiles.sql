CREATE TABLE owner_profiles (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ownership_type VARCHAR(32) NOT NULL CHECK (ownership_type IN ('TITLE_OWNER', 'AUTHORIZED_REPRESENTATIVE')),
    company_name VARCHAR(255),
    declaration_accepted BOOLEAN NOT NULL DEFAULT TRUE,
    declaration_accepted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    declaration_version VARCHAR(16) NOT NULL DEFAULT 'v1.0',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_owner_profiles_user_id ON owner_profiles(user_id);
