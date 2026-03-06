package com.example.nextgen_pds_kiosk.ui.screens

import android.Manifest
import android.content.pm.PackageManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.core.*
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowForward
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.MicOff
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.*
import com.example.nextgen_pds_kiosk.voice.AppIntent
import java.util.Locale
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import androidx.hilt.navigation.compose.hiltViewModel
import com.example.nextgen_pds_kiosk.R
import com.example.nextgen_pds_kiosk.ui.components.VoiceDebugDialog
import com.example.nextgen_pds_kiosk.ui.theme.*
import com.example.nextgen_pds_kiosk.viewmodel.WelcomeViewModel

@OptIn(androidx.compose.foundation.ExperimentalFoundationApi::class)
@Composable
fun WelcomeScreen(
    onNavigateNext: () -> Unit,
    onNavigateAdmin: () -> Unit,
    viewModel: WelcomeViewModel = hiltViewModel()
) {
    val dbCount by viewModel.beneficiaryCount.collectAsState()
    val context = LocalContext.current

    var hasAudioPermission by remember {
        mutableStateOf(
            ContextCompat.checkSelfPermission(context, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED
        )
    }

    val permissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission()
    ) { isGranted -> hasAudioPermission = isGranted }

    LaunchedEffect(Unit) {
        if (!hasAudioPermission) permissionLauncher.launch(Manifest.permission.RECORD_AUDIO)
    }

    var hasGreeted by remember { mutableStateOf(false) }
    val isTtsReady by viewModel.voiceManager.isTtsReadyState.collectAsState()

    LaunchedEffect(hasAudioPermission, isTtsReady) {
        if (hasAudioPermission && isTtsReady && !hasGreeted) {
            hasGreeted = true
            viewModel.voiceManager.speak("Welcome to Smart PDS Kiosk. Please say Start or tap the screen to begin.")
        }
    }

    val isListening by viewModel.voiceManager.isListening.collectAsState()
    val chatHistory by viewModel.voiceManager.chatHistory.collectAsState()
    val currentIntent by viewModel.voiceManager.currentIntent.collectAsState()
    val currentLocale by viewModel.voiceManager.currentLocale.collectAsState()
    var showChatDialog by remember { mutableStateOf(false) }

    LaunchedEffect(currentIntent) {
        when (currentIntent) {
            AppIntent.NAVIGATE_NEXT -> onNavigateNext()
            AppIntent.OPEN_ADMIN   -> onNavigateAdmin()
            else -> {}
        }
    }

    DisposableEffect(Unit) {
        onDispose { viewModel.voiceManager.onLeavingScreen() }
    }

    if (showChatDialog) {
        VoiceDebugDialog(
            chatHistory = chatHistory,
            isListening = isListening,
            onDismissRequest = { showChatDialog = false }
        )
    }

    // Pulsing animation for mic ring
    val infiniteTransition = rememberInfiniteTransition(label = "mic_pulse")
    val micPulse by infiniteTransition.animateFloat(
        initialValue = 1f,
        targetValue = if (isListening) 1.25f else 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(800, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "mic_scale"
    )
    val micAlpha by infiniteTransition.animateFloat(
        initialValue = 0.4f,
        targetValue = if (isListening) 0.9f else 0.4f,
        animationSpec = infiniteRepeatable(
            animation = tween(800),
            repeatMode = RepeatMode.Reverse
        ),
        label = "mic_alpha"
    )

    Box(modifier = Modifier.fillMaxSize().background(DarkBackground)) {

        // Background radial glow — top center (no external libs, just a Box)
        Box(
            modifier = Modifier
                .align(Alignment.TopCenter)
                .size(600.dp)
                .offset(y = (-150).dp)
                .background(
                    brush = Brush.radialGradient(
                        colors = listOf(
                            PrimaryAccent.copy(alpha = 0.08f),
                            Color.Transparent
                        )
                    )
                )
        )

        // ── Admin settings button (top-right) ──
        IconButton(
            onClick = onNavigateAdmin,
            modifier = Modifier
                .align(Alignment.TopEnd)
                .padding(28.dp)
                .size(44.dp)
                .background(SurfaceVariant.copy(alpha = 0.6f), RoundedCornerShape(12.dp))
                .border(1.dp, PrimaryAccent.copy(alpha = 0.2f), RoundedCornerShape(12.dp))
        ) {
            Icon(
                imageVector = Icons.Default.Settings,
                contentDescription = "Admin Settings",
                tint = TextSecondary,
                modifier = Modifier.size(22.dp)
            )
        }
        
        // ── Language Selector (top-left) ──
        Row(
            modifier = Modifier
                .align(Alignment.TopStart)
                .padding(28.dp)
                .background(SurfaceVariant.copy(alpha = 0.6f), RoundedCornerShape(16.dp))
                .border(1.dp, PrimaryAccent.copy(alpha = 0.2f), RoundedCornerShape(16.dp))
                .padding(4.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            val languages = listOf("en" to "EN", "hi" to "HI", "ta" to "TA")
            languages.forEach { (langCode, label) ->
                val isSelected = currentLocale.language == langCode
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(12.dp))
                        .background(if (isSelected) PrimaryAccent.copy(alpha = 0.2f) else Color.Transparent)
                        .clickable {
                            val newLocale = Locale(langCode)
                            viewModel.voiceManager.setLanguage(newLocale)
                            // Acknowledge change via TTS specifically in the new language
                            val msg = when (langCode) {
                                "hi" -> "Hindi shuru"
                                "ta" -> "Tamil arambam"
                                else -> "English selected"
                            }
                            viewModel.voiceManager.speak(msg)
                        }
                        .padding(horizontal = 12.dp, vertical = 8.dp)
                ) {
                    Text(
                        text = label,
                        color = if (isSelected) PrimaryAccent else TextSecondary.copy(alpha = 0.6f),
                        style = MaterialTheme.typography.labelLarge.copy(fontWeight = FontWeight.Bold)
                    )
                }
            }
        }

        // ── Main Content ──
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 48.dp),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally
        ) {

            // Logo with subtle glow ring
            Box(contentAlignment = Alignment.Center) {
                // Outer glow ring
                Box(
                    modifier = Modifier
                        .size(160.dp)
                        .background(
                            brush = Brush.radialGradient(
                                colors = listOf(
                                    PrimaryAccent.copy(alpha = 0.18f),
                                    Color.Transparent
                                )
                            ),
                            shape = CircleShape
                        )
                )
                Icon(
                    painter = painterResource(id = R.drawable.ic_launcher_foreground),
                    contentDescription = "App Logo",
                    modifier = Modifier
                        .size(100.dp)
                        .combinedClickable(
                            onClick = onNavigateNext,
                            onLongClick = { showChatDialog = true }
                        ),
                    tint = PrimaryAccent
                )
            }

            Spacer(modifier = Modifier.height(32.dp))

            // Headline
            Text(
                text = "Smart PDS Kiosk",
                style = MaterialTheme.typography.displayMedium.copy(
                    fontWeight = FontWeight.ExtraBold,
                    color = TextPrimary,
                    letterSpacing = 1.sp
                ),
                textAlign = TextAlign.Center
            )

            Spacer(modifier = Modifier.height(12.dp))

            // Accent divider line
            Box(
                modifier = Modifier
                    .width(80.dp)
                    .height(3.dp)
                    .background(
                        brush = Brush.horizontalGradient(
                            colors = listOf(Color.Transparent, PrimaryAccent, SecondaryAccent, Color.Transparent)
                        ),
                        shape = RoundedCornerShape(50)
                    )
            )

            Spacer(modifier = Modifier.height(20.dp))

            Text(
                text = "Next-Gen Public Distribution System",
                style = MaterialTheme.typography.titleMedium.copy(
                    color = TextSecondary,
                    letterSpacing = 0.5.sp
                ),
                textAlign = TextAlign.Center
            )

            Spacer(modifier = Modifier.height(56.dp))

            // ── START Button with gradient ──
            Box(
                modifier = Modifier
                    .clip(RoundedCornerShape(36.dp))
                    .background(
                        brush = Brush.horizontalGradient(
                            colors = listOf(PrimaryAccent, SecondaryAccent)
                        )
                    )
                    .border(1.dp, PrimaryAccent.copy(alpha = 0.5f), RoundedCornerShape(36.dp))
                    .clickable(onClick = onNavigateNext)
                    .padding(horizontal = 56.dp, vertical = 22.dp),
                contentAlignment = Alignment.Center
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = "START",
                        style = MaterialTheme.typography.headlineMedium.copy(
                            fontWeight = FontWeight.ExtraBold,
                            color = DarkBackground,
                            letterSpacing = 3.sp
                        )
                    )
                    Spacer(modifier = Modifier.width(16.dp))
                    Icon(
                        imageVector = Icons.Default.ArrowForward,
                        contentDescription = null,
                        tint = DarkBackground,
                        modifier = Modifier.size(28.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            // Voice hint text
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    imageVector = if (isListening) Icons.Default.Mic else Icons.Default.MicOff,
                    contentDescription = null,
                    tint = if (isListening) PrimaryAccent else TextSecondary.copy(alpha = 0.5f),
                    modifier = Modifier.size(16.dp)
                )
                Spacer(modifier = Modifier.width(6.dp))
                Text(
                    text = if (isListening) "Listening… say \"Start\"" else "Tap mic to activate voice",
                    style = MaterialTheme.typography.bodyMedium.copy(
                        color = if (isListening) PrimaryAccent.copy(alpha = 0.8f) else TextSecondary.copy(alpha = 0.5f)
                    )
                )
            }
        }

        // ── Bottom Footer ──
        Text(
            text = "NextGen PDS v1.0  •  Offline Mode",
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .padding(bottom = 24.dp),
            style = MaterialTheme.typography.bodySmall.copy(
                color = TextSecondary.copy(alpha = 0.35f),
                letterSpacing = 1.sp
            )
        )

        // ── DB Status pill (bottom-left) ──
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier
                .align(Alignment.BottomStart)
                .padding(start = 24.dp, bottom = 24.dp)
                .background(SurfaceColor.copy(alpha = 0.85f), RoundedCornerShape(50.dp))
                .border(1.dp, SuccessGreen.copy(alpha = 0.3f), RoundedCornerShape(50.dp))
                .padding(horizontal = 16.dp, vertical = 8.dp)
        ) {
            Box(modifier = Modifier.size(8.dp).background(SuccessGreen, CircleShape))
            Spacer(modifier = Modifier.width(8.dp))
            Text(
                text = "DB Active · $dbCount enrolled",
                color = TextSecondary,
                style = MaterialTheme.typography.bodySmall.copy(letterSpacing = 0.5.sp)
            )
        }

        // ── Pulsing Mic FAB (bottom-right) ──
        Box(
            modifier = Modifier
                .align(Alignment.BottomEnd)
                .padding(28.dp)
        ) {
            // Pulse ring
            if (isListening) {
                Box(
                    modifier = Modifier
                        .size(64.dp)
                        .scale(micPulse)
                        .background(PrimaryAccent.copy(alpha = micAlpha * 0.3f), CircleShape)
                        .align(Alignment.Center)
                )
            }
            FloatingActionButton(
                onClick = { showChatDialog = true },
                containerColor = if (isListening) PrimaryAccent else SurfaceVariant,
                contentColor = if (isListening) DarkBackground else PrimaryAccent,
                modifier = Modifier.size(56.dp)
            ) {
                Icon(
                    imageVector = if (isListening) Icons.Default.Mic else Icons.Default.MicOff,
                    contentDescription = "Voice Logs",
                    modifier = Modifier.size(24.dp)
                )
            }
        }
    }
}
