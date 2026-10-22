package com.abyssalgame.abyssal;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        /* v621 : copie du jeu pour les mises à jour à distance (js/live.js) */
        registerPlugin(LiveCopyPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
