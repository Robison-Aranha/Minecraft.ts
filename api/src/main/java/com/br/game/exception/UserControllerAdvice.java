package com.br.game.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.List;

@RestControllerAdvice
public class UserControllerAdvice {

    @ResponseBody
    @ExceptionHandler(GameException.class)
    public ResponseEntity<GameException> returnResponseException(GameException exception) {

        return new ResponseEntity<>(exception, HttpStatusCode.valueOf(exception.getStatus()));
    }

    @ResponseBody
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<GameException> failedValidateCredentials(MethodArgumentNotValidException failedValidateCredentials) {

        List<FieldError> listaDeErros = failedValidateCredentials.getFieldErrors();

        StringBuilder expressaoFinal = new StringBuilder();

        expressaoFinal.append('[');

        int index = 1;

        for (FieldError erro : listaDeErros) {

            expressaoFinal.append('"' + erro.getDefaultMessage() + '"');

            if (listaDeErros.size() != index){

                expressaoFinal.append(",");

            }

            index++;
        }

        expressaoFinal.append(']');

        GameException error = new GameException(
                HttpStatus.CONFLICT.value(),  expressaoFinal.toString()
        );


        return new ResponseEntity<>(error, HttpStatus.CONFLICT);

    }
}