package com.br.game.exception;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import org.springframework.http.HttpStatus;

import java.util.Date;


@EqualsAndHashCode(callSuper = true)
@Data
public class GameException extends RuntimeException{

    private Date timeStamp;

    private int status;

    private String message;

    public GameException(int status, String message) {
        this.timeStamp = new Date();
        this.status = status;
        this.message = message;
    }

    public GameException(int status) {
        this.timeStamp = new Date();
        this.status = status;
    }

}
