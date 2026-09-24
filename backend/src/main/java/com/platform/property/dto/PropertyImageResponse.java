package com.platform.property.dto;

import com.platform.property.entity.PropertyImage;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PropertyImageResponse {

    private Long id;
    private Long propertyId;
    private String storageKey;
    private String originalFilename;
    private Long fileSizeBytes;
    private String contentType;
    private Integer displayOrder;
    private Boolean isPrimary;
    private String url;
    private Instant createdAt;

    public static PropertyImageResponse fromEntity(PropertyImage image) {
        if (image == null) {
            return null;
        }
        String storageKey = image.getStorageKey();
        String url = (storageKey != null && !storageKey.isEmpty()) ? "/uploads/" + storageKey : null;

        Long propId = image.getProperty() != null ? image.getProperty().getId() : image.getPropertyId();

        return PropertyImageResponse.builder()
                .id(image.getId())
                .propertyId(propId)
                .storageKey(storageKey)
                .originalFilename(image.getOriginalFilename())
                .fileSizeBytes(image.getFileSizeBytes())
                .contentType(image.getContentType())
                .displayOrder(image.getDisplayOrder())
                .isPrimary(image.isPrimary())
                .url(url)
                .createdAt(image.getCreatedAt())
                .build();
    }
}
