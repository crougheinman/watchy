package com.watchy.app;

import android.net.Uri;
import android.os.Bundle;
import android.os.Message;
import android.util.Log;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;

import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebChromeClient;
import com.getcapacitor.BridgeWebViewClient;

import java.io.ByteArrayInputStream;
import java.util.Arrays;
import java.util.List;

public class MainActivity extends BridgeActivity {

    private static final String TAG = "AdShield";

    /**
     * Ad / tracker / pop-up host fragments. Any request whose host ends with one
     * of these is answered with an empty response, so the embedded player can't
     * load its ad scripts, banners, or pop-under triggers. The streaming
     * providers themselves are NOT in this list, so playback is unaffected.
     */
    private static final List<String> AD_HOSTS = Arrays.asList(
        "doubleclick.net", "googlesyndication.com", "googleadservices.com",
        "google-analytics.com", "googletagmanager.com", "googletagservices.com",
        "adservice.google.com", "adnxs.com", "amazon-adsystem.com",
        "popads.net", "popcash.net", "propellerads.com", "propu.sh",
        "exoclick.com", "exosrv.com", "juicyads.com", "adsterra.com",
        "hilltopads.net", "hilltopads.com", "onclickads.net", "onclckds.com",
        "mgid.com", "taboola.com", "outbrain.com", "trafficjunky.net",
        "popunder.net", "pushwoosh.com", "clickadu.com", "adcash.com",
        "a-ads.com", "admaven.com", "ad-maven.com", "yllix.com",
        "revcontent.com", "bidvertiser.com", "media.net", "smartadserver.com"
    );

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        final Bridge bridge = getBridge();
        WebView webView = bridge.getWebView();
        WebSettings settings = webView.getSettings();

        // Let the embedded player start video without an extra gesture
        // (autoPlay=true is passed to the iframe).
        settings.setMediaPlaybackRequiresUserGesture(false);

        // Allow the https embed to pull mixed (http) media segments.
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);

        // Route pop-up attempts through onCreateWindow (below) so we can deny
        // them, and never let scripts open windows without a user gesture.
        settings.setSupportMultipleWindows(true);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);

        // --- Ad Shield: block pop-up windows -------------------------------
        webView.setWebChromeClient(new BridgeWebChromeClient(bridge) {
            @Override
            public boolean onCreateWindow(WebView view, boolean isDialog,
                                          boolean isUserGesture, Message resultMsg) {
                // Deny the pop-up / pop-under entirely.
                Log.i(TAG, "Blocked pop-up window request");
                return false;
            }
        });

        // --- Ad Shield: block redirect-jacks + ad requests -----------------
        webView.setWebViewClient(new BridgeWebViewClient(bridge) {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                // Only the player runs in sub-frames; let those load freely.
                // A main-frame navigation away from the app is a redirect-jack —
                // swallow it instead of opening an ad page or the system browser.
                if (request.isForMainFrame() && !isAppUrl(request.getUrl())) {
                    Log.i(TAG, "Blocked main-frame navigation: " + request.getUrl());
                    return true;
                }
                return super.shouldOverrideUrlLoading(view, request);
            }

            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                String host = request.getUrl().getHost();
                if (host != null && isAdHost(host)) {
                    return new WebResourceResponse(
                        "text/plain", "utf-8", new ByteArrayInputStream(new byte[0]));
                }
                // Defer to Capacitor (it serves the local app via this hook).
                return super.shouldInterceptRequest(view, request);
            }
        });
    }

    /** True for the app's own content (Capacitor local server / internal schemes). */
    private boolean isAppUrl(Uri uri) {
        if (uri == null) return true;
        String scheme = uri.getScheme();
        if (scheme == null) return true;
        scheme = scheme.toLowerCase();
        if (scheme.equals("file") || scheme.equals("data") || scheme.equals("blob")
            || scheme.equals("about") || scheme.equals("javascript")
            || scheme.equals("capacitor")) {
            return true;
        }
        String host = uri.getHost();
        return host != null && host.equalsIgnoreCase("localhost");
    }

    private boolean isAdHost(String host) {
        host = host.toLowerCase();
        for (String bad : AD_HOSTS) {
            if (host.equals(bad) || host.endsWith("." + bad)) {
                return true;
            }
        }
        return false;
    }
}
