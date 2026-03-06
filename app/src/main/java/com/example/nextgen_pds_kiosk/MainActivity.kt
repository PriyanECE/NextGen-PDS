package com.example.nextgen_pds_kiosk

import android.Manifest
import android.content.pm.PackageManager
import android.os.Bundle
import android.util.Log
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.ui.Modifier
import androidx.core.content.ContextCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import com.example.nextgen_pds_kiosk.kiosk.CrashRestartHandler
import com.example.nextgen_pds_kiosk.kiosk.KioskLockManager
import com.example.nextgen_pds_kiosk.navigation.KioskNavHost
import com.example.nextgen_pds_kiosk.ui.particles.AnimatedParticleBackground
import com.example.nextgen_pds_kiosk.ui.theme.NextGenPDS_KioskTheme
import com.example.nextgen_pds_kiosk.voice.VoiceManager
import dagger.hilt.android.AndroidEntryPoint
import javax.inject.Inject

@AndroidEntryPoint
class MainActivity : ComponentActivity() {

    @Inject
    lateinit var kioskLockManager: KioskLockManager

    @Inject
    lateinit var voiceManager: VoiceManager

    // Runtime permission launcher for RECORD_AUDIO
    private val requestMicPermission =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
            if (granted) {
                Log.i("MainActivity", "RECORD_AUDIO granted — starting voice listener")
                voiceManager.onPermissionGranted()
            } else {
                Log.w("MainActivity", "RECORD_AUDIO denied — voice assistant will not work")
            }
        }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // 1. Install Watchdog Crash Handler
        CrashRestartHandler.install(this)

        // 2. Immersive Fullscreen (Hide Status Bar & Nav Bar)
        val windowInsetsController = WindowCompat.getInsetsController(window, window.decorView)
        windowInsetsController.systemBarsBehavior =
            WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
        windowInsetsController.hide(WindowInsetsCompat.Type.systemBars())

        enableEdgeToEdge()

        // 3. Request RECORD_AUDIO at runtime (required on Android 6+)
        when {
            ContextCompat.checkSelfPermission(
                this, Manifest.permission.RECORD_AUDIO
            ) == PackageManager.PERMISSION_GRANTED -> {
                // Already granted — start listening immediately
                Log.i("MainActivity", "RECORD_AUDIO already granted — starting voice listener")
                voiceManager.onPermissionGranted()
            }
            else -> {
                // Ask the user — kiosk devices are usually pre-granted but we must request it
                requestMicPermission.launch(Manifest.permission.RECORD_AUDIO)
            }
        }

        setContent {
            NextGenPDS_KioskTheme(darkTheme = true, dynamicColor = false) {
                // We layer the NavHost ON TOP of the AnimatedParticleBackground
                // so the background seamlessly persists across route changes
                Box(modifier = Modifier.fillMaxSize()) {
                    // Base Layer: Particles
                    AnimatedParticleBackground()

                    // Top Layer: Navigation Content
                    KioskNavHost()
                }
            }
        }
    }

    override fun onResume() {
        super.onResume()
        // Pin to screen (Lock Task Mode) every time app resumes
        kioskLockManager.startLockTask(this)
    }

    // Attempt to block back presses at the Activity level just in case
    @Deprecated("Deprecated in Java", ReplaceWith("super.onBackPressed()"))
    override fun onBackPressed() {
        if (!kioskLockManager.isLocked.value) {
            super.onBackPressed()
        }
        // If locked, do nothing (block)
    }
}