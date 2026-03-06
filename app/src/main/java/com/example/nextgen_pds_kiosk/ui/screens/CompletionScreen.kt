package com.example.nextgen_pds_kiosk.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.TaskAlt
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.example.nextgen_pds_kiosk.ui.theme.*
import com.example.nextgen_pds_kiosk.voice.AppIntent
import com.example.nextgen_pds_kiosk.viewmodel.DispenserViewModel
import java.text.SimpleDateFormat
import java.util.*

@Composable
fun CompletionScreen(
    onGoHome: () -> Unit,
    viewModel: DispenserViewModel = hiltViewModel()
) {
    val timeStamp = SimpleDateFormat("dd MMM yyyy, HH:mm:ss", Locale.getDefault()).format(Date())
    val dispensedAmount = "5.0 kg"
    val commodity = "Wheat"
    val transactionId = "TXN-8492-ABCD"

    // Voice assistant lifecycle
    val currentIntent by viewModel.voiceManager.currentIntent.collectAsState()
    DisposableEffect(Unit) {
        viewModel.voiceManager.startListening()
        onDispose { viewModel.voiceManager.stopListening() }
    }

    // Handle voice navigation
    LaunchedEffect(currentIntent) {
        when (currentIntent) {
            AppIntent.HOME, AppIntent.NAVIGATE_NEXT -> onGoHome()
            else -> {}
        }
    }

    // Reset dispenser state for next customer
    LaunchedEffect(Unit) {
        viewModel.resetState()
        viewModel.voiceManager.speak("Dispensing complete. Please collect your items. Say Home to return to the main screen.")
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(DarkBackground)
    ) {
        // Background radial success glow
        Box(
            modifier = Modifier
                .align(Alignment.TopCenter)
                .size(500.dp)
                .offset(y = (-120).dp)
                .background(
                    Brush.radialGradient(
                        colors = listOf(SuccessGreen.copy(alpha = 0.07f), Color.Transparent)
                    )
                )
        )

        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 48.dp, vertical = 32.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {

            // Layered success icon with glow rings
            Box(contentAlignment = Alignment.Center, modifier = Modifier.size(180.dp)) {
                // Outer glow
                Box(
                    modifier = Modifier
                        .size(180.dp)
                        .background(
                            Brush.radialGradient(
                                colors = listOf(SuccessGreen.copy(alpha = 0.18f), Color.Transparent)
                            ),
                            CircleShape
                        )
                )
                // Inner badge
                Box(
                    modifier = Modifier
                        .size(120.dp)
                        .background(SurfaceColor, CircleShape)
                        .border(2.dp, SuccessGreen.copy(alpha = 0.5f), CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.TaskAlt,
                        contentDescription = "Success",
                        tint = SuccessGreen,
                        modifier = Modifier.size(64.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(28.dp))

            Text(
                text = "Dispensing Complete!",
                style = MaterialTheme.typography.displaySmall.copy(
                    fontWeight = FontWeight.ExtraBold,
                    color = TextPrimary
                ),
                textAlign = TextAlign.Center
            )

            Spacer(modifier = Modifier.height(10.dp))

            Text(
                text = "Please collect your items carefully.",
                style = MaterialTheme.typography.bodyLarge.copy(color = TextSecondary),
                textAlign = TextAlign.Center
            )

            Spacer(modifier = Modifier.height(40.dp))

            // Glassmorphism receipt card
            Box(
                modifier = Modifier
                    .fillMaxWidth(0.65f)
                    .clip(RoundedCornerShape(24.dp))
                    .background(SurfaceColor.copy(alpha = 0.9f))
                    .border(
                        1.dp,
                        Brush.linearGradient(
                            colors = listOf(PrimaryAccent.copy(alpha = 0.3f), SecondaryAccent.copy(alpha = 0.2f))
                        ),
                        RoundedCornerShape(24.dp)
                    )
                    .padding(32.dp)
            ) {
                Column {
                    Text(
                        text = "TRANSACTION SUMMARY",
                        style = MaterialTheme.typography.labelLarge.copy(
                            color = PrimaryAccent,
                            letterSpacing = 2.sp,
                            fontWeight = FontWeight.Bold
                        )
                    )

                    Spacer(modifier = Modifier.height(16.dp))

                    HorizontalDivider(color = SurfaceVariant)

                    Spacer(modifier = Modifier.height(16.dp))

                    ReceiptRow("Date & Time", timeStamp)
                    ReceiptRow("Commodity", commodity)
                    ReceiptRow("Amount Dispensed", dispensedAmount, highlight = true)
                    ReceiptRow("Transaction ID", transactionId)
                }
            }

            Spacer(modifier = Modifier.height(40.dp))

            // Home button with gradient border
            Box(
                modifier = Modifier
                    .clip(RoundedCornerShape(36.dp))
                    .background(SurfaceVariant)
                    .border(
                        1.dp,
                        Brush.horizontalGradient(colors = listOf(PrimaryAccent, SecondaryAccent)),
                        RoundedCornerShape(36.dp)
                    )
                    .clickable(onClick = onGoHome)
                    .padding(horizontal = 40.dp, vertical = 18.dp)
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Default.Home,
                        contentDescription = null,
                        tint = PrimaryAccent,
                        modifier = Modifier.size(24.dp)
                    )
                    Spacer(modifier = Modifier.width(14.dp))
                    Text(
                        text = "RETURN TO HOME",
                        style = MaterialTheme.typography.titleMedium.copy(
                            fontWeight = FontWeight.Bold,
                            color = PrimaryAccent,
                            letterSpacing = 2.sp
                        )
                    )
                }
            }
        }
    }
}

@Composable
fun ReceiptRow(label: String, value: String, highlight: Boolean = false) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 10.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.bodyMedium.copy(color = TextSecondary)
        )
        Text(
            text = value,
            style = MaterialTheme.typography.bodyMedium.copy(
                fontWeight = if (highlight) FontWeight.ExtraBold else FontWeight.Normal,
                color = if (highlight) SuccessGreen else TextPrimary
            )
        )
    }
}

