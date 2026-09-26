package com.platform.search.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LocationSuggestionsResponse {

    @Builder.Default
    private List<String> cities = new ArrayList<>();

    @Builder.Default
    private List<String> districts = new ArrayList<>();

    @Builder.Default
    private List<String> localities = new ArrayList<>();
}
