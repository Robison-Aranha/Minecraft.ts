package com.br.game.service;

import com.br.game.exception.GameException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Service
public class VerificarParametroService {

    public void verificar(String parametro) {

        String regex = "^[a-zA-Z0-9]";

        if (regex.matches(parametro) || parametro == null || parametro.isEmpty()) {
            throw new GameException(HttpStatus.FORBIDDEN.value(), "Parametro Inválido");
        }
    }

}
