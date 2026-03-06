package com.example.nextgen_pds_kiosk.ui.screens

import androidx.compose.animation.core.*
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Stop
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.draw.clip
import androidx.compose.material.icons.filled.Warning
import androidx.compose.foundation.background
import com.example.nextgen_pds_kiosk.ui.components.VisionCameraPreview
import com.example.nextgen_pds_kiosk.vision.VisionState
import com.google.accompanist.permissions.ExperimentalPermissionsApi
import com.google.accompanist.permissions.isGranted
import com.google.accompanist.permissions.rememberPermissionState
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.example.nextgen_pds_kiosk.voice.AppIntent
import com.example.nextgen_pds_kiosk.viewmodel.DispenserState
import com.example.nextgen_pds_kiosk.viewmodel.DispenserViewModel

@OptIn(ExperimentalPermissionsApi::class)
@Composable
fun DispensingScreen(
    viewModel: DispenserViewModel = hiltViewModel(),
    onNavigateNext: () -> Unit
) {
    // Intercept hardware back button to prevent escaping the active dispense loop
    androidx.activity.compose.BackHandler(true) {
        // Do nothing (block back navigation during active dispense)
    }

    // Real-time weight from ViewModel (polled from ESP8266 /status endpoint)
    val currentWeightKg by viewModel.currentWeightKg.collectAsState()
    val targetWeightKg  by viewModel.targetWeightKg.collectAsState()
    val uiState         by viewModel.uiState.collectAsState()

    // Safety Vision State
    var visionState by remember { mutableStateOf(VisionState.BAG_DETECTED) }

    // Camera Permission for Vision
    val cameraPermissionState = rememberPermissionState(
        permission = android.Manifest.permission.CAMERA
    )

    LaunchedEffect(Unit) {
        if (!cameraPermissionState.status.isGranted) {
            cameraPermissionState.launchPermissionRequest()
        }
    }

    // Safe progress — avoid divide-by-zero if target not yet set
    val progress = if (targetWeightKg > 0f) (currentWeightKg / targetWeightKg).coerceIn(0f, 1f) else 0f

    // Hardware control state
    var isPaused by remember { mutableStateOf(false) }

    // Voice assistant lifecycle for this screen
    val currentIntent by viewModel.voiceManager.currentIntent.collectAsState()
    DisposableEffect(Unit) {
        viewModel.voiceManager.startListening()
        onDispose { viewModel.onLeavingScreen() }
    }

    // Voice intent handling
    LaunchedEffect(currentIntent) {
        when (currentIntent) {
            AppIntent.PAUSE_DISPENSING -> {
                isPaused = true
                viewModel.pauseDispensing()
            }
            AppIntent.RESUME_DISPENSING -> {
                isPaused = false
                viewModel.resumeDispensing()
            }
            AppIntent.NAVIGATE_BACK -> { // Mapping voice "stop/go back" to stop dispensing
                viewModel.stopDispensing()
                onNavigateNext()
            }
            else -> {}
        }
    }

    // Auto-stop logic if safety rule violated
    LaunchedEffect(visionState) {
        if (uiState is DispenserState.Dispensing && !isPaused) {
            if (visionState == VisionState.HANDS_DETECTED || visionState == VisionState.NO_BAG) {
                // Instantly send the PAUSE command to the ESP8266 servo via the ViewModel API
                viewModel.pauseDispensing()
                isPaused = true
            }
        }
    }

    // Navigate to Completion when hardware finishes
    LaunchedEffect(uiState) {
        if (uiState is DispenserState.Completed) {
            onNavigateNext()
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(top = 48.dp, bottom = 48.dp, start = 32.dp, end = 32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {

        // Dispensing Header
        Text(
            text = "Dispensing...",
            style = MaterialTheme.typography.displayMedium.copy(
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onBackground
            )
        )

        Spacer(modifier = Modifier.height(16.dp))

        // Safety Status & Dynamic Camera Warning
        val warningText = when (visionState) {
            VisionState.HANDS_DETECTED -> "DANGER: Hands Detected! Motor PAUSED."
            VisionState.NO_BAG -> "WARNING: Bag Removed! Motor PAUSED."
            VisionState.BAG_DETECTED -> "Please do not remove the bag until the process is fully completed."
            VisionState.IDLE -> "Monitoring Area..."
        }
        
        val warningColor = when (visionState) {
            VisionState.HANDS_DETECTED, VisionState.NO_BAG -> Color.Red
            else -> com.example.nextgen_pds_kiosk.ui.theme.WarningYellow
        }

        Text(
            text = warningText,
            style = MaterialTheme.typography.titleLarge.copy(
                fontWeight = if (visionState != VisionState.BAG_DETECTED) FontWeight.Bold else FontWeight.Normal,
                color = warningColor
            ),
            textAlign = TextAlign.Center,
            modifier = Modifier.padding(horizontal = 32.dp)
        )

        Spacer(modifier = Modifier.height(24.dp))
        
        // Advanced Safety Vision Verification Camera Box (Small PIP size for continuous monitoring)
        Box(
            modifier = Modifier
                .size(160.dp)
                .clip(RoundedCornerShape(16.dp))
                .background(Color.Black),
            contentAlignment = Alignment.Center
        ) {
            if (cameraPermissionState.status.isGranted) {
                VisionCameraPreview(
                    modifier = Modifier.fillMaxSize(),
                    onVisionStateChanged = { newState ->
                        visionState = newState
                    }
                )
            } else {
                Icon(Icons.Default.Warning, contentDescription = "Camera Access Required", tint = Color.Yellow)
            }
        }

        Spacer(modifier = Modifier.height(32.dp))

        // Large 3D Progress Ring showing real load cell data
        Box(
            modifier = Modifier.size(340.dp),
            contentAlignment = Alignment.Center
        ) {

            // Background track
            Canvas(modifier = Modifier.fillMaxSize()) {
                drawArc(
                    color = Color.DarkGray,
                    startAngle = 0f,
                    sweepAngle = 360f,
                    useCenter = false,
                    style = Stroke(width = 24.dp.toPx(), cap = StrokeCap.Round)
                )
            }

            // Foreground animated progress
            val animatedProgress by animateFloatAsState(
                targetValue = progress,
                animationSpec = tween(durationMillis = 400, easing = LinearEasing),
                label = "progress_animation"
            )

            Canvas(modifier = Modifier.fillMaxSize()) {
                drawArc(
                    color = com.example.nextgen_pds_kiosk.ui.theme.PrimaryAccent,
                    startAngle = -90f,
                    sweepAngle = animatedProgress * 360f,
                    useCenter = false,
                    style = Stroke(width = 24.dp.toPx(), cap = StrokeCap.Round)
                )
            }

            // Central readouts — real weight from load cell
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(
                    text = String.format("%.2f", currentWeightKg),
                    style = MaterialTheme.typography.displayLarge.copy(
                        fontSize = 80.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = MaterialTheme.colorScheme.onBackground
                    )
                )
                Text(
                    text = "of ${String.format("%.1f", targetWeightKg)} kg",
                    style = MaterialTheme.typography.headlineLarge.copy(
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                )
                Text(
                    text = "Wheat",
                    style = MaterialTheme.typography.titleLarge.copy(
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.primary
                    ),
                    modifier = Modifier.padding(top = 8.dp)
                )
            }
        }

        Spacer(modifier = Modifier.height(80.dp))

        // Progress percentage readout
        Text(
            text = String.format("%.0f%%", progress * 100),
            style = MaterialTheme.typography.displayMedium.copy(
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onSurface
            )
        )

        Spacer(modifier = Modifier.height(48.dp))

        // Transport Controls — always visible (Pause/Resume & Stop)
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceEvenly,
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Pause / Resume Button
            Button(
                onClick = {
                    isPaused = !isPaused
                    if (isPaused) viewModel.pauseDispensing() else viewModel.resumeDispensing()
                },
                modifier = Modifier
                    .weight(1f)
                    .height(64.dp)
                    .padding(end = 8.dp),
                shape = RoundedCornerShape(32.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = if (isPaused)
                        com.example.nextgen_pds_kiosk.ui.theme.SuccessGreen
                    else
                        com.example.nextgen_pds_kiosk.ui.theme.WarningYellow
                )
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = if (isPaused) Icons.Default.PlayArrow else Icons.Default.Pause,
                        contentDescription = if (isPaused) "Resume" else "Pause",
                        tint = if (isPaused) Color.White else Color.Black
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = if (isPaused) "RESUME" else "PAUSE",
                        style = MaterialTheme.typography.titleLarge.copy(
                            fontWeight = FontWeight.Bold,
                            color = if (isPaused) Color.White else Color.Black,
                            letterSpacing = 1.sp
                        )
                    )
                }
            }

            // STOP button — always visible, always works
            Button(
                onClick = {
                    viewModel.stopDispensing()
                    onNavigateNext()
                },
                modifier = Modifier
                    .weight(1f)
                    .height(64.dp)
                    .padding(start = 8.dp),
                shape = RoundedCornerShape(32.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = MaterialTheme.colorScheme.error
                )
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Default.Stop,
                        contentDescription = "Stop",
                        tint = Color.White
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "STOP",
                        style = MaterialTheme.typography.titleLarge.copy(
                            fontWeight = FontWeight.Bold,
                            color = Color.White,
                            letterSpacing = 1.sp
                        )
                    )
                }
            }
        }
    }
}
