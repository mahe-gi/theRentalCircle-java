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
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = Instant.now();
    }
}
