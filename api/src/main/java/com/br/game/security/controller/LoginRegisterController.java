package com.br.game.security.controller;

import com.br.game.security.controller.request.LoginRequest;
import com.br.game.security.controller.request.RegisterRequest;
import com.br.game.security.controller.response.TokenResponse;
import com.br.game.security.repository.UserRepository;
import com.br.game.security.service.SearchUserSecurityAuthService;
import com.br.game.security.service.IncludeUserService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping()
public class LoginRegisterController {

    @Autowired
    private SearchUserSecurityAuthService buscarUsuarioService;

    @Autowired
    private IncludeUserService includeUserService;

    @Autowired
    UserRepository userRepository;

    @PostMapping("/login")
    public TokenResponse login(@RequestBody LoginRequest request) {
        return buscarUsuarioService.buscar(request);
    }

    @PostMapping("/register")
    public void incluir(@Valid @RequestBody RegisterRequest request) {
        includeUserService.incluir(request);
    }
}
