# Minification is disabled for this app because the JavaScript to Kotlin
# bridge uses @JavascriptInterface reflection. These rules are kept for
# documentation and in case minification is enabled later.
-keepclassmembers class com.aqlni.game.MainActivity$Bridge {
    @android.webkit.JavascriptInterface <methods>;
}
-keepattributes JavascriptInterface
