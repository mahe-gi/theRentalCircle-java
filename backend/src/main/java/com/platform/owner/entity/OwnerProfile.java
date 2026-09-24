package com.platform.owner.entity;

import com.platform.user.entity.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "owner_profiles")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(of = "id")
public class OwnerProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(name = "ownership_type", nullable = false, length = 32)
    private OwnershipType ownershipType;

    @Column(name = "company_name", length = 255)
    private String companyName;

    @Column(name = "declaration_accepted", nullable = false)
    @Builder.Default
    private boolean declarationAccepted = true;

    @Column(name = "declaration_accepted_at", nullable = false)
    private Instant declarationAcceptedAt;

    @Column(name = "declaration_version", nullable = false, length = 16)
    @Builder.Default
    private String declarationVersion = "v1.0";

    @Enumerated(EnumType.STRING)
    @Column(name = "verification_status", nullable = false, length = 32)
    @Builder.Default
    private VerificationStatus verificationStatus = VerificationStatus.NOT_STARTED;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "verified_by")
    private User verifiedBy;

    @Column(name = "verified_at")
    private Instant verifiedAt;

    @Column(name = "admin_remarks", columnDefinition = "TEXT")
    private String adminRemarks;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
        if (updatedAt == null) {
            updatedAt = Instant.now();
        }
        if (declarationAcceptedAt == null) {
            declarationAcceptedAt = Instant.now();
        }
        if (declarationVersion == null) {
            declarationVersion = "v1.0";
        }
        if (verificationStatus == null) {
            verificationStatus = VerificationStatus.NOT_STARTED;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = Instant.now();
    }
}
