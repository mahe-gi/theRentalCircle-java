package com.platform.contact.service;

import com.platform.common.exception.BadRequestException;
import com.platform.common.exception.ResourceNotFoundException;
import com.platform.contact.dto.ContactResponse;
import com.platform.contact.entity.ContactEvent;
import com.platform.contact.repository.ContactEventRepository;
import com.platform.notification.service.NotificationService;
import com.platform.property.entity.Property;
import com.platform.property.entity.PropertyStatus;
import com.platform.property.repository.PropertyRepository;
import com.platform.user.entity.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

@Service
@RequiredArgsConstructor
@Slf4j
public class ContactService {

    private final PropertyRepository propertyRepository;
    private final ContactEventRepository contactEventRepository;
    private final NotificationService notificationService;

    @Transactional
    public ContactResponse initiateWhatsAppContact(User currentUser, Long propertyId) {
        Property property = propertyRepository.findById(propertyId)
                .orElseThrow(() -> new ResourceNotFoundException("Property not found with id: " + propertyId));

        if (property.getStatus() != PropertyStatus.LIVE) {
            throw new BadRequestException("Cannot contact owner of a property that is not LIVE");
        }

        User owner = property.getOwnerProfile().getUser();
        if (owner.getId().equals(currentUser.getId())) {
            throw new BadRequestException("Owners cannot contact themselves about their own listing");
        }

        String mobile = owner.getMobile();
        String sanitizedMobile = mobile != null ? mobile.replaceAll("[^0-9]", "") : "919999999999";

        String text = String.format("Hi, I am interested in your property listing '%s' (ID: %d) on RentalCircle.",
                property.getTitle(), property.getId());
        String encodedText = URLEncoder.encode(text, StandardCharsets.UTF_8);
        String whatsappUrl = "https://wa.me/" + sanitizedMobile + "?text=" + encodedText;

        ContactEvent event = ContactEvent.builder()
                .user(currentUser)
                .property(property)
                .contactType("WHATSAPP")
                .build();
        contactEventRepository.save(event);

        // Notify owner of contact attempt
        notificationService.createNotification(
                owner.getId(),
                "New WhatsApp Contact",
                String.format("%s %s contacted you about your property '%s'",
                        currentUser.getFirstName(), currentUser.getLastName(), property.getTitle()),
                "CONTACT",
                "PROPERTY",
                property.getId()
        );

        return ContactResponse.builder()
                .contactEventId(event.getId())
                .propertyId(property.getId())
                .whatsappUrl(whatsappUrl)
                .ownerName(owner.getFirstName() + " " + owner.getLastName())
                .build();
    }
}
