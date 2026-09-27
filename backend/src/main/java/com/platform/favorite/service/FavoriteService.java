package com.platform.favorite.service;

import com.platform.common.exception.ResourceNotFoundException;
import com.platform.favorite.dto.FavoriteToggleResponse;
import com.platform.favorite.entity.Favorite;
import com.platform.favorite.repository.FavoriteRepository;
import com.platform.property.entity.Property;
import com.platform.property.entity.PropertyStatus;
import com.platform.property.repository.PropertyRepository;
import com.platform.search.dto.PropertySearchResult;
import com.platform.user.entity.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class FavoriteService {

    private final FavoriteRepository favoriteRepository;
    private final PropertyRepository propertyRepository;

    @Transactional
    public FavoriteToggleResponse toggleFavorite(User user, Long propertyId) {
        Property property = propertyRepository.findById(propertyId)
                .orElseThrow(() -> new ResourceNotFoundException("Property not found with id: " + propertyId));

        if (property.getStatus() != PropertyStatus.LIVE) {
            throw new ResourceNotFoundException("Property not found or not active");
        }

        if (favoriteRepository.existsByUserIdAndPropertyId(user.getId(), propertyId)) {
            favoriteRepository.deleteByUserIdAndPropertyId(user.getId(), propertyId);
            return FavoriteToggleResponse.builder()
                    .propertyId(propertyId)
                    .isFavorited(false)
                    .message("Property removed from favorites")
                    .build();
        } else {
            Favorite favorite = Favorite.builder()
                    .user(user)
                    .property(property)
                    .build();
            favoriteRepository.save(favorite);
            return FavoriteToggleResponse.builder()
                    .propertyId(propertyId)
                    .isFavorited(true)
                    .message("Property saved to favorites")
                    .build();
        }
    }

    @Transactional(readOnly = true)
    public boolean isFavorited(Long userId, Long propertyId) {
        return favoriteRepository.existsByUserIdAndPropertyId(userId, propertyId);
    }

    @Transactional(readOnly = true)
    public Page<PropertySearchResult> getMyFavorites(Long userId, Pageable pageable) {
        return favoriteRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable)
                .map(fav -> PropertySearchResult.fromEntity(fav.getProperty()));
    }
}
