package com.br.game.domain;


import com.br.game.enumerate.WorldType;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcType;
import org.hibernate.dialect.PostgreSQLEnumJdbcType;

import java.time.LocalDateTime;

import static jakarta.persistence.GenerationType.IDENTITY;

@Entity
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class World {

    @Id
    @GeneratedValue(strategy = IDENTITY)
    private Long id;

    private String worldName;

    @Enumerated(EnumType.STRING)
    @JdbcType(PostgreSQLEnumJdbcType.class)
    private WorldType worldType;

    private LocalDateTime worldCreatedDate;

    private String worldImage;

    @ManyToOne
    @JoinColumn(name = "id_user")
    private User userWorld;

}
