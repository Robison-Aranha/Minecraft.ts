package com.br.game.service.game;


import com.br.game.controller.response.WorldResponse;
import com.br.game.domain.User;
import com.br.game.mapper.WorldMapper;
import com.br.game.security.service.AuthenticatedUserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class ListWorldsService {

    @Autowired
    AuthenticatedUserService authenticatedUserService;


    public List<WorldResponse> list() {

        User user = authenticatedUserService.get();

        List<WorldResponse> listGamesResponse;
        listGamesResponse = user.getWorlds().stream().map(WorldMapper::toResponse).collect(Collectors.toList());
        Collections.reverse(listGamesResponse);
        return listGamesResponse;
    }

}
