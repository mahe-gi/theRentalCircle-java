CREATE TABLE properties (
    id BIGSERIAL PRIMARY KEY,
    owner_profile_id BIGINT NOT NULL REFERENCES owner_profiles(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    property_type VARCHAR(32) NOT NULL,
    listing_type VARCHAR(32) NOT NULL,
    price DECIMAL(12, 2) NOT NULL,
    maintenance_charges DECIMAL(10, 2) DEFAULT 0.00,
    security_deposit DECIMAL(12, 2) DEFAULT 0.00,
    bhk INTEGER,
    bedrooms INTEGER,
    bathrooms INTEGER,
    carpet_area DECIMAL(10, 2),
    built_up_area DECIMAL(10, 2),
    furnishing VARCHAR(32),
    floor_number INTEGER,
    total_floors INTEGER,
    description TEXT,
    preferred_tenant VARCHAR(32) DEFAULT 'ANY',
    availability_date DATE,
    status VARCHAR(32) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'SUBMITTED')),
    state VARCHAR(100) NOT NULL,
    city VARCHAR(100) NOT NULL,
    district VARCHAR(100) NOT NULL,
    locality VARCHAR(255) NOT NULL,
    address VARCHAR(500) NOT NULL,
    pincode VARCHAR(10) NOT NULL,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE property_images (
    id BIGSERIAL PRIMARY KEY,
    property_id BIGINT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    storage_key VARCHAR(255) NOT NULL UNIQUE,
    original_filename VARCHAR(255),
    file_size_bytes BIGINT,
    content_type VARCHAR(64),
    display_order INTEGER DEFAULT 0,
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE property_amenities (
    id BIGSERIAL PRIMARY KEY,
    property_id BIGINT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    amenity_name VARCHAR(100) NOT NULL,
    UNIQUE (property_id, amenity_name)
);

CREATE INDEX idx_properties_owner_profile_id ON properties(owner_profile_id);
CREATE INDEX idx_properties_status ON properties(status);
CREATE INDEX idx_properties_city_district_locality ON properties(city, district, locality);
CREATE INDEX idx_property_images_property_id ON property_images(property_id);
CREATE INDEX idx_property_amenities_property_id ON property_amenities(property_id);
