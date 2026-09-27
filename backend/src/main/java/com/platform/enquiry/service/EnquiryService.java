package com.platform.enquiry.service;

import com.platform.common.exception.BadRequestException;
import com.platform.common.exception.ResourceNotFoundException;
import com.platform.enquiry.dto.CreateEnquiryRequest;
import com.platform.enquiry.dto.EnquiryResponse;
import com.platform.enquiry.dto.UpdateEnquiryStatusRequest;
import com.platform.enquiry.entity.Enquiry;
import com.platform.enquiry.entity.EnquiryStatus;
import com.platform.enquiry.repository.EnquiryRepository;
import com.platform.notification.service.NotificationService;
import com.platform.property.entity.Property;
import com.platform.property.entity.PropertyStatus;
import com.platform.property.repository.PropertyRepository;
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
public class EnquiryService {

    private final EnquiryRepository enquiryRepository;
    private final PropertyRepository propertyRepository;
    private final NotificationService notificationService;

    @Transactional
    public EnquiryResponse createEnquiry(User user, Long propertyId, CreateEnquiryRequest req) {
        Property property = propertyRepository.findById(propertyId)
                .orElseThrow(() -> new ResourceNotFoundException("Property not found with id: " + propertyId));

        if (property.getStatus() != PropertyStatus.LIVE) {
            throw new ResourceNotFoundException("Property not found or not active");
        }

        User owner = property.getOwnerProfile().getUser();
        if (owner.getId().equals(user.getId())) {
            throw new BadRequestException("You cannot submit an enquiry on your own property");
        }

        Enquiry enquiry = Enquiry.builder()
                .user(user)
                .property(property)
                .message(req.getMessage())
                .status(EnquiryStatus.NEW)
                .build();
        enquiryRepository.save(enquiry);

        // Notify owner
        notificationService.createNotification(
                owner.getId(),
                "New Property Enquiry",
                String.format("%s %s sent an enquiry on '%s': \"%s\"",
                        user.getFirstName(), user.getLastName(), property.getTitle(),
                        req.getMessage().length() > 60 ? req.getMessage().substring(0, 57) + "..." : req.getMessage()),
                "ENQUIRY",
                "PROPERTY",
                property.getId()
        );

        return EnquiryResponse.fromEntity(enquiry);
    }

    @Transactional(readOnly = true)
    public Page<EnquiryResponse> getMyEnquiries(Long userId, Pageable pageable) {
        return enquiryRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable)
                .map(EnquiryResponse::fromEntity);
    }

    @Transactional(readOnly = true)
    public Page<EnquiryResponse> getReceivedEnquiries(Long ownerUserId, Pageable pageable) {
        return enquiryRepository.findByPropertyOwnerProfileUserIdOrderByCreatedAtDesc(ownerUserId, pageable)
                .map(EnquiryResponse::fromEntity);
    }

    @Transactional
    public EnquiryResponse updateEnquiryStatus(Long enquiryId, Long ownerUserId, UpdateEnquiryStatusRequest req) {
        Enquiry enquiry = enquiryRepository.findByIdAndPropertyOwnerProfileUserId(enquiryId, ownerUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Enquiry not found or access denied"));

        enquiry.setStatus(req.getStatus());
        enquiryRepository.save(enquiry);

        // Notify sender if status changed
        notificationService.createNotification(
                enquiry.getUser().getId(),
                "Enquiry Update",
                String.format("Your enquiry on '%s' has been updated to %s by the owner",
                        enquiry.getProperty().getTitle(), req.getStatus()),
                "ENQUIRY_UPDATE",
                "PROPERTY",
                enquiry.getProperty().getId()
        );

        return EnquiryResponse.fromEntity(enquiry);
    }
}
