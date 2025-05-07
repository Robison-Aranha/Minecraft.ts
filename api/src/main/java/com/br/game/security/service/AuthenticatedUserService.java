package com.br.game.security.service;

import com.br.game.domain.User;
import com.br.game.exception.GameException;
import com.br.game.security.domain.UserSecurity;
import com.br.game.security.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

@Service
public class AuthenticatedUserService {

    @Autowired
    private UserRepository userRepository;

    public Long getId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserSecurity userSecurity = (UserSecurity) authentication.getPrincipal();
        return userSecurity.getId();
    }

    public User get() {
        return userRepository.findById(getId())
                .orElseThrow(() -> new GameException(HttpStatus.NOT_FOUND.value(), "User not found!"));
    }
}
