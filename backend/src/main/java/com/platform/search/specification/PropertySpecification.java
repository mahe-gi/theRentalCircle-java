package com.platform.search.specification;

import com.platform.property.entity.*;
import com.platform.search.dto.SearchRequest;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

public class PropertySpecification {

    public static Specification<Property> isLive() {
        return (root, query, cb) -> cb.equal(root.get("status"), PropertyStatus.LIVE);
    }

    public static Specification<Property> hasListingType(SearchRequest req) {
        if (!StringUtils.hasText(req.getListingType())) {
            return null;
        }
        return (root, query, cb) -> {
            try {
                ListingType lt = ListingType.valueOf(req.getListingType().trim().toUpperCase());
                return cb.equal(root.get("listingType"), lt);
            } catch (IllegalArgumentException e) {
                return cb.disjunction();
            }
        };
    }

    public static Specification<Property> hasPropertyType(SearchRequest req) {
        if (!StringUtils.hasText(req.getPropertyType())) {
            return null;
        }
        return (root, query, cb) -> {
            try {
                PropertyType pt = PropertyType.valueOf(req.getPropertyType().trim().toUpperCase());
                return cb.equal(root.get("propertyType"), pt);
            } catch (IllegalArgumentException e) {
                return cb.disjunction();
            }
        };
    }

    public static Specification<Property> inCity(SearchRequest req) {
        if (!StringUtils.hasText(req.getCity())) {
            return null;
        }
        return (root, query, cb) -> cb.equal(cb.lower(root.get("city")), req.getCity().trim().toLowerCase());
    }

    public static Specification<Property> inDistrict(SearchRequest req) {
        if (!StringUtils.hasText(req.getDistrict())) {
            return null;
        }
        return (root, query, cb) -> cb.equal(cb.lower(root.get("district")), req.getDistrict().trim().toLowerCase());
    }

    public static Specification<Property> inLocality(SearchRequest req) {
        if (!StringUtils.hasText(req.getLocality())) {
            return null;
        }
        return (root, query, cb) -> cb.equal(cb.lower(root.get("locality")), req.getLocality().trim().toLowerCase());
    }

    public static Specification<Property> priceBetween(SearchRequest req) {
        if (req.getMinPrice() == null && req.getMaxPrice() == null) {
            return null;
        }
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (req.getMinPrice() != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("price"), BigDecimal.valueOf(req.getMinPrice())));
            }
            if (req.getMaxPrice() != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("price"), BigDecimal.valueOf(req.getMaxPrice())));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    public static Specification<Property> hasBhk(SearchRequest req) {
        if (req.getBhk() == null || req.getBhk().isEmpty()) {
            return null;
        }
        return (root, query, cb) -> root.get("bhk").in(req.getBhk());
    }

    public static Specification<Property> hasFurnishing(SearchRequest req) {
        if (!StringUtils.hasText(req.getFurnishing())) {
            return null;
        }
        return (root, query, cb) -> {
            try {
                String val = req.getFurnishing().trim().toUpperCase();
                if ("FURNISHED".equals(val)) {
                    val = "FULLY_FURNISHED";
                }
                FurnishingType ft = FurnishingType.valueOf(val);
                return cb.equal(root.get("furnishing"), ft);
            } catch (IllegalArgumentException e) {
                return cb.disjunction();
            }
        };
    }

    public static Specification<Property> areaAtLeast(SearchRequest req) {
        if (req.getMinArea() == null) {
            return null;
        }
        return (root, query, cb) -> cb.greaterThanOrEqualTo(root.get("carpetArea"), req.getMinArea());
    }

    public static Specification<Property> areaAtMost(SearchRequest req) {
        if (req.getMaxArea() == null) {
            return null;
        }
        return (root, query, cb) -> cb.lessThanOrEqualTo(root.get("carpetArea"), req.getMaxArea());
    }

    public static Specification<Property> inBoundingBox(SearchRequest req) {
        if (req.getMinLat() == null || req.getMaxLat() == null || req.getMinLng() == null || req.getMaxLng() == null) {
            return null;
        }
        return (root, query, cb) -> cb.and(
                cb.between(root.get("latitude"), req.getMinLat(), req.getMaxLat()),
                cb.between(root.get("longitude"), req.getMinLng(), req.getMaxLng())
        );
    }

    public static Specification<Property> hasAllAmenities(SearchRequest req) {
        if (req.getAmenities() == null || req.getAmenities().isEmpty()) {
            return null;
        }

        List<String> requested = req.getAmenities().stream()
                .filter(StringUtils::hasText)
                .map(String::trim)
                .map(String::toLowerCase)
                .distinct()
                .toList();

        if (requested.isEmpty()) {
            return null;
        }

        return (root, query, cb) -> {
            Subquery<Long> subquery = query.subquery(Long.class);
            Root<PropertyAmenity> amenityRoot = subquery.from(PropertyAmenity.class);

            subquery.select(cb.countDistinct(cb.lower(amenityRoot.get("amenityName"))));

            Predicate propPredicate = cb.equal(amenityRoot.get("property"), root);
            Predicate namePredicate = cb.lower(amenityRoot.get("amenityName")).in(requested);

            subquery.where(cb.and(propPredicate, namePredicate));

            return cb.equal(subquery, (long) requested.size());
        };
    }
}
