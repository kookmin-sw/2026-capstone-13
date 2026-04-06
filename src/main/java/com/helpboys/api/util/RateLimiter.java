package com.helpboys.api.util;

import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 간단한 인메모리 Rate Limiter
 * - 키(이메일/IP)별로 N초 안에 M번까지만 허용
 */
@Component
public class RateLimiter {

    private record Bucket(int count, Instant windowStart) {}

    private final ConcurrentHashMap<String, Bucket> buckets = new ConcurrentHashMap<>();

    /**
     * @param key       이메일 또는 IP
     * @param maxRequests 허용 횟수
     * @param windowSeconds 윈도우 초
     * @return true = 허용, false = 차단
     */
    public boolean isAllowed(String key, int maxRequests, int windowSeconds) {
        Instant now = Instant.now();
        Bucket bucket = buckets.compute(key, (k, b) -> {
            if (b == null || now.isAfter(b.windowStart().plusSeconds(windowSeconds))) {
                return new Bucket(1, now);
            }
            return new Bucket(b.count() + 1, b.windowStart());
        });
        return bucket.count() <= maxRequests;
    }
}
