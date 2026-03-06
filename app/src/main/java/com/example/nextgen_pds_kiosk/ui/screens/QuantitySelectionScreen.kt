package com.example.nextgen_pds_kiosk.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.Remove
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.material.icons.filled.Wifi
import androidx.compose.material.icons.filled.WifiOff
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.example.nextgen_pds_kiosk.R
import com.example.nextgen_pds_kiosk.ui.components.KioskPrimaryButton
import com.example.nextgen_pds_kiosk.ui.components.KioskTopAppBar
import com.example.nextgen_pds_kiosk.ui.components.VisionCameraPreview
import com.example.nextgen_pds_kiosk.ui.components.VoiceDebugDialog
import com.example.nextgen_pds_kiosk.voice.AppIntent
import com.example.nextgen_pds_kiosk.viewmodel.ConnectionState
import com.example.nextgen_pds_kiosk.viewmodel.DispenserState
import com.example.nextgen_pds_kiosk.viewmodel.DispenserViewModel
import com.example.nextgen_pds_kiosk.vision.VisionState
import com.google.accompanist.permissions.ExperimentalPermissionsApi
import com.google.accompanist.permissions.isGranted
import com.google.accompanist.permissions.rememberPermissionState
import kotlin.math.roundToInt

@OptIn(ExperimentalPermissionsApi::class)
@Composable
fun QuantitySelectionScreen(
    viewModel: DispenserViewModel = hiltViewModel(),
    onNavigateNext: () -> Unit,
    onNavigateBack: () -> Unit,
) {
    val uiState by viewModel.uiState.collectAsState()
    val connectionState by viewModel.connectionState.collectAsState()
    val currentWeightKg by viewModel.currentWeightKg.collectAsState()
    var quantityKg by remember { mutableIntStateOf(5) }
    val maxQuota = 15 // Max allowed per month
    val commodityName = "Wheat"

    // Safety Vision State
    var visionState by remember { mutableStateOf(VisionState.IDLE) }

    // Camera Permission for Vision
    val cameraPermissionState = rememberPermissionState(
        permission = android.Manifest.permission.CAMERA
    )

    LaunchedEffect(Unit) {
        if (!cameraPermissionState.status.isGranted) {
            cameraPermissionState.launchPermissionRequest()
        }
    }

    // Auto-Tare the scale as soon as we land on this screen
    LaunchedEffect(Unit) {
        viewModel.tareScale()
    }
    
    // Manage Voice Assistant lifecycle on this screen to prevent overlap
    DisposableEffect(Unit) {
        viewModel.voiceManager.startListening()
        onDispose {
            viewModel.onLeavingScreen()
        }
    }
    
    // Chat Dialog State
    val isListening by viewModel.voiceManager.isListening.collectAsState()
    val chatHistory by viewModel.voiceManager.chatHistory.collectAsState()
    val currentIntent by viewModel.voiceManager.currentIntent.collectAsState()
    var showChatDialog by remember { mutableStateOf(false) }

    // Listen for Voice Intents
    LaunchedEffect(currentIntent) {
        when (currentIntent) {
            AppIntent.NAVIGATE_BACK     -> onNavigateBack()
            AppIntent.START_DISPENSING  -> onNavigateNext()
            AppIntent.TARE_SCALE        -> viewModel.tareScale()
            AppIntent.INCREASE_QUANTITY -> {
                if (quantityKg < maxQuota) quantityKg += 1
            }
            AppIntent.DECREASE_QUANTITY -> {
                if (quantityKg > 1) quantityKg -= 1
            }
            else -> {}
        }
    }

    if (showChatDialog) {
        VoiceDebugDialog(
            chatHistory = chatHistory,
            isListening = isListening,
            onDismissRequest = { showChatDialog = false }
        )
    }

    // Automatically navigate to Completion screen when hardware reports success
    LaunchedEffect(uiState) {
        if (uiState is DispenserState.Completed) {
            onNavigateNext()
            viewModel.resetState()
        }
    }

    Box(modifier = Modifier.fillMaxSize()) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(top = 48.dp, bottom = 48.dp, start = 32.dp, end = 32.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
        KioskTopAppBar(
            stepLabel = "STEP 3 OF 3",
            onNavigateBack = onNavigateBack
        )

        Spacer(modifier = Modifier.height(16.dp))

        // ── Hardware Connection Status ──
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.End,
            verticalAlignment = Alignment.CenterVertically
        ) {
            val (icon, color, text) = when (connectionState) {
                is ConnectionState.Online -> Triple(Icons.Default.Wifi, com.example.nextgen_pds_kiosk.ui.theme.SuccessGreen, "Hardware Online")
                is ConnectionState.Offline -> Triple(Icons.Default.WifiOff, MaterialTheme.colorScheme.error, "Hardware Offline")
                is ConnectionState.Checking -> Triple(Icons.Default.Wifi, MaterialTheme.colorScheme.onSurfaceVariant, "Connecting...")
            }
            Icon(imageVector = icon, contentDescription = null, tint = color, modifier = Modifier.size(20.dp))
            Spacer(modifier = Modifier.width(6.dp))
            Text(text = text, style = MaterialTheme.typography.bodyMedium, color = color, fontWeight = FontWeight.Bold)
            Spacer(modifier = Modifier.width(16.dp))
            OutlinedButton(
                onClick = { viewModel.checkConnectionNow() },
                contentPadding = PaddingValues(horizontal = 12.dp, vertical = 4.dp),
                modifier = Modifier.height(32.dp)
            ) {
                Icon(Icons.Default.Refresh, contentDescription = "Refresh", modifier = Modifier.size(16.dp))
                Spacer(modifier = Modifier.width(4.dp))
                Text("Refresh", style = MaterialTheme.typography.labelSmall)
            }
        }

        Spacer(modifier = Modifier.height(24.dp))

        Text(
            text = "Select Quantity",
            modifier = Modifier.clickable { showChatDialog = true }, // Temporary shortcut to open dialog
            style = MaterialTheme.typography.displayMedium.copy(
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onBackground
            )
        )

        Spacer(modifier = Modifier.height(16.dp))

        // Dynamic Top Status Banner based on DispenserState
        val bannerText = when (uiState) {
            is DispenserState.Taring -> "ZEROING SCALE (DO NOT TOUCH)..."
            is DispenserState.Ready -> "SCALE READY: PLEASE SELECT AMOUNT"
            is DispenserState.Dispensing -> "DISPENSING IN PROGRESS..."
            is DispenserState.Error -> (uiState as DispenserState.Error).message
            else -> "PROCESSING..."
        }
        val bannerColor = when (uiState) {
            is DispenserState.Error -> MaterialTheme.colorScheme.errorContainer
            is DispenserState.Ready -> MaterialTheme.colorScheme.primaryContainer
            else -> MaterialTheme.colorScheme.secondaryContainer
        }

        Box(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(8.dp))
                .background(bannerColor)
                .padding(12.dp)
        ) {
            Text(
                text = bannerText,
                style = MaterialTheme.typography.labelLarge,
                color = MaterialTheme.colorScheme.onSurface,
                modifier = Modifier.align(Alignment.Center)
            )
        }

        Spacer(modifier = Modifier.height(16.dp))

        // ── Live Scale & Tare Button ────────────────────────────────────────────
        Card(
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha=0.5f)),
            modifier = Modifier.fillMaxWidth(0.8f)
        ) {
            Row(
                modifier = Modifier.padding(16.dp).fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        text = "Live Scale Weight",
                        style = MaterialTheme.typography.bodyMedium.copy(color = MaterialTheme.colorScheme.onSurfaceVariant)
                    )
                    Text(
                        text = String.format("%.3f kg", currentWeightKg),
                        style = MaterialTheme.typography.headlineMedium.copy(
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.primary
                        )
                    )
                }
                OutlinedButton(
                    onClick = { viewModel.tareScale() },
                    enabled = uiState !is DispenserState.Taring,
                    modifier = Modifier.height(52.dp),
                    shape = RoundedCornerShape(26.dp)
                ) {
                    if (uiState is DispenserState.Taring) {
                        CircularProgressIndicator(modifier = Modifier.size(20.dp), strokeWidth = 2.dp)
                        Spacer(modifier = Modifier.width(8.dp))
                    }
                    Text(
                        text = if (uiState is DispenserState.Taring) "ZEROING..." else "TARE SCALE", 
                        fontWeight = FontWeight.Bold
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Available Quota Card
        Card(
            shape = RoundedCornerShape(24.dp),
            colors = CardDefaults.cardColors(
                containerColor = MaterialTheme.colorScheme.surface
            ),
            modifier = Modifier.fillMaxWidth(0.8f)
        ) {
            Row(
                modifier = Modifier
                    .padding(24.dp)
                    .fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        text = "Current Commodity",
                        style = MaterialTheme.typography.bodyMedium.copy(
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    )
                    Text(
                        text = commodityName,
                        style = MaterialTheme.typography.headlineLarge.copy(
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.primary
                        )
                    )
                }
                Column(horizontalAlignment = Alignment.End) {
                    Text(
                        text = "Remaining Quota",
                        style = MaterialTheme.typography.bodyMedium.copy(
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    )
                    Text(
                        text = "$maxQuota kg",
                        style = MaterialTheme.typography.titleLarge.copy(
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                    )
                }
            }
        }

        Spacer(modifier = Modifier.weight(1f))

        // Interactive Stepper Control
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.Center
        ) {
            // Minus Button
            IconButton(
                onClick = { if (quantityKg > 1) quantityKg-- },
                modifier = Modifier
                    .size(80.dp)
                    .clip(RoundedCornerShape(24.dp))
                    .background(if (quantityKg > 1) MaterialTheme.colorScheme.surfaceVariant else MaterialTheme.colorScheme.surface)
            ) {
                Icon(
                    imageVector = Icons.Default.Remove,
                    contentDescription = "Decrease Quantity",
                    tint = if (quantityKg > 1) MaterialTheme.colorScheme.onSurface else MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.size(40.dp)
                )
            }

            Spacer(modifier = Modifier.width(32.dp))

            // Main Value Display
            Text(
                text = "${quantityKg}kg",
                style = MaterialTheme.typography.displayLarge.copy(
                    fontSize = 80.sp,
                    fontWeight = FontWeight.ExtraBold,
                    color = MaterialTheme.colorScheme.primary
                ),
                modifier = Modifier.width(200.dp),
                textAlign = TextAlign.Center
            )

            Spacer(modifier = Modifier.width(32.dp))

            // Plus Button
            IconButton(
                onClick = { if (quantityKg < maxQuota) quantityKg++ },
                modifier = Modifier
                    .size(80.dp)
                    .clip(RoundedCornerShape(24.dp))
                    .background(if (quantityKg < maxQuota) MaterialTheme.colorScheme.surfaceVariant else MaterialTheme.colorScheme.surface)
            ) {
                Icon(
                    imageVector = Icons.Default.Add,
                    contentDescription = "Increase Quantity",
                    tint = if (quantityKg < maxQuota) MaterialTheme.colorScheme.onSurface else MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.size(40.dp)
                )
            }
        }

        Spacer(modifier = Modifier.weight(1f))

        // Advanced Safety Vision Verification Camera Box
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 32.dp)
                .height(260.dp)
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
                
                // Overlay Status Text
                val statusText = when (visionState) {
                    VisionState.HANDS_DETECTED -> "DANGER: Hands Detected! Keep away from nozzle."
                    VisionState.NO_BAG -> "Place your bag properly under nozzle."
                    VisionState.BAG_DETECTED -> "Bag Detected - Safe to Dispense!"
                    VisionState.IDLE -> "Analyzing Dispenser Area..."
                }
                
                val statusColor = when (visionState) {
                    VisionState.HANDS_DETECTED -> Color.Red
                    VisionState.NO_BAG -> com.example.nextgen_pds_kiosk.ui.theme.WarningYellow
                    VisionState.BAG_DETECTED -> com.example.nextgen_pds_kiosk.ui.theme.SuccessGreen
                    VisionState.IDLE -> Color.White
                }
                
                Text(
                    text = statusText,
                    style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
                    color = Color.White,
                    modifier = Modifier
                        .align(Alignment.BottomCenter)
                        .fillMaxWidth()
                        .background(statusColor.copy(alpha = 0.8f))
                        .padding(8.dp),
                    textAlign = TextAlign.Center
                )
            } else {
                Text(
                    "Camera Permission Required for Safety Verification",
                    color = Color.White
                )
            }
        }

        Spacer(modifier = Modifier.height(24.dp))

        // Start button is ONLY enabled if a bag is detected and NO hands are present
        val isSafeToDispense = visionState == VisionState.BAG_DETECTED

        Button(
            onClick = {
                if (isSafeToDispense) {
                    viewModel.startDispensing(quantityKg.toFloat())
                    onNavigateNext()
                }
            },
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 32.dp)
                .height(80.dp),
            enabled = isSafeToDispense,
            shape = RoundedCornerShape(40.dp),
            colors = ButtonDefaults.buttonColors(
                containerColor = com.example.nextgen_pds_kiosk.ui.theme.PrimaryAccent,
                disabledContainerColor = Color.LightGray
            )
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    imageVector = Icons.Default.ShoppingCart,
                    contentDescription = null,
                    modifier = Modifier.size(32.dp),
                    tint = if (isSafeToDispense) Color.White else Color.Gray
                )
                Spacer(modifier = Modifier.width(16.dp))
                Text(
                    text = "START DISPENSING",
                    style = MaterialTheme.typography.headlineSmall.copy(fontWeight = FontWeight.Bold),
                    color = if (isSafeToDispense) Color.White else Color.DarkGray
                )
            }
        }
    }

        // Voice Debug Dialog Trigger FAB
        FloatingActionButton(
            onClick = { showChatDialog = true },
            modifier = Modifier
                .align(Alignment.BottomEnd)
                .padding(32.dp),
            containerColor = MaterialTheme.colorScheme.secondary,
            contentColor = MaterialTheme.colorScheme.onSecondary
        ) {
            Icon(
                imageVector = Icons.Default.Mic,
                contentDescription = "Open Voice Debug Logs"
            )
        }
    }
}
