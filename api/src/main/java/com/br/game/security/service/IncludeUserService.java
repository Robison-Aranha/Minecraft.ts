package com.br.game.security.service;

import com.br.game.domain.User;
import com.br.game.exception.GameException;
import com.br.game.security.controller.request.RegisterRequest;
import com.br.game.security.jwt.JwtService;
import com.br.game.security.repository.UserRepository;
import com.br.game.service.VerificarParametroService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import static com.br.game.security.mapper.UserMapper.toEntity;

@Service
public class IncludeUserService {

    @Autowired
    VerificarParametroService verificarParametrosService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    JwtService jwtService;

    public void incluir(RegisterRequest request) {

        verificarParametrosService.verificar(request.getUsername());
        verificarParametrosService.verificar(request.getPassword());

        if (userRepository.findByUsername(request.getUsername()).isPresent()) {
            throw new GameException(HttpStatus.FOUND.value(), "Username already exists!");
        }

        User user = toEntity(request);
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setActive(true);

        userRepository.save(user);
    }
}
