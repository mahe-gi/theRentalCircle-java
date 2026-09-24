package com.platform.document.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.platform.document.entity.Document;
import com.platform.document.entity.DocumentStatus;
import com.platform.document.entity.DocumentType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class DocumentResponse {

    private Long id;
    private Long ownerProfileId;
    private Long propertyId;
    private DocumentType documentType;
    private String originalFilename;
    private Long fileSizeBytes;
    private String contentType;
    private DocumentStatus status;
    private String rejectionReason;
    private Instant createdAt;

    public static DocumentResponse fromEntity(Document doc) {
        if (doc == null) {
            return null;
        }
        return DocumentResponse.builder()
                .id(doc.getId())
                .ownerProfileId(doc.getOwnerProfile() != null ? doc.getOwnerProfile().getId() : null)
                .propertyId(doc.getProperty() != null ? doc.getProperty().getId() : null)
                .documentType(doc.getDocumentType())
                .originalFilename(doc.getOriginalFilename())
                .fileSizeBytes(doc.getFileSizeBytes())
                .contentType(doc.getContentType())
                .status(doc.getStatus())
                .rejectionReason(doc.getRejectionReason())
                .createdAt(doc.getCreatedAt())
                .build();
    }
}
