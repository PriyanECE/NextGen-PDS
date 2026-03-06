package com.example.nextgen_pds_kiosk.ui.screens

import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.FlashOff
import androidx.compose.material.icons.filled.FlashOn
import androidx.compose.material.icons.filled.QrCodeScanner
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import androidx.hilt.navigation.compose.hiltViewModel
import com.example.nextgen_pds_kiosk.ui.components.KioskTopAppBar
import com.example.nextgen_pds_kiosk.ui.theme.*
import com.example.nextgen_pds_kiosk.voice.AppIntent
import com.example.nextgen_pds_kiosk.viewmodel.QrScanState
import com.example.nextgen_pds_kiosk.viewmodel.QrScanViewModel
import com.google.accompanist.permissions.ExperimentalPermissionsApi
import com.google.accompanist.permissions.isGranted
import com.google.accompanist.permissions.rememberPermissionState
import com.google.mlkit.vision.barcode.BarcodeScanning
import com.google.mlkit.vision.barcode.common.Barcode
import com.google.mlkit.vision.common.InputImage
import java.util.concurrent.Executors

@OptIn(ExperimentalPermissionsApi::class)
@Composable
fun QrScanScreen(
    onCardFound: (cardNo: String) -> Unit,
    onNavigateBack: () -> Unit,
    viewModel: QrScanViewModel = hiltViewModel()
) {
    val cameraPermission = rememberPermissionState(android.Manifest.permission.CAMERA)
    val state by viewModel.state.collectAsState()
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current

    var torchEnabled by remember { mutableStateOf(false) }
    var cameraControl by remember { mutableStateOf<androidx.camera.core.Camera?>(null) }

    // Scanning corner animation
    val infiniteTransition = rememberInfiniteTransition(label = "scan_anim")
    val scanAlpha by infiniteTransition.animateFloat(
        initialValue = 0.4f, targetValue = 1f,
        animationSpec = infiniteRepeatable(tween(800), RepeatMode.Reverse),
        label = "corner_alpha"
    )

    LaunchedEffect(Unit) {
        if (!cameraPermission.status.isGranted) cameraPermission.launchPermissionRequest()
    }

    // Navigate when card found
    LaunchedEffect(state) {
        if (state is QrScanState.Found) {
            val cardNo = (state as QrScanState.Found).beneficiary.beneficiaryId
            onCardFound(cardNo)
            viewModel.resetScan()
        }
    }

    // Voice intent handler
    val currentIntent by viewModel.voiceManager.currentIntent.collectAsState()
    LaunchedEffect(currentIntent) {
        when (currentIntent) {
            AppIntent.NAVIGATE_BACK -> onNavigateBack()
            else -> {}
        }
    }

    // Voice mic lifecycle
    DisposableEffect(Unit) {
        viewModel.voiceManager.startListening()
        onDispose { viewModel.voiceManager.stopListening() }
    }

    Box(modifier = Modifier.fillMaxSize().background(DarkBackground)) {
        Column(
            modifier = Modifier.fillMaxSize().padding(top = 48.dp, start = 32.dp, end = 32.dp, bottom = 48.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            KioskTopAppBar(stepLabel = "STEP 1 OF 3", onNavigateBack = onNavigateBack)
            Spacer(modifier = Modifier.height(24.dp))

            Icon(
                imageVector = Icons.Default.QrCodeScanner,
                contentDescription = null,
                tint = PrimaryAccent,
                modifier = Modifier.size(40.dp)
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = "Scan Ration Card",
                style = MaterialTheme.typography.headlineLarge.copy(
                    fontWeight = FontWeight.Bold, color = TextPrimary
                )
            )
            Text(
                text = "Hold your ration card QR code inside the frame",
                style = MaterialTheme.typography.bodyMedium.copy(color = TextSecondary),
                textAlign = TextAlign.Center,
                modifier = Modifier.padding(top = 6.dp, bottom = 24.dp)
            )

            // Camera viewfinder
            Box(
                modifier = Modifier
                    .size(300.dp)
                    .clip(RoundedCornerShape(20.dp))
                    .background(Color.Black),
                contentAlignment = Alignment.Center
            ) {
                if (cameraPermission.status.isGranted) {
                    val barcodeScanner = remember { BarcodeScanning.getClient() }
                    val analysisExecutor = remember { Executors.newSingleThreadExecutor() }

                    AndroidView(
                        factory = { ctx ->
                            val previewView = PreviewView(ctx)
                            val cameraProviderFuture = ProcessCameraProvider.getInstance(ctx)
                            cameraProviderFuture.addListener({
                                val provider = cameraProviderFuture.get()
                                val preview = Preview.Builder().build().also {
                                    it.setSurfaceProvider(previewView.surfaceProvider)
                                }
                                val analysis = ImageAnalysis.Builder()
                                    .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                                    .build()
                                    .also { ia ->
                                        ia.setAnalyzer(analysisExecutor) { imageProxy ->
                                            val mediaImage = imageProxy.image
                                            if (mediaImage != null) {
                                                val img = InputImage.fromMediaImage(
                                                    mediaImage,
                                                    imageProxy.imageInfo.rotationDegrees
                                                )
                                                barcodeScanner.process(img)
                                                    .addOnSuccessListener { barcodes ->
                                                        barcodes.firstOrNull { it.valueType == Barcode.TYPE_TEXT || it.rawValue != null }
                                                            ?.rawValue
                                                            ?.let { raw -> viewModel.onQrDecoded(raw) }
                                                    }
                                                    .addOnCompleteListener { imageProxy.close() }
                                            } else {
                                                imageProxy.close()
                                            }
                                        }
                                    }
                                val selector = CameraSelector.DEFAULT_BACK_CAMERA
                                try {
                                    provider.unbindAll()
                                    val cam = provider.bindToLifecycle(lifecycleOwner, selector, preview, analysis)
                                    cameraControl = cam
                                } catch (e: Exception) { e.printStackTrace() }
                            }, ContextCompat.getMainExecutor(ctx))
                            previewView
                        },
                        modifier = Modifier.fillMaxSize()
                    )

                    // Torch control
                    LaunchedEffect(torchEnabled) {
                        cameraControl?.cameraControl?.enableTorch(torchEnabled)
                    }

                    // Animated scanning corners overlay
                    Box(modifier = Modifier.fillMaxSize()) {
                        val cornerColor = when (state) {
                            is QrScanState.Found -> Color(0xFF00E676)
                            is QrScanState.NotFound -> MaterialTheme.colorScheme.error
                            else -> PrimaryAccent.copy(alpha = scanAlpha)
                        }
                        val cornerSize = 36.dp
                        val strokeWidth = 4.dp

                        // Top-left corner
                        Box(modifier = Modifier.align(Alignment.TopStart).padding(12.dp)) {
                            Box(modifier = Modifier.size(cornerSize).border(
                                width = strokeWidth, color = cornerColor,
                                shape = RoundedCornerShape(topStart = 8.dp)
                            ).clip(RoundedCornerShape(topStart = 8.dp)))
                        }
                        // Top-right corner
                        Box(modifier = Modifier.align(Alignment.TopEnd).padding(12.dp)) {
                            Box(modifier = Modifier.size(cornerSize).border(
                                width = strokeWidth, color = cornerColor,
                                shape = RoundedCornerShape(topEnd = 8.dp)
                            ))
                        }
                        // Bottom-left corner
                        Box(modifier = Modifier.align(Alignment.BottomStart).padding(12.dp)) {
                            Box(modifier = Modifier.size(cornerSize).border(
                                width = strokeWidth, color = cornerColor,
                                shape = RoundedCornerShape(bottomStart = 8.dp)
                            ))
                        }
                        // Bottom-right corner
                        Box(modifier = Modifier.align(Alignment.BottomEnd).padding(12.dp)) {
                            Box(modifier = Modifier.size(cornerSize).border(
                                width = strokeWidth, color = cornerColor,
                                shape = RoundedCornerShape(bottomEnd = 8.dp)
                            ))
                        }
                    }
                } else {
                    Text("Camera permission required", color = MaterialTheme.colorScheme.error,
                        textAlign = TextAlign.Center)
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            // Status message
            val (statusText, statusColor) = when (state) {
                is QrScanState.Idle, QrScanState.Scanning ->
                    "Scanning…" to TextSecondary
                is QrScanState.Found ->
                    "✓ Card found! Loading…" to Color(0xFF00E676)
                is QrScanState.NotFound ->
                    "Card not registered: ${(state as QrScanState.NotFound).cardNo}" to MaterialTheme.colorScheme.error
            }

            Text(
                text = statusText,
                style = MaterialTheme.typography.titleMedium.copy(
                    fontWeight = FontWeight.SemiBold, color = statusColor
                ),
                textAlign = TextAlign.Center
            )

            if (state is QrScanState.NotFound) {
                Spacer(modifier = Modifier.height(12.dp))
                OutlinedButton(onClick = { viewModel.resetScan() }) {
                    Text("Try Again", color = PrimaryAccent)
                }
            }
        }

        // Torch FAB
        if (cameraPermission.status.isGranted) {
            FloatingActionButton(
                onClick = { torchEnabled = !torchEnabled },
                modifier = Modifier.align(Alignment.BottomEnd).padding(32.dp),
                containerColor = if (torchEnabled) PrimaryAccent else SurfaceVariant,
                contentColor = if (torchEnabled) DarkBackground else PrimaryAccent
            ) {
                Icon(
                    imageVector = if (torchEnabled) Icons.Default.FlashOn else Icons.Default.FlashOff,
                    contentDescription = "Toggle Torch"
                )
            }
        }
    }
}
