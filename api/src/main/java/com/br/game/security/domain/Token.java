package com.br.game.security.domain;


import com.br.game.domain.User;
import jakarta.persistence.*;
import lombok.*;

import static jakarta.persistence.GenerationType.IDENTITY;

@Entity
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Data
public class Token {

    @Id
    @GeneratedValue(strategy = IDENTITY)
    private Long id;

    private String token;

    private Boolean isExpired;

    @ManyToOne
    @JoinColumn(name = "id_user")
    User userToken;

}
