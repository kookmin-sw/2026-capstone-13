package com.helpboys.api.util;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.TreeMap;
import java.util.zip.Deflater;

// Agora AccessToken2 (version 007) 토큰 생성 유틸리티
// 공식 스펙: https://github.com/AgoraIO/Tools/tree/master/DynamicKey/AgoraDynamicKey/java
public class AgoraTokenUtil {

    private static final String VERSION = "007";
    private static final short SERVICE_TYPE_RTC = 1;
    private static final short PRIVILEGE_JOIN_CHANNEL = 1;
    private static final short PRIVILEGE_PUBLISH_AUDIO = 2;
    private static final short PRIVILEGE_PUBLISH_VIDEO = 3;
    private static final short PRIVILEGE_PUBLISH_DATA = 4;

    public static String buildRtcToken(String appId, String appCertificate,
                                       String channelName, int uid, int expireSeconds) throws Exception {
        int issueTs = (int) (System.currentTimeMillis() / 1000);
        int expire = issueTs + expireSeconds;
        int salt = new SecureRandom().nextInt(99999999) + 1;

        // body 패킹
        byte[] serviceBytes = packRtcService(channelName, String.valueOf(uid), expire);
        ByteArrayOutputStream body = new ByteArrayOutputStream();
        body.write(packUInt32(issueTs));
        body.write(packUInt32(expire));
        body.write(packUInt32(salt));
        body.write(packUInt16(1)); // service count
        body.write(serviceBytes);
        byte[] bodyBytes = body.toByteArray();

        // 서명: HMAC-SHA256(HMAC-SHA256(appCertificate, appId+issueTs+salt), body)
        byte[] signingKey = hmacSha256(
                appCertificate.getBytes(StandardCharsets.UTF_8),
                (appId + issueTs + salt).getBytes(StandardCharsets.UTF_8)
        );
        byte[] signature = hmacSha256(signingKey, bodyBytes);

        // content = packString(signature) + body (길이 prefix 없음)
        ByteArrayOutputStream content = new ByteArrayOutputStream();
        content.write(packUInt16(signature.length));
        content.write(signature);
        content.write(bodyBytes);

        // zlib 압축 후 base64 인코딩
        byte[] compressed = zlibCompress(content.toByteArray());
        return VERSION + appId + Base64.getEncoder().encodeToString(compressed);
    }

    private static byte[] packRtcService(String channelName, String uid, int expire) throws IOException {
        TreeMap<Short, Integer> privileges = new TreeMap<>();
        privileges.put(PRIVILEGE_JOIN_CHANNEL, expire);
        privileges.put(PRIVILEGE_PUBLISH_AUDIO, expire);
        privileges.put(PRIVILEGE_PUBLISH_VIDEO, expire);
        privileges.put(PRIVILEGE_PUBLISH_DATA, expire);

        ByteArrayOutputStream bos = new ByteArrayOutputStream();
        bos.write(packUInt16(SERVICE_TYPE_RTC));
        bos.write(packString(channelName));
        bos.write(packString(uid));
        bos.write(packUInt16(privileges.size()));
        for (var entry : privileges.entrySet()) {
            bos.write(packUInt16(entry.getKey()));
            bos.write(packUInt32(entry.getValue()));
        }
        return bos.toByteArray();
    }

    private static byte[] hmacSha256(byte[] key, byte[] data) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(key, "HmacSHA256"));
        return mac.doFinal(data);
    }

    private static byte[] zlibCompress(byte[] data) {
        Deflater deflater = new Deflater();
        deflater.setInput(data);
        deflater.finish();
        ByteArrayOutputStream bos = new ByteArrayOutputStream(data.length);
        byte[] buf = new byte[1024];
        while (!deflater.finished()) {
            int count = deflater.deflate(buf);
            bos.write(buf, 0, count);
        }
        deflater.end();
        return bos.toByteArray();
    }

    private static byte[] packUInt16(int value) {
        return ByteBuffer.allocate(2).order(ByteOrder.LITTLE_ENDIAN).putShort((short) value).array();
    }

    private static byte[] packUInt32(int value) {
        return ByteBuffer.allocate(4).order(ByteOrder.LITTLE_ENDIAN).putInt(value).array();
    }

    private static byte[] packString(String str) throws IOException {
        byte[] bytes = str.getBytes(StandardCharsets.UTF_8);
        ByteArrayOutputStream bos = new ByteArrayOutputStream();
        bos.write(packUInt16(bytes.length));
        bos.write(bytes);
        return bos.toByteArray();
    }
}
