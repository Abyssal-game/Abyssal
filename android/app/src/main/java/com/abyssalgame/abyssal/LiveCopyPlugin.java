package com.abyssalgame.abyssal;

import android.content.res.AssetManager;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;

/**
 * v621 : mises à jour à distance sur Android (js/live.js).
 * Recopie le jeu en cours (le jeu embarqué dans l'application, dossier d'assets « public »,
 * ou une version déjà téléchargée) dans un dossier de l'appareil, pour n'y télécharger
 * ensuite que les fichiers changés. Sur iPhone, le plugin Filesystem fait cette copie ;
 * sur Android il ne sait pas lire le jeu embarqué.
 */
@CapacitorPlugin(name = "LiveCopy")
public class LiveCopyPlugin extends Plugin {

    @PluginMethod
    public void copy(PluginCall call) {
        String from = call.getString("from", "");
        String to = call.getString("to", "");
        if (to == null || to.isEmpty() || !to.startsWith(getContext().getFilesDir().getAbsolutePath())) {
            call.reject("destination invalide");
            return;
        }
        new Thread(() -> {
            try {
                File dest = new File(to);
                deleteAll(dest);
                if (from == null || from.isEmpty() || !from.startsWith("/")) {
                    copyAsset(getContext().getAssets(), from == null || from.isEmpty() ? "public" : from, dest);
                } else {
                    copyDir(new File(from), dest);
                }
                JSObject ret = new JSObject();
                ret.put("path", dest.getAbsolutePath());
                call.resolve(ret);
            } catch (Exception e) {
                call.reject("copie impossible : " + e.getMessage());
            }
        }).start();
    }

    private static void copyAsset(AssetManager am, String path, File dest) throws IOException {
        String[] list = am.list(path);
        if (list != null && list.length > 0) {
            if (!dest.isDirectory() && !dest.mkdirs()) throw new IOException("dossier " + dest);
            for (String name : list) copyAsset(am, path + "/" + name, new File(dest, name));
            return;
        }
        try (InputStream in = am.open(path)) {
            write(in, dest);
        }
    }

    private static void copyDir(File src, File dest) throws IOException {
        if (src.isDirectory()) {
            if (!dest.isDirectory() && !dest.mkdirs()) throw new IOException("dossier " + dest);
            File[] list = src.listFiles();
            if (list != null) for (File f : list) copyDir(f, new File(dest, f.getName()));
            return;
        }
        try (InputStream in = new FileInputStream(src)) {
            write(in, dest);
        }
    }

    private static void write(InputStream in, File dest) throws IOException {
        File parent = dest.getParentFile();
        if (parent != null && !parent.isDirectory()) parent.mkdirs();
        try (OutputStream out = new FileOutputStream(dest)) {
            byte[] buf = new byte[65536];
            int n;
            while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
        }
    }

    private static void deleteAll(File f) {
        if (f.isDirectory()) {
            File[] list = f.listFiles();
            if (list != null) for (File c : list) deleteAll(c);
        }
        f.delete();
    }
}
