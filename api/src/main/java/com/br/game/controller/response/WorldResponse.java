package com.br.game.controller.response;

import lombok.Builder;
import lombok.Data;


@Builder
@Data
public class WorldResponse {

    private Long id;

    private String worldName;

    private String worldType;

    private String worldImage;

    private String worldCreatedDate;

}
