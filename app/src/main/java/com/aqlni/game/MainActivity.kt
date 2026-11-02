package com.aqlni.game

import android.annotation.SuppressLint
import android.app.AlertDialog
import android.content.Context
import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.media.AudioManager
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.speech.tts.TextToSpeech
import android.view.WindowManager
import android.webkit.JavascriptInterface
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import androidx.webkit.WebViewAssetLoader

/**
 * عقلني — native Android shell.
 *
 * The whole game lives in `assets/` and is served to the WebView over a
 * stable HTTPS origin (appassets.androidplatform.net) through
 * [WebViewAssetLoader]. This gives the game reliable localStorage
 * persistence, full RTL Arabic rendering, and keeps everything offline.
 *
 * The Kotlin layer provides:
 *  - Arabic text-to-speech through the system engine (with audio focus)
 *  - Haptic feedback
 *  - Android hardware back-button routing (delegated to the game router,
 *    with a native exit dialog as fallback)
 *  - Correct lifecycle handling (WebView pause/resume, TTS shutdown)
 */
class MainActivity : ComponentActivity() {

    private lateinit var webView: WebView
    private var tts: TextToSpeech? = null

    @Volatile
    private var ttsReady = false

    private var audioManager: AudioManager? = null
    private var focusRequest: AudioFocusRequest? = null
    private val mainHandler = Handler(Looper.getMainLooper())

    /** Requested only while the system TTS speaks, so background audio ducks. */
    private fun requestAudioFocus() {
        if (focusRequest == null) {
            val attrs = AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_MEDIA)
                .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                .build()
            focusRequest = AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK)
                .setAudioAttributes(attrs)
                .build()
        }
        audioManager?.requestAudioFocus(focusRequest!!)
    }

    private fun abandonAudioFocus() {
        focusRequest?.let { audioManager?.abandonAudioFocusRequest(it) }
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        audioManager = getSystemService(Context.AUDIO_SERVICE) as AudioManager

        webView = WebView(this)
        setContentView(webView)
        webView.setBackgroundColor(0xFF6D28D9.toInt()) // matches splash background: no white flash

        with(webView.settings) {
            javaScriptEnabled = true
            domStorageEnabled = true
            mediaPlaybackRequiresUserGesture = false
            allowFileAccess = true
            setSupportZoom(false)
            textZoom = 100
            cacheMode = WebSettings.LOAD_DEFAULT
            javaScriptCanOpenWindowsAutomatically = false
        }

        val assetLoader = WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()

        webView.webViewClient = object : WebViewClient() {
            override fun shouldInterceptRequest(
                view: WebView,
                request: WebResourceRequest
            ): WebResourceResponse? = assetLoader.shouldInterceptRequest(request.url)

            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                // Child safety: every URL outside our own bundled assets is blocked.
                return !request.url.toString().startsWith("https://appassets.androidplatform.net/")
            }
        }

        webView.addJavascriptInterface(Bridge(), "AqApp")
        webView.loadUrl("https://appassets.androidplatform.net/assets/index.html")

        // Arabic speech system. The listener fires asynchronously and updates
        // the game layer; without an Arabic engine the game falls back to its
        // own degradations gracefully.
        tts = TextToSpeech(applicationContext) { status ->
            ttsReady = status == TextToSpeech.SUCCESS
            if (ttsReady) {
                try {
                    tts?.language = java.util.Locale("ar")
                } catch (_: Exception) {
                    // Engine without Arabic data: keep the system default voice.
                }
            }
            mainHandler.post { dispatchTtsState(ttsReady) }
        }

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                handleBackButton()
            }
        })
    }

    /**
     * Hardware / gesture back button.
     * The game router consumes the event (item screens -> their parent menu,
     * games -> pause menu, main menu -> themed exit dialog). Only if the web
     * layer has not taken over yet do we show the native fallback dialog.
     */
    private fun handleBackButton() {
        webView.evaluateJavascript(
            "window.__handleBack ? String(window.__handleBack()) : 'false'"
        ) { result ->
            val consumed = result?.trim() == "\"true\""
            if (!consumed) {
                mainHandler.post { showNativeExitDialog() }
            }
        }
    }

    private fun showNativeExitDialog() {
        AlertDialog.Builder(this)
            .setTitle(getString(R.string.exit_title))
            .setMessage(getString(R.string.exit_message))
            .setPositiveButton(getString(R.string.exit_button)) { _, _ -> finishAffinity() }
            .setNegativeButton(getString(R.string.continue_button), null)
            .setCancelable(true)
            .show()
    }

    private fun dispatchTtsState(ready: Boolean) {
        webView.evaluateJavascript("window.__ttsState && window.__ttsState($ready)", null)
    }

    // ------------------------------------------------------------------ //
    // JavaScript bridge. Bridge methods run on a WebView thread (never the
    // main thread), so every UI/speech call is marshalled explicitly.
    // ------------------------------------------------------------------ //
    private inner class Bridge {
        @JavascriptInterface
        fun appVersion(): String = BuildConfig.VERSION_NAME

        @JavascriptInterface
        fun ttsSpeak(text: String, rate: Double, pitch: Double) {
            mainHandler.post {
                val engine = tts
                if (!ttsReady || engine == null) return@post
                requestAudioFocus()
                engine.setSpeechRate(rate.toFloat())
                engine.setPitch(pitch.toFloat())
                engine.speak(
                    text,
                    TextToSpeech.QUEUE_FLUSH,
                    null,
                    "aqlni_${System.currentTimeMillis()}"
                )
            }
        }

        @JavascriptInterface
        fun ttsStop() {
            mainHandler.post {
                tts?.stop()
                abandonAudioFocus()
            }
        }

        @JavascriptInterface
        fun vibrate(ms: Long) {
            // Coercing keeps haptics short and battery-friendly.
            val effect = VibrationEffect.createOneShot(ms.coerceIn(10, 150), -1)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                val manager = getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as? VibratorManager
                manager?.defaultVibrator?.vibrate(effect)
            } else {
                @Suppress("DEPRECATION")
                val vibrator = getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
                vibrator?.vibrate(effect)
            }
        }

        @JavascriptInterface
        fun keepScreenOn(on: Boolean) {
            mainHandler.post {
                if (on) window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
                else window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
            }
        }

        /** Finishes the activity; progress is already saved after each change. */
        @JavascriptInterface
        fun exitApp() {
            mainHandler.post {
                finishAffinity()
            }
        }
    }

    // ------------------------------------------------------------------ //
    // Android lifecycle: pause gameplay audio & WebView timers off-screen,
    // resume on return. All saved progress lives in localStorage and is
    // written on every state change, so closing the app never loses it.
    // ------------------------------------------------------------------ //
    override fun onPause() {
        super.onPause()
        tts?.stop()
        abandonAudioFocus()
        webView.onPause()
    }

    override fun onResume() {
        super.onResume()
        webView.onResume()
    }

    override fun onDestroy() {
        tts?.shutdown()
        tts = null
        abandonAudioFocus()
        webView.destroy()
        super.onDestroy()
    }
}
