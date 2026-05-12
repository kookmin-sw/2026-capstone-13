package com.helpboys.api.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.http.HttpRequest;

@Component
public class AiRequestFactory {

    private static final String AI_AUTH_HEADER = "X-Helpboys-AI-Key";

    @Value("${ai.shared-secret:}")
    private String sharedSecret;

    public HttpRequest.Builder builder(String url) {
        HttpRequest.Builder builder = HttpRequest.newBuilder().uri(URI.create(url));
        if (sharedSecret != null && !sharedSecret.isBlank()) {
            builder.header(AI_AUTH_HEADER, sharedSecret);
        }
        return builder;
    }
}
