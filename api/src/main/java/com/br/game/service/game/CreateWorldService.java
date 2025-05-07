package com.br.game.service.game;

import com.br.game.controller.request.WorldCreateRequest;
import com.br.game.domain.World;
import com.br.game.domain.User;
import com.br.game.exception.GameException;
import com.br.game.repository.WorldRepository;
import com.br.game.security.service.AuthenticatedUserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.io.IOException;

import static com.br.game.mapper.WorldMapper.toEntity;

@Service
public class CreateWorldService {

    private final Integer MAX_LENGHT_WORLD_NAME = 20;

    @Autowired
    AuthenticatedUserService authenticatedUserService;

    @Autowired
    WorldRepository worldRepository;

    @Autowired
    ConvertFileToBase64 convertFileToBase64;


    public void create(WorldCreateRequest request) {

        User user = authenticatedUserService.get();

        if (request.getWorldName().length() > MAX_LENGHT_WORLD_NAME) {
            throw new GameException(HttpStatus.NOT_ACCEPTABLE.value(), "Maximum number of characters exited!");
        }

        World game = toEntity(request);
        game.setUserWorld(user);
        String convertedImage;
        try {
            convertedImage = convertFileToBase64.convert(request.getWorldImage());
            game.setWorldImage(convertedImage);
        } catch (IOException e) {
            throw new GameException(HttpStatus.INTERNAL_SERVER_ERROR.value(), "Error Converting Image!");
        }

        worldRepository.save(game);
    }

}
