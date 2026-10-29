package com.youssefmohamed.googletaskspro

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.webkit.WebView
import androidx.annotation.Keep

@Keep
class MainActivity : TauriActivity() {
  private var activeWebView: WebView? = null
  private var pendingAuthUrl: String? = null

  companion object {
    var instance: MainActivity? = null

    @Keep
    @JvmStatic
    fun openChooser(url: String) {
      instance?.let { activity ->
        activity.runOnUiThread {
          try {
            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url)).apply {
              addCategory(Intent.CATEGORY_BROWSABLE)
            }
            val chooser = Intent.createChooser(intent, "Sign in with browser").apply {
              addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            activity.startActivity(chooser)
          } catch (e: Exception) {
            e.printStackTrace()
          }
        }
      }
    }
  }

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    instance = this
    handleAuthIntent(intent)
  }

  override fun onWebViewCreate(webView: WebView) {
    super.onWebViewCreate(webView)
    this.activeWebView = webView
    pendingAuthUrl?.let { deliverAuthUrl(it) }
  }

  override fun onNewIntent(intent: Intent) {
    super.onNewIntent(intent)
    setIntent(intent)
    handleAuthIntent(intent)
  }

  private fun handleAuthIntent(intent: Intent?) {
    val data = intent?.data?.toString() ?: return
    if (data.contains("code=")) {
      deliverAuthUrl(data)
    }
  }

  private fun deliverAuthUrl(data: String) {
    pendingAuthUrl = data
    val webView = activeWebView ?: return
    runOnUiThread {
      val safeData = data.replace("\\", "\\\\").replace("'", "\\'")
      val js = """
        (function() {
          var url = '$safeData';
          if (window.__TAURI_HANDLE_DEEP_LINK__) {
            window.__TAURI_HANDLE_DEEP_LINK__(url);
          } else {
            window.__PENDING_DEEP_LINK__ = url;
            window.dispatchEvent(new CustomEvent('oauth-deep-link', { detail: url }));
          }
        })();
      """.trimIndent()
      webView.evaluateJavascript(js, null)
    }
  }

  override fun onDestroy() {
    if (instance == this) instance = null
    super.onDestroy()
  }
}
