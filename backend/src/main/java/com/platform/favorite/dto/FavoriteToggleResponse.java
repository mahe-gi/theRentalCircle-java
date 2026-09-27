package com.platform.favorite.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FavoriteToggleResponse {
    private Long propertyId;
    private boolean isFavorited;
    private String message;
}
