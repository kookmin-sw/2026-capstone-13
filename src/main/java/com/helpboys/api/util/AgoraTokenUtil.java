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

/**
 * Agora AccessToken2 (version 007) 토큰 생성 유틸리티
 * 공식 스펙 기반: github.com/AgoraIO/Tools/DynamicKey/AgoraDynamicKey/java
 */
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

        // 1. content buffer: appId + issueTs + expire + salt + serviceCount + services
        byte[] serviceBytes = packRtcService(channelName, String.valueOf(uid), expire);
        ByteArrayOutputStream content = new ByteArrayOutputStream();
        content.write(packString(appId));
        content.write(packUInt32(issueTs));
        content.write(packUInt32(expire));
        content.write(packUInt32(salt));
        content.write(packUInt16(1)); // service count = 1
        content.write(serviceBytes);
        byte[] contentBytes = content.toByteArray();

        // 2. 서명 키 생성 (공식 스펙)
        // Stage 1: HMAC-SHA256(key=LE4(issueTs), msg=appCertificate)
        byte[] stage1 = hmacSha256(packUInt32(issueTs), appCertificate.getBytes(StandardCharsets.UTF_8));
        // Stage 2: HMAC-SHA256(key=LE4(salt), msg=stage1)
        byte[] signingKey = hmacSha256(packUInt32(salt), stage1);

        // 3. 서명: HMAC-SHA256(signingKey, contentBytes)
        byte[] signature = hmacSha256(signingKey, contentBytes);

        // 4. 최종 버퍼: signature(32bytes) + contentBytes
        ByteArrayOutputStream finalBuf = new ByteArrayOutputStream();
        finalBuf.write(signature);
        finalBuf.write(contentBytes);

        // 5. zlib 압축 → base64
        byte[] compressed = zlibCompress(finalBuf.toByteArray());
        return VERSION + Base64.getEncoder().encodeToString(compressed);
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
            bos.write(buf, 0, deflater.deflate(buf));
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
