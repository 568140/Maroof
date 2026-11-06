# Keep the JavaScript bridge methods callable from WebView.
-keepclassmembers class com.maarouf.app.MainActivity {
    @android.webkit.JavascriptInterface <methods>;
}
