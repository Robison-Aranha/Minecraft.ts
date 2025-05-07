package com.br.game.controller;

import com.br.game.controller.request.WorldCreateRequest;
import com.br.game.controller.response.WorldResponse;
import com.br.game.service.game.CreateWorldService;
import com.br.game.service.game.DeleteWorldService;
import com.br.game.service.game.ListWorldsService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/game")
public class GameController {

    @Autowired
    CreateWorldService createWorldService;

    @Autowired
    ListWorldsService listWorldsService;

    @Autowired
    DeleteWorldService deleteWorldService;

    @PostMapping()
    public void createWorld(@Valid @RequestBody @ModelAttribute WorldCreateRequest request) {
        createWorldService.create(request);
    }

    @GetMapping
    public List<WorldResponse> listWorlds() {
        return listWorldsService.list();
    }

    @DeleteMapping("/{id}")
    public void deleteWorld(@PathVariable Long id) {
        deleteWorldService.delete(id);
    }
}
