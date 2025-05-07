package com.br.game.service.game;


import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Base64;

@Service
public class ConvertFileToBase64 {


    public String convert(MultipartFile arquivo) throws IOException {

        String fileEncoded = Base64.getEncoder().encodeToString(arquivo.getBytes());

        StringBuilder sb = new StringBuilder();

        sb.append("data:").append(arquivo.getContentType()).append(";base64,");
        sb.append(fileEncoded);

        return sb.toString();
    }


}
