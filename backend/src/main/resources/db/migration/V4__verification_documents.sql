CREATE TABLE documents (
    id BIGSERIAL PRIMARY KEY,
    owner_profile_id BIGINT REFERENCES owner_profiles(id) ON DELETE CASCADE,
    property_id BIGINT REFERENCES properties(id) ON DELETE SET NULL,
    document_type VARCHAR(64) NOT NULL,
    storage_key VARCHAR(255) NOT NULL UNIQUE,
    original_filename VARCHAR(255) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    content_type VARCHAR(64) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'UPLOADED' CHECK (status IN ('UPLOADED', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED')),
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_documents_association CHECK (owner_profile_id IS NOT NULL OR property_id IS NOT NULL)
);

CREATE TABLE admin_actions (
    id BIGSERIAL PRIMARY KEY,
    admin_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(64) NOT NULL,
    target_type VARCHAR(32) NOT NULL,
    target_id BIGINT NOT NULL,
    details TEXT,
    ip_address VARCHAR(45),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

ALTER TABLE owner_profiles
    ADD COLUMN verification_status VARCHAR(32) NOT NULL DEFAULT 'NOT_STARTED' CHECK (verification_status IN ('NOT_STARTED', 'SUBMITTED', 'UNDER_REVIEW', 'MORE_INFORMATION_REQUIRED', 'VERIFIED', 'REJECTED')),
    ADD COLUMN verified_by BIGINT REFERENCES users(id),
    ADD COLUMN verified_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN admin_remarks TEXT;

ALTER TABLE properties DROP CONSTRAINT properties_status_check;
ALTER TABLE properties ADD CONSTRAINT properties_status_check CHECK (status IN ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'MORE_INFORMATION_REQUIRED', 'APPROVED', 'LIVE', 'REJECTED', 'SUSPENDED'));

ALTER TABLE properties
    ADD COLUMN reviewed_by BIGINT REFERENCES users(id),
    ADD COLUMN reviewed_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN admin_remarks TEXT;

CREATE UNIQUE INDEX uq_property_primary_image ON property_images(property_id) WHERE is_primary = TRUE;

CREATE INDEX idx_documents_owner_profile_id ON documents(owner_profile_id);
CREATE INDEX idx_documents_property_id ON documents(property_id);
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_owner_profiles_verification_status ON owner_profiles(verification_status);
CREATE INDEX idx_admin_actions_admin_id ON admin_actions(admin_id);
CREATE INDEX idx_admin_actions_target ON admin_actions(target_type, target_id);
CREATE INDEX idx_admin_actions_created_at ON admin_actions(created_at);
