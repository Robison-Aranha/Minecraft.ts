package com.br.game.controller.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import org.springframework.web.multipart.MultipartFile;

@Data
public class WorldCreateRequest {

    @NotNull
    @NotBlank
    private String WorldName;

    @NotNull
    @NotBlank
    private String worldType;


    private MultipartFile worldImage;

}
