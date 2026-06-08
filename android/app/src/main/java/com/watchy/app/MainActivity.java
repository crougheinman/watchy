package com.watchy.app;

import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        WebView webView = getBridge().getWebView();
        WebSettings settings = webView.getSettings();

        // Let the embedded player start video without an extra gesture
        // (autoPlay=true is passed to the iframe).
        settings.setMediaPlaybackRequiresUserGesture(false);

        // Allow the https embed to pull mixed (http) media segments.
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
    }
}
