package com.platform.search.service;

import com.platform.property.entity.Property;
import com.platform.property.repository.PropertyRepository;
import com.platform.search.dto.LocationSuggestionsResponse;
import com.platform.search.dto.PropertySearchResult;
import com.platform.search.dto.SearchRequest;
import com.platform.search.specification.PropertySpecification;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.Collections;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class SearchService {

    private final PropertyRepository propertyRepository;

    @Transactional(readOnly = true)
    public Page<PropertySearchResult> search(SearchRequest req, Pageable pageable) {
        if (pageable.getPageSize() > 50) {
            throw new IllegalArgumentException("Page size cannot exceed 50");
        }

        Specification<Property> spec = Specification.where(PropertySpecification.isLive());

        Specification<Property> listingTypeSpec = PropertySpecification.hasListingType(req);
        if (listingTypeSpec != null) spec = spec.and(listingTypeSpec);

        Specification<Property> propertyTypeSpec = PropertySpecification.hasPropertyType(req);
        if (propertyTypeSpec != null) spec = spec.and(propertyTypeSpec);

        Specification<Property> citySpec = PropertySpecification.inCity(req);
        if (citySpec != null) spec = spec.and(citySpec);

        Specification<Property> districtSpec = PropertySpecification.inDistrict(req);
        if (districtSpec != null) spec = spec.and(districtSpec);

        Specification<Property> localitySpec = PropertySpecification.inLocality(req);
        if (localitySpec != null) spec = spec.and(localitySpec);

        Specification<Property> priceSpec = PropertySpecification.priceBetween(req);
        if (priceSpec != null) spec = spec.and(priceSpec);

        Specification<Property> bhkSpec = PropertySpecification.hasBhk(req);
        if (bhkSpec != null) spec = spec.and(bhkSpec);

        Specification<Property> furnishingSpec = PropertySpecification.hasFurnishing(req);
        if (furnishingSpec != null) spec = spec.and(furnishingSpec);

        Specification<Property> amenitiesSpec = PropertySpecification.hasAllAmenities(req);
        if (amenitiesSpec != null) spec = spec.and(amenitiesSpec);

        Specification<Property> minAreaSpec = PropertySpecification.areaAtLeast(req);
        if (minAreaSpec != null) spec = spec.and(minAreaSpec);

        Specification<Property> maxAreaSpec = PropertySpecification.areaAtMost(req);
        if (maxAreaSpec != null) spec = spec.and(maxAreaSpec);

        Specification<Property> boundingBoxSpec = PropertySpecification.inBoundingBox(req);
        if (boundingBoxSpec != null) spec = spec.and(boundingBoxSpec);

        Sort sort = switch (req.getSort() == null ? "NEWEST" : req.getSort().trim().toUpperCase()) {
            case "PRICE_ASC" -> Sort.by(Sort.Direction.ASC, "price");
            case "PRICE_DESC" -> Sort.by(Sort.Direction.DESC, "price");
            default -> Sort.by(Sort.Direction.DESC, "createdAt");
        };

        Pageable sortedPageable = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(), sort);
        return propertyRepository.findAll(spec, sortedPageable).map(PropertySearchResult::fromEntity);
    }

    @Transactional(readOnly = true)
    public LocationSuggestionsResponse suggestLocations(String query, String type, String city) {
        if (!StringUtils.hasText(query) || query.trim().length() < 2) {
            return new LocationSuggestionsResponse();
        }

        String prefix = query.trim();
        String pattern = prefix.toLowerCase() + "%";
        String lowerCity = StringUtils.hasText(city) ? city.trim().toLowerCase() : null;
        Pageable limit = PageRequest.of(0, 10);
        String upperType = StringUtils.hasText(type) ? type.trim().toUpperCase() : null;

        List<String> cities = Collections.emptyList();
        List<String> districts = Collections.emptyList();
        List<String> localities = Collections.emptyList();

        if (upperType == null || "CITY".equals(upperType)) {
            cities = propertyRepository.findDistinctLiveCitiesStartingWith(pattern, limit);
        }
        if (upperType == null || "DISTRICT".equals(upperType)) {
            districts = propertyRepository.findDistinctLiveDistrictsStartingWith(pattern, limit);
        }
        if (upperType == null || "LOCALITY".equals(upperType)) {
            localities = propertyRepository.findDistinctLiveLocalitiesStartingWith(pattern, lowerCity, limit);
        }

        return LocationSuggestionsResponse.builder()
                .cities(cities)
                .districts(districts)
                .localities(localities)
                .build();
    }
}
