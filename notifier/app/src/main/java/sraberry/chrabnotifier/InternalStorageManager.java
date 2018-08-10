package sraberry.chrabnotifier;

import android.content.Context;
import android.util.Log;

import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;

public class InternalStorageManager {

    public static void write(Context context, String filename, String content) {
        FileOutputStream outputStream;
        try {
            outputStream = context.openFileOutput(filename, Context.MODE_PRIVATE);
            outputStream.write(content.getBytes());
            outputStream.close();
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    private static boolean fileExists(Context context, String target) {
        String[] filenames = context.fileList();
        for (String filename : filenames) {
            if (filename.equals(target)) {
                return true;
            }
        }
        return false;
    }

    public static String read(Context context, String filename) {
        if (fileExists(context, filename)) {
            try {
                FileInputStream fileInputStream = context.openFileInput(filename);
                int size = fileInputStream.available();
                byte[] buffer = new byte[size];
                int sizeRead = fileInputStream.read(buffer);
                Log.d("InternalStorage", "Read " + sizeRead + " bytes");
                fileInputStream.close();
                return new String(buffer, StandardCharsets.UTF_8);
            } catch (IOException e) {
                e.printStackTrace();
            }
        }
        return "";
    }

}
