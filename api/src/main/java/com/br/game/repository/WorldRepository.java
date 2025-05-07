package com.br.game.repository;

import com.br.game.domain.World;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WorldRepository extends JpaRepository<World, Long> {

}
