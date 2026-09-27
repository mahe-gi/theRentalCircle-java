-- ==============================================================================
-- Slice 7: Trust, Safety & Operations Migration
-- Tables: reports, notifications
-- ==============================================================================

CREATE TABLE reports (
    id BIGSERIAL PRIMARY KEY,
    reporter_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    property_id BIGINT REFERENCES properties(id) ON DELETE SET NULL,
    reported_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    reason VARCHAR(64) NOT NULL CHECK (reason IN ('BROKER', 'SPAM', 'FAKE_PROPERTY', 'WRONG_INFORMATION', 'DUPLICATE_LISTING', 'WRONG_PRICE', 'ALREADY_RENTED', 'ALREADY_SOLD', 'SCAM', 'OTHER')),
    description TEXT,
    status VARCHAR(32) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'UNDER_INVESTIGATION', 'RESOLVED', 'DISMISSED')),
    assigned_admin_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    resolution_action VARCHAR(64) CHECK (resolution_action IN ('DISMISS', 'REQUEST_INFORMATION', 'WARN', 'HIDE_PROPERTY', 'REJECT_PROPERTY', 'SUSPEND_USER', 'BLOCK_USER')),
    resolution_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT chk_reports_target CHECK (property_id IS NOT NULL OR reported_user_id IS NOT NULL)
);

CREATE INDEX idx_reports_reporter_id ON reports(reporter_id);
CREATE INDEX idx_reports_property_id ON reports(property_id);
CREATE INDEX idx_reports_reported_user_id ON reports(reported_user_id);
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_created_at ON reports(created_at);

CREATE TABLE notifications (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    notification_type VARCHAR(64) NOT NULL DEFAULT 'SYSTEM',
    reference_type VARCHAR(64),
    reference_id BIGINT,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);
