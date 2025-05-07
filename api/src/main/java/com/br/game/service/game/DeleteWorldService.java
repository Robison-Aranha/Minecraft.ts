package com.br.game.service.game;

import com.br.game.exception.GameException;
import com.br.game.repository.WorldRepository;
import com.br.game.security.service.AuthenticatedUserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Service
public class DeleteWorldService {

    @Autowired
    AuthenticatedUserService authenticatedUserService;

    @Autowired
    WorldRepository worldRepository;

    public void delete(Long id) {

        authenticatedUserService.get();

        try {
            worldRepository.deleteById(id);
        } catch (Exception e) {
            throw new GameException(HttpStatus.NOT_FOUND.value(), "Game do not exists!");
        }

    }

}
