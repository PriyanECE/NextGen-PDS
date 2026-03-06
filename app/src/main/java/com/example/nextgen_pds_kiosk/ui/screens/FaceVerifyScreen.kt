package com.example.nextgen_pds_kiosk.ui.screens

import android.graphics.Bitmap
import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.FaceRetouchingNatural
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.example.nextgen_pds_kiosk.camera.CameraAnalyzer
import com.example.nextgen_pds_kiosk.ml.FaceRecognizer
import com.example.nextgen_pds_kiosk.ui.components.CameraPreview
import com.example.nextgen_pds_kiosk.ui.components.KioskPrimaryButton
import com.example.nextgen_pds_kiosk.ui.components.KioskTopAppBar
import com.example.nextgen_pds_kiosk.ui.theme.*
import com.example.nextgen_pds_kiosk.voice.AppIntent
import com.example.nextgen_pds_kiosk.viewmodel.FaceVerifyState
import com.example.nextgen_pds_kiosk.viewmodel.FaceVerifyViewModel
import com.google.accompanist.permissions.ExperimentalPermissionsApi
import com.google.accompanist.permissions.isGranted
import com.google.accompanist.permissions.rememberPermissionState

@OptIn(ExperimentalPermissionsApi::class)
@Composable
fun FaceVerifyScreen(
    cardNo: String,
    memberId: String,
    onVerifySuccess: () -> Unit,
    onNavigateBack: () -> Unit,
    viewModel: FaceVerifyViewModel = hiltViewModel()
) {
    val cameraPermission = rememberPermissionState(android.Manifest.permission.CAMERA)
    val state by viewModel.state.collectAsState()
    val scope = rememberCoroutineScope()
    val context = androidx.compose.ui.platform.LocalContext.current

    val faceRecognizer = remember { FaceRecognizer(context) }
    val cameraAnalyzer = remember(faceRecognizer) {
        CameraAnalyzer(scope) { bitmap: Bitmap, _ ->
            viewModel.processFace(bitmap, faceRecognizer)
        }
    }

    LaunchedEffect(memberId) {
        viewModel.loadTarget(memberId)
        viewModel.voiceManager.speak("Please look directly at the camera for face verification.")
    }

    // Camera permission request
    LaunchedEffect(Unit) {
        if (!cameraPermission.status.isGranted) cameraPermission.launchPermissionRequest()
    }

    // Navigate on success
    LaunchedEffect(state) {
        if (state is FaceVerifyState.Success) {
            onVerifySuccess()
        }
    }

    DisposableEffect(Unit) {
        onDispose {
            faceRecognizer.close()
            viewModel.onLeavingScreen()
        }
    }

    // Voice intent handler — allow back navigation via voice
    val currentIntent by viewModel.voiceManager.currentIntent.collectAsState()
    LaunchedEffect(currentIntent) {
        when (currentIntent) {
            AppIntent.NAVIGATE_BACK -> onNavigateBack()
            else -> {}
        }
    }

    // Pulse animation for scanning ring
    val infiniteTransition = rememberInfiniteTransition(label = "pulse")
    val pulseScale by infiniteTransition.animateFloat(
        initialValue = 1f, targetValue = 1.08f,
        animationSpec = infiniteRepeatable(tween(900, easing = FastOutSlowInEasing), RepeatMode.Reverse),
        label = "pulse_scale"
    )

    Box(
        modifier = Modifier.fillMaxSize().background(DarkBackground),
        contentAlignment = Alignment.Center
    ) {
        Column(
            modifier = Modifier.fillMaxSize()
                .padding(top = 48.dp, bottom = 48.dp, start = 32.dp, end = 32.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            KioskTopAppBar(stepLabel = "STEP 3 OF 3", onNavigateBack = onNavigateBack)
            Spacer(modifier = Modifier.height(24.dp))

            Icon(
                imageVector = Icons.Default.FaceRetouchingNatural,
                contentDescription = null,
                tint = PrimaryAccent,
                modifier = Modifier.size(36.dp)
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = "Face Verification",
                style = MaterialTheme.typography.headlineLarge.copy(
                    fontWeight = FontWeight.Bold, color = TextPrimary
                )
            )
            Text(
                text = "Look directly at the camera",
                style = MaterialTheme.typography.bodyMedium.copy(color = TextSecondary),
                textAlign = TextAlign.Center,
                modifier = Modifier.padding(top = 6.dp, bottom = 24.dp)
            )

            // Camera viewfinder with pulse ring
            Box(contentAlignment = Alignment.Center, modifier = Modifier.size(280.dp)) {
                // Pulse ring (only when scanning)
                if (state is FaceVerifyState.Idle || state is FaceVerifyState.Processing) {
                    Box(
                        modifier = Modifier
                            .size(280.dp)
                            .scale(pulseScale)
                            .clip(RoundedCornerShape(50))
                            .background(
                                brush = Brush.radialGradient(
                                    colors = listOf(PrimaryAccent.copy(alpha = 0.15f), Color.Transparent)
                                )
                            )
                    )
                }

                // Camera preview
                val borderColor = when (state) {
                    is FaceVerifyState.Success -> Color(0xFF00E676)
                    is FaceVerifyState.Failed  -> MaterialTheme.colorScheme.error
                    is FaceVerifyState.AutoApproving -> Color(0xFFFFB300)
                    else -> PrimaryAccent
                }

                Box(
                    modifier = Modifier.size(260.dp)
                        .clip(RoundedCornerShape(130.dp))
                        .background(Color.Black),
                    contentAlignment = Alignment.Center
                ) {
                    if (cameraPermission.status.isGranted) {
                        CameraPreview(
                            modifier = Modifier.fillMaxSize(),
                            analyzer = cameraAnalyzer
                        )
                    } else {
                        Text("Camera Required", color = MaterialTheme.colorScheme.error,
                            textAlign = TextAlign.Center)
                    }
                }

                // Status icon overlay for terminal states
                if (state is FaceVerifyState.Success) {
                    Box(
                        modifier = Modifier.size(260.dp).clip(RoundedCornerShape(130.dp))
                            .background(Color.Black.copy(alpha = 0.55f)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(Icons.Default.CheckCircle, null,
                            tint = Color(0xFF00E676), modifier = Modifier.size(72.dp))
                    }
                }
            }

            Spacer(modifier = Modifier.height(32.dp))

            // Status Text
            val (statusText, statusColor) = when (state) {
                is FaceVerifyState.Idle         -> "Position your face in the circle" to TextSecondary
                is FaceVerifyState.Processing   -> "Verifying…" to PrimaryAccent
                is FaceVerifyState.AutoApproving -> "No face enrolled — auto-approving…" to Color(0xFFFFB300)
                is FaceVerifyState.Success       -> "✓  Identity Verified!" to Color(0xFF00E676)
                is FaceVerifyState.Failed        -> (state as FaceVerifyState.Failed).reason to MaterialTheme.colorScheme.error
            }

            Text(
                text = statusText,
                style = MaterialTheme.typography.titleLarge.copy(
                    fontWeight = FontWeight.Bold, color = statusColor
                ),
                textAlign = TextAlign.Center
            )

            if (state is FaceVerifyState.Failed) {
                Spacer(modifier = Modifier.height(16.dp))
                OutlinedButton(onClick = { /* ViewModel auto-resets */ }) {
                    Text("Try Again", color = PrimaryAccent)
                }
            }
        }
    }
}
