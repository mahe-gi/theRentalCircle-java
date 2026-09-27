package com.platform.contact.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ContactResponse {
    private Long contactEventId;
    private Long propertyId;
    private String whatsappUrl;
    private String ownerName;
}
