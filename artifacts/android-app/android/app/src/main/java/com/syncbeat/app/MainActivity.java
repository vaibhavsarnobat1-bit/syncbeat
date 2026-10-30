package com.syncbeat.app;

import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.view.WindowManager;
import android.webkit.WebSettings;

import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.BridgeActivity;

/**
 * SyncBeat wrapper activity.
 *
 * Responsibilities beyond the stock Capacitor BridgeActivity:
 *  1. True full-screen / edge-to-edge (immersive: status + nav bars hidden, swipe to reveal).
 *  2. Draw under display cutouts so there are no letterbox bars on notched phones.
 *  3. Dark window background (#060708) to kill the white flash while the remote site loads.
 *  4. Hardware/gesture back walks WebView history first; at the site root the task is only
 *     backgrounded (moveTaskToBack) instead of finished, which keeps the process — and any
 *     playing WebView audio — alive for a later resume.
 *  5. Re-assert inline media playback settings (Capacitor already disables the user-gesture
 *     requirement in Bridge.java, this pins it in place across Capacitor upgrades).
 */
public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        getWindow().setStatusBarColor(Color.parseColor("#060708"));
        getWindow().setNavigationBarColor(Color.parseColor("#060708"));

        // Edge-to-edge + immersive full screen.
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        WindowInsetsControllerCompat controller =
                WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        controller.setSystemBarsBehavior(
                WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
        controller.hide(WindowInsetsCompat.Type.systemBars());

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            WindowManager.LayoutParams lp = getWindow().getAttributes();
            lp.layoutInDisplayCutoutMode =
                    WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
            getWindow().setAttributes(lp);
        }
    }

    @Override
    public void onResume() {
        super.onResume();
        // Re-hide bars: some OEMs/IME flows restore them after a pause.
        WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView())
                .hide(WindowInsetsCompat.Type.systemBars());

        if (getBridge() != null && getBridge().getWebView() != null) {
            getBridge().getWebView().setBackgroundColor(Color.parseColor("#060708"));
            WebSettings settings = getBridge().getWebView().getSettings();
            settings.setMediaPlaybackRequiresUserGesture(false); // YouTube iframe autoplays/streams inline
            settings.setDomStorageEnabled(true);
            settings.setJavaScriptEnabled(true);
            settings.setJavaScriptCanOpenWindowsAutomatically(true);
            settings.setSupportMultipleWindows(false);
        }
    }

    @Override
    public void onBackPressed() {
        if (getBridge() != null
                && getBridge().getWebView() != null
                && getBridge().getWebView().canGoBack()) {
            getBridge().getWebView().goBack();
            return;
        }
        // Background the task rather than finishing it so audio can keep playing and the
        // next launch resumes the room instantly. (System may still reclaim memory later.)
        moveTaskToBack(true);
    }
}
