package com.br.game.security.controller.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

@Data
public class RegisterRequest {

    @Pattern(regexp = "^[a-zA-Z0-9]{6,12}$",
            message = "Username must be 6-12 long without special characters!")
    @NotBlank
    @NotNull
    private String username;

    @Pattern(regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])[a-zA-Z0-9!@#$%^&*]{4,12}$",
            message = "The password must be at least 4 and at most 12 long containing at least 1 uppercase, 1 lowercase, 1 special character and 1 digit!")
    @NotBlank
    @NotNull
    private String password;

}
