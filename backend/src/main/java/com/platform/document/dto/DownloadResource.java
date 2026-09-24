package com.platform.document.dto;

import org.springframework.core.io.Resource;

public record DownloadResource(
        Resource resource,
        String contentType,
        String originalFilename
) {
}
