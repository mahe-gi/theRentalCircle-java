package com.platform.visit.service;

import com.platform.common.exception.BadRequestException;
import com.platform.common.exception.ResourceNotFoundException;
import com.platform.notification.service.NotificationService;
import com.platform.property.entity.Property;
import com.platform.property.entity.PropertyStatus;
import com.platform.property.repository.PropertyRepository;
import com.platform.user.entity.User;
import com.platform.visit.dto.CreateVisitRequest;
import com.platform.visit.dto.RescheduleVisitRequest;
import com.platform.visit.dto.VisitResponse;
import com.platform.visit.entity.Visit;
import com.platform.visit.entity.VisitStatus;
import com.platform.visit.repository.VisitRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class VisitService {

    private final VisitRepository visitRepository;
    private final PropertyRepository propertyRepository;
    private final NotificationService notificationService;

    @Transactional
    public VisitResponse requestVisit(User user, Long propertyId, CreateVisitRequest req) {
        Property property = propertyRepository.findById(propertyId)
                .orElseThrow(() -> new ResourceNotFoundException("Property not found with id: " + propertyId));

        if (property.getStatus() != PropertyStatus.LIVE) {
            throw new ResourceNotFoundException("Property not found or not active");
        }

        User owner = property.getOwnerProfile().getUser();
        if (owner.getId().equals(user.getId())) {
            throw new BadRequestException("You cannot schedule a visit on your own property");
        }

        Visit visit = Visit.builder()
                .user(user)
                .property(property)
                .preferredDate(req.getPreferredDate())
                .preferredTime(req.getPreferredTime())
                .message(req.getMessage())
                .status(VisitStatus.REQUESTED)
                .build();
        visitRepository.save(visit);

        // Notify owner
        notificationService.createNotification(
                owner.getId(),
                "New Visit Request",
                String.format("%s %s requested a visit on '%s' for %s at %s",
                        user.getFirstName(), user.getLastName(), property.getTitle(),
                        req.getPreferredDate(), req.getPreferredTime()),
                "VISIT_REQUEST",
                "VISIT",
                visit.getId()
        );

        return VisitResponse.fromEntity(visit);
    }

    @Transactional(readOnly = true)
    public Page<VisitResponse> getMyVisits(Long userId, Pageable pageable) {
        return visitRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable)
                .map(VisitResponse::fromEntity);
    }

    @Transactional(readOnly = true)
    public Page<VisitResponse> getReceivedVisits(Long ownerUserId, Pageable pageable) {
        return visitRepository.findByPropertyOwnerProfileUserIdOrderByCreatedAtDesc(ownerUserId, pageable)
                .map(VisitResponse::fromEntity);
    }

    @Transactional
    public VisitResponse acceptVisit(Long visitId, Long ownerUserId) {
        Visit visit = visitRepository.findByIdAndPropertyOwnerProfileUserId(visitId, ownerUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Visit not found or access denied"));

        if (visit.getStatus() != VisitStatus.REQUESTED && visit.getStatus() != VisitStatus.RESCHEDULED) {
            throw new BadRequestException("Visit cannot be accepted in status: " + visit.getStatus());
        }

        visit.setStatus(VisitStatus.ACCEPTED);
        visitRepository.save(visit);

        notificationService.createNotification(
                visit.getUser().getId(),
                "Visit Accepted",
                String.format("Your visit request for '%s' on %s has been confirmed by the owner!",
                        visit.getProperty().getTitle(),
                        visit.getRescheduledDate() != null ? visit.getRescheduledDate() : visit.getPreferredDate()),
                "VISIT_ACCEPTED",
                "VISIT",
                visit.getId()
        );

        return VisitResponse.fromEntity(visit);
    }

    @Transactional
    public VisitResponse rejectVisit(Long visitId, Long ownerUserId, String reason) {
        Visit visit = visitRepository.findByIdAndPropertyOwnerProfileUserId(visitId, ownerUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Visit not found or access denied"));

        visit.setStatus(VisitStatus.REJECTED);
        visit.setOwnerRemarks(reason);
        visitRepository.save(visit);

        notificationService.createNotification(
                visit.getUser().getId(),
                "Visit Declined",
                String.format("Your visit request for '%s' was declined. Reason: %s",
                        visit.getProperty().getTitle(), reason != null ? reason : "Unavailable"),
                "VISIT_REJECTED",
                "VISIT",
                visit.getId()
        );

        return VisitResponse.fromEntity(visit);
    }

    @Transactional
    public VisitResponse rescheduleVisit(Long visitId, Long ownerUserId, RescheduleVisitRequest req) {
        Visit visit = visitRepository.findByIdAndPropertyOwnerProfileUserId(visitId, ownerUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Visit not found or access denied"));

        visit.setStatus(VisitStatus.RESCHEDULED);
        visit.setRescheduledDate(req.getRescheduledDate());
        visit.setRescheduledTime(req.getRescheduledTime());
        visit.setOwnerRemarks(req.getOwnerRemarks());
        visitRepository.save(visit);

        notificationService.createNotification(
                visit.getUser().getId(),
                "Visit Rescheduled",
                String.format("Owner proposed a new visit time for '%s': %s at %s",
                        visit.getProperty().getTitle(), req.getRescheduledDate(), req.getRescheduledTime()),
                "VISIT_RESCHEDULED",
                "VISIT",
                visit.getId()
        );

        return VisitResponse.fromEntity(visit);
    }

    @Transactional
    public VisitResponse cancelVisit(Long visitId, Long userId) {
        Visit visit = visitRepository.findByIdAndUserId(visitId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Visit not found or access denied"));

        if (visit.getStatus() == VisitStatus.COMPLETED || visit.getStatus() == VisitStatus.CANCELLED) {
            throw new BadRequestException("Visit cannot be cancelled in status: " + visit.getStatus());
        }

        visit.setStatus(VisitStatus.CANCELLED);
        visitRepository.save(visit);

        User owner = visit.getProperty().getOwnerProfile().getUser();
        notificationService.createNotification(
                owner.getId(),
                "Visit Cancelled",
                String.format("Visit for '%s' was cancelled by the prospective tenant",
                        visit.getProperty().getTitle()),
                "VISIT_CANCELLED",
                "VISIT",
                visit.getId()
        );

        return VisitResponse.fromEntity(visit);
    }

    @Transactional
    public VisitResponse completeVisit(Long visitId, Long ownerUserId) {
        Visit visit = visitRepository.findByIdAndPropertyOwnerProfileUserId(visitId, ownerUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Visit not found or access denied"));

        visit.setStatus(VisitStatus.COMPLETED);
        visitRepository.save(visit);

        return VisitResponse.fromEntity(visit);
    }
}
