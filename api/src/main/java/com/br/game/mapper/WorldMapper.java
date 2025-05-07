package com.br.game.mapper;

import com.br.game.controller.request.WorldCreateRequest;
import com.br.game.controller.response.WorldResponse;
import com.br.game.domain.World;
import com.br.game.enumerate.WorldType;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

public class WorldMapper {

    public static World toEntity(WorldCreateRequest request) {
        return World.builder()
                .worldName(request.getWorldName())
                .worldCreatedDate(LocalDateTime.now())
                .worldType(WorldType.valueOf(request.getWorldType().toUpperCase()))
                .build();
    }

    public static WorldResponse toResponse(World entity) {
        LocalDateTime now = LocalDateTime.now();
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
        String formattedDate = now.format(formatter);
        return WorldResponse.builder()
                .id(entity.getId())
                .worldName(entity.getWorldName())
                .worldType(entity.getWorldType().name())
                .worldImage(entity.getWorldImage())
                .worldCreatedDate(formattedDate)
                .build();
    }
}
