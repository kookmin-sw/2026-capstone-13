package io.agora.media;

import java.io.ByteArrayOutputStream;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.Date;
import java.util.zip.Deflater;
import java.util.zip.Inflater;

public class Utils {
    public static final int VERSION_LENGTH = 3;
    public static final int APP_ID_LENGTH = 32;

    public static int getTimestamp() {
        return (int) (new Date().getTime() / 1000);
    }

    public static int randomInt() {
        return new SecureRandom().nextInt();
    }

    public static boolean isUUID(String uuid) {
        if (uuid.length() != 32) return false;
        return uuid.matches("\\p{XDigit}+");
    }

    public static String base64Encode(byte[] data) {
        return Base64.getEncoder().encodeToString(data);
    }

    public static byte[] base64Decode(String data) {
        return Base64.getDecoder().decode(data);
    }

    public static byte[] compress(byte[] data) {
        Deflater deflater = new Deflater();
        ByteArrayOutputStream bos = new ByteArrayOutputStream(data.length);
        try {
            deflater.reset();
            deflater.setInput(data);
            deflater.finish();
            byte[] buf = new byte[data.length];
            while (!deflater.finished()) {
                bos.write(buf, 0, deflater.deflate(buf));
            }
        } catch (Exception e) {
            e.printStackTrace();
            return data;
        } finally {
            deflater.end();
        }
        return bos.toByteArray();
    }

    public static byte[] decompress(byte[] data) {
        Inflater inflater = new Inflater();
        ByteArrayOutputStream bos = new ByteArrayOutputStream(data.length);
        try {
            inflater.setInput(data);
            byte[] buf = new byte[8192];
            int len;
            while ((len = inflater.inflate(buf)) > 0) {
                bos.write(buf, 0, len);
            }
        } catch (Exception e) {
            e.printStackTrace();
        } finally {
            inflater.end();
        }
        return bos.toByteArray();
    }
}
