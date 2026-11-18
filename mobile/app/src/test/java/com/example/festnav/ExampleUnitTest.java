package com.example.festnav;

import org.junit.Test;
import java.io.*;
import java.util.zip.InflaterInputStream;

public class ExampleUnitTest {
    @Test
    public void analyzeMasuk() throws Exception {
        scanImage("src/main/res/drawable/masuk.png");
    }

    private void scanImage(String path) throws Exception {
        File file = new File(path);
        if (!file.exists()) file = new File("app/" + path);

        DataInputStream dis = new DataInputStream(new FileInputStream(file));
        dis.skipBytes(8);

        int width = 0, height = 0, colorType = 0;
        ByteArrayOutputStream idatBuffer = new ByteArrayOutputStream();

        while (dis.available() > 0) {
            int len = dis.readInt();
            byte[] typeBytes = new byte[4];
            dis.readFully(typeBytes);
            String type = new String(typeBytes);
            byte[] data = new byte[len];
            dis.readFully(data);
            dis.readInt();

            if (type.equals("IHDR")) {
                DataInputStream ihdrDis = new DataInputStream(new ByteArrayInputStream(data));
                width = ihdrDis.readInt();
                height = ihdrDis.readInt();
                ihdrDis.readUnsignedByte();
                colorType = ihdrDis.readUnsignedByte();
            } else if (type.equals("IDAT")) {
                idatBuffer.write(data);
            } else if (type.equals("IEND")) {
                break;
            }
        }
        dis.close();

        byte[] compressed = idatBuffer.toByteArray();
        InputStream inflater = new InflaterInputStream(new ByteArrayInputStream(compressed));

        int bpp = (colorType == 6) ? 4 : (colorType == 2) ? 3 : 4;
        int rowSize = 1 + width * bpp;
        byte[] raw = new byte[height * rowSize];
        int readTotal = 0;
        while (readTotal < raw.length) {
            int count = inflater.read(raw, readTotal, raw.length - readTotal);
            if (count <= 0) break;
            readTotal += count;
        }

        byte[] decoded = new byte[height * width * bpp];
        byte[] prevRow = new byte[width * bpp];
        for (int y = 0; y < height; y++) {
            int filter = raw[y * rowSize] & 0xFF;
            int rawOffset = y * rowSize + 1;
            int decOffset = y * width * bpp;
            byte[] currRow = new byte[width * bpp];

            for (int i = 0; i < width * bpp; i++) {
                int xVal = raw[rawOffset + i] & 0xFF;
                int a = (i >= bpp) ? (currRow[i - bpp] & 0xFF) : 0;
                int b = prevRow[i] & 0xFF;
                int c = (i >= bpp) ? (prevRow[i - bpp] & 0xFF) : 0;

                int val = 0;
                if (filter == 0) val = xVal;
                else if (filter == 1) val = (xVal + a) & 0xFF;
                else if (filter == 2) val = (xVal + b) & 0xFF;
                else if (filter == 3) val = (xVal + (a + b) / 2) & 0xFF;
                else if (filter == 4) {
                    int p = a + b - c;
                    int pa = Math.abs(p - a);
                    int pb = Math.abs(p - b);
                    int pc = Math.abs(p - c);
                    int pr = (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c);
                    val = (xVal + pr) & 0xFF;
                }
                currRow[i] = (byte) val;
                decoded[decOffset + i] = (byte) val;
            }
            prevRow = currRow;
        }

        StringBuilder sb = new StringBuilder();
        sb.append(String.format("IMAGE %s: %dx%d\n", file.getName(), width, height));

        // Scan row by row at x=100, x=393, x=650
        for (int y = 0; y < height; y += 10) {
            int offL = (y * width + 100) * bpp;
            int offC = (y * width + 393) * bpp;
            int offR = (y * width + 650) * bpp;

            int rC = decoded[offC] & 0xFF, gC = decoded[offC+1] & 0xFF, bC = decoded[offC+2] & 0xFF;
            int rL = decoded[offL] & 0xFF, gL = decoded[offL+1] & 0xFF, bL = decoded[offL+2] & 0xFF;
            int rR = decoded[offR] & 0xFF, gR = decoded[offR+1] & 0xFF, bR = decoded[offR+2] & 0xFF;

            // Highlight interesting lines
            // White boxes, purple buttons, borders
            if (rC < 250 || rL < 250 || rR < 250) {
                sb.append(String.format("y=%4d | L:(%3d,%3d,%3d) C:(%3d,%3d,%3d) R:(%3d,%3d,%3d)\n",
                        y, rL, gL, bL, rC, gC, bC, rR, gR, bR));
            }
        }

        org.junit.Assert.fail(sb.toString());
    }
}