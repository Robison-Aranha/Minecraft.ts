package com.br.game.security.mapper;

import com.br.game.domain.User;
import com.br.game.security.controller.request.RegisterRequest;
import com.br.game.security.controller.response.TokenResponse;

public class UserMapper {

    public static User toEntity(RegisterRequest request) {
        return User.builder()
                .username(request.getUsername())
                .build();
    }

    public static TokenResponse toResponse(String token, Long id) {
        return TokenResponse.builder()
                .token(token)
                .id(id)
                .build();
    }
}
