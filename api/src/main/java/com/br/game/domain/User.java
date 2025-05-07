package com.br.game.domain;

import com.br.game.security.domain.Token;
import jakarta.persistence.*;
import lombok.*;

import java.util.List;

import static jakarta.persistence.GenerationType.IDENTITY;

@Entity
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class User {

    @Id
    @GeneratedValue(strategy = IDENTITY)
    private Long id;

    @Column(unique = true)
    private String username;

    private String password;

    private boolean active;

    @OneToMany(mappedBy = "userToken")
    @ToString.Exclude
    private List<Token> tokens;

    @OneToMany(mappedBy = "userWorld")
    @ToString.Exclude
    private List<World> worlds;

}
