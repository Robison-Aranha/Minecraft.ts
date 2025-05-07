package com.br.game.security.service;

import com.br.game.domain.User;
import com.br.game.exception.GameException;
import com.br.game.security.controller.request.LoginRequest;
import com.br.game.security.controller.response.TokenResponse;
import com.br.game.security.jwt.JwtService;
import com.br.game.security.repository.UserRepository;
import com.br.game.service.VerificarParametroService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import static com.br.game.security.mapper.UserMapper.toResponse;

@Service
public class SearchUserSecurityAuthService {

    @Autowired
    UserRepository userRepository;

    @Autowired
    PasswordEncoder passwordEncoder;

    @Autowired
    VerificarParametroService verificarParametroService;

    @Autowired
    JwtService jwtService;

    public TokenResponse buscar(LoginRequest request) {

        verificarParametroService.verificar(request.getUsername());
        verificarParametroService.verificar(request.getPassword());

        User user = userRepository.findByUsername(request.getUsername()).get();

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new GameException(HttpStatus.UNAUTHORIZED.value());
        }

        String newToken = jwtService.generateToken(user);

        jwtService.saveToken(user, newToken);

        return toResponse(newToken, user.getId());
    }

}
