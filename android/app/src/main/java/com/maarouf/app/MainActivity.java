package com.maarouf.app;

import android.Manifest;
import android.app.Activity;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.os.Bundle;
import android.provider.ContactsContract;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebChromeClient;

import androidx.webkit.WebViewAssetLoader;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

public class MainActivity extends Activity {
    private static final int CONTACTS_PERMISSION_REQUEST = 1001;
    private WebView webView;
    private WebViewAssetLoader assetLoader;
    private boolean waitingForContacts = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        webView = new WebView(this);
        setContentView(webView);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setCacheMode(WebSettings.LOAD_NO_CACHE);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setMediaPlaybackRequiresUserGesture(true);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        webView.setBackgroundColor(android.graphics.Color.WHITE);
        webView.setWebChromeClient(new WebChromeClient());
        assetLoader = new WebViewAssetLoader.Builder()
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                return assetLoader.shouldInterceptRequest(request.getUrl());
            }

            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, String url) {
                return assetLoader.shouldInterceptRequest(android.net.Uri.parse(url));
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                installJavascriptBridge();
            }
        });
        webView.addJavascriptInterface(new ContactsBridge(), "AndroidContacts");
        // Load the compiled UI bundled in this APK. The app only receives UI
        // changes when a new APK is released; the native bridge remains
        // available for Android contact synchronization.
        webView.loadUrl("https://appassets.androidplatform.net/assets/index.html");
    }

    private void installJavascriptBridge() {
        String script = "window.MaaroufAndroid={readContacts:function(){return new Promise(function(resolve,reject){window.__maaroufContactResolve=resolve;window.__maaroufContactReject=reject;AndroidContacts.readContacts();});}};";
        webView.evaluateJavascript(script, null);
    }

    private void sendContactsToJavascript(final String contactsJson) {
        runOnUiThread(() -> {
            String encodedJson = JSONObject.quote(contactsJson);
            String script = "window.__maaroufContactResolve && window.__maaroufContactResolve(JSON.parse(" + encodedJson + "));";
            webView.evaluateJavascript(script, null);
        });
    }

    private void sendErrorToJavascript(final String message) {
        runOnUiThread(() -> {
            String encodedMessage = JSONObject.quote(message);
            String script = "window.__maaroufContactReject && window.__maaroufContactReject(new Error(" + encodedMessage + "));";
            webView.evaluateJavascript(script, null);
        });
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == CONTACTS_PERMISSION_REQUEST && waitingForContacts) {
            waitingForContacts = false;
            if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                readContacts();
            } else {
                sendErrorToJavascript("تم رفض إذن قراءة جهات الاتصال");
            }
        }
    }

    private void readContacts() {
        JSONArray contacts = new JSONArray();
        Cursor cursor = null;
        try {
            cursor = getContentResolver().query(
                    ContactsContract.CommonDataKinds.Phone.CONTENT_URI,
                    new String[]{
                            ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME,
                            ContactsContract.CommonDataKinds.Phone.NUMBER
                    },
                    null,
                    null,
                    ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME + " COLLATE LOCALIZED ASC"
            );
            if (cursor != null) {
                while (cursor.moveToNext()) {
                    String name = cursor.getString(0);
                    String phone = cursor.getString(1);
                    if (phone == null || phone.trim().isEmpty()) continue;
                    JSONObject item = new JSONObject();
                    item.put("name", name == null || name.trim().isEmpty() ? "جهة اتصال" : name.trim());
                    item.put("phone", phone.trim());
                    contacts.put(item);
                }
            }
            sendContactsToJavascript(contacts.toString());
        } catch (Exception error) {
            sendErrorToJavascript("تعذر قراءة جهات الاتصال: " + error.getMessage());
        } finally {
            if (cursor != null) cursor.close();
        }
    }

    public class ContactsBridge {
        @JavascriptInterface
        public void readContacts() {
            if (android.os.Build.VERSION.SDK_INT >= 23 && checkSelfPermission(Manifest.permission.READ_CONTACTS) != PackageManager.PERMISSION_GRANTED) {
                waitingForContacts = true;
                requestPermissions(new String[]{Manifest.permission.READ_CONTACTS}, CONTACTS_PERMISSION_REQUEST);
                return;
            }
            MainActivity.this.readContacts();
        }
    }
}
