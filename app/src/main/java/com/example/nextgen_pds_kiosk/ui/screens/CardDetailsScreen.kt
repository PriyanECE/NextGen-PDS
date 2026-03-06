package com.example.nextgen_pds_kiosk.ui.screens

import android.graphics.BitmapFactory
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Person
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.example.nextgen_pds_kiosk.data.Beneficiary
import com.example.nextgen_pds_kiosk.data.model.FamilyMember
import com.example.nextgen_pds_kiosk.ui.components.KioskPrimaryButton
import com.example.nextgen_pds_kiosk.ui.components.KioskTopAppBar
import com.example.nextgen_pds_kiosk.ui.theme.*
import com.example.nextgen_pds_kiosk.voice.AppIntent
import com.example.nextgen_pds_kiosk.viewmodel.AuthState
import com.example.nextgen_pds_kiosk.viewmodel.AuthViewModel
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken

@Composable
fun CardDetailsScreen(
    cardNo: String,
    onMemberSelected: (cardNo: String, memberId: String) -> Unit,
    onNavigateBack: () -> Unit,
    viewModel: AuthViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    var selectedMember by remember { mutableStateOf<FamilyMember?>(null) }

    LaunchedEffect(cardNo) {
        viewModel.loadBeneficiary(cardNo)
    }

    // Voice assistant integration
    val currentIntent by viewModel.voiceManager.currentIntent.collectAsState()
    LaunchedEffect(currentIntent) {
        when (currentIntent) {
            AppIntent.NAVIGATE_BACK -> onNavigateBack()
            else -> {}
        }
    }
    DisposableEffect(Unit) {
        viewModel.voiceManager.startListening()
        onDispose { viewModel.voiceManager.stopListening() }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(DarkBackground)
            .padding(top = 48.dp, bottom = 48.dp, start = 28.dp, end = 28.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        KioskTopAppBar(stepLabel = "STEP 2 OF 3", onNavigateBack = onNavigateBack)
        Spacer(modifier = Modifier.height(24.dp))

        when (val s = uiState) {
            is AuthState.Loading -> {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        CircularProgressIndicator(color = PrimaryAccent)
                        Spacer(modifier = Modifier.height(12.dp))
                        Text("Loading card details…", color = TextSecondary)
                    }
                }
            }
            is AuthState.Error -> {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text(s.message, color = MaterialTheme.colorScheme.error, textAlign = TextAlign.Center)
                }
            }
            is AuthState.Success -> {
                val beneficiary = s.beneficiary
                val familyMembers: List<FamilyMember> = remember(beneficiary.membersJson) {
                    if (beneficiary.membersJson.isNotBlank()) {
                        val type = object : TypeToken<List<FamilyMember>>() {}.type
                        try { Gson().fromJson(beneficiary.membersJson, type) } catch (e: Exception) { emptyList() }
                    } else emptyList()
                }

                LazyColumn(
                    modifier = Modifier.weight(1f),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    // Header card
                    item { SmartCardHeader(beneficiary) }

                    // Monthly entitlements
                    item { EntitlementRow(beneficiary) }

                    // Member selection
                    item {
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = "Select Member Collecting Today",
                            style = MaterialTheme.typography.titleLarge.copy(
                                fontWeight = FontWeight.Bold, color = TextPrimary
                            )
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = "Tap the family member who will verify their face",
                            style = MaterialTheme.typography.bodyMedium.copy(color = TextSecondary)
                        )
                        Spacer(modifier = Modifier.height(12.dp))
                    }

                    // Member cards (horizontal if few, vertical if many)
                    if (familyMembers.isEmpty()) {
                        item {
                            MemberCard(
                                name = beneficiary.name,
                                relation = "Head",
                                age = 0,
                                gender = "",
                                isSelected = selectedMember == null,
                                photoData = beneficiary.photoData,
                                onClick = {
                                    selectedMember = FamilyMember(
                                        "M001", beneficiary.name, "Head", "", 0, ""
                                    )
                                }
                            )
                        }
                    } else {
                        items(familyMembers) { member ->
                            MemberCard(
                                name = member.name,
                                relation = member.relation,
                                age = member.age,
                                gender = member.gender,
                                isSelected = selectedMember?.memberId == member.memberId,
                                photoData = null,
                                onClick = { selectedMember = member }
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                KioskPrimaryButton(
                    text = if (selectedMember != null)
                        "VERIFY ${selectedMember!!.name.uppercase()}'S FACE →"
                    else "SELECT A MEMBER TO CONTINUE",
                    enabled = selectedMember != null,
                    onClick = {
                        selectedMember?.let { member ->
                            // Find the beneficiary record for this member
                            // Members on the same card use the same smartCardNo
                            // The memberId in the DB is the beneficiary who has that member's name
                            onMemberSelected(cardNo, member.memberId)
                        }
                    }
                )
            }
        }
    }
}

@Composable
private fun SmartCardHeader(beneficiary: Beneficiary) {
    val bitmap = remember(beneficiary.photoData) {
        beneficiary.photoData?.let {
            try { BitmapFactory.decodeByteArray(it, 0, it.size)?.asImageBitmap() } catch (e: Exception) { null }
        }
    }

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = SurfaceColor),
        elevation = CardDefaults.cardElevation(6.dp)
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Avatar
            Box(
                modifier = Modifier.size(72.dp).clip(CircleShape)
                    .background(SurfaceVariant),
                contentAlignment = Alignment.Center
            ) {
                if (bitmap != null) {
                    Image(bitmap = bitmap, contentDescription = null,
                        modifier = Modifier.fillMaxSize(), contentScale = ContentScale.Crop)
                } else {
                    Icon(Icons.Default.Person, null,
                        modifier = Modifier.size(40.dp), tint = TextSecondary)
                }
            }
            Spacer(modifier = Modifier.width(16.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(beneficiary.name,
                    style = MaterialTheme.typography.titleLarge.copy(fontWeight = FontWeight.Bold, color = TextPrimary))
                Text(
                    text = beneficiary.smartCardNo.ifBlank { beneficiary.beneficiaryId },
                    style = MaterialTheme.typography.bodySmall.copy(color = TextSecondary)
                )
                Spacer(modifier = Modifier.height(6.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    val badgeColor = when (beneficiary.cardType) {
                        "AAY" -> Color(0xFFD32F2F)
                        "PHH" -> Color(0xFF1565C0)
                        else -> Color(0xFF2E7D32)
                    }
                    Surface(shape = RoundedCornerShape(50), color = badgeColor) {
                        Text(beneficiary.cardType.ifBlank { "PHH" },
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 3.dp),
                            style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.Bold, color = Color.White))
                    }
                    val statusColor = if (beneficiary.status == "ACTIVE") Color(0xFF00E676) else MaterialTheme.colorScheme.error
                    Surface(shape = RoundedCornerShape(50), color = statusColor.copy(alpha = 0.15f)) {
                        Text(beneficiary.status.ifBlank { "ACTIVE" },
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 3.dp),
                            style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.SemiBold, color = statusColor))
                    }
                }
            }
        }
        if (beneficiary.address.isNotBlank()) {
            HorizontalDivider(modifier = Modifier.padding(horizontal = 16.dp), color = SurfaceVariant)
            Text(
                text = beneficiary.address,
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 10.dp),
                style = MaterialTheme.typography.bodySmall.copy(color = TextSecondary)
            )
        }
    }
}

@Composable
private fun EntitlementRow(beneficiary: Beneficiary) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = SurfaceColor)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text("Monthly Entitlement",
                style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.SemiBold, color = PrimaryAccent))
            Spacer(modifier = Modifier.height(12.dp))
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceEvenly) {
                if (beneficiary.riceKg > 0) EntitlementChip("Rice", "${beneficiary.riceKg}kg", Color(0xFFFF8F00))
                if (beneficiary.wheatKg > 0) EntitlementChip("Wheat", "${beneficiary.wheatKg}kg", Color(0xFFFFA000))
                if (beneficiary.sugarKg > 0) EntitlementChip("Sugar", "${beneficiary.sugarKg}kg", Color(0xFF7B1FA2))
                if (beneficiary.dalKg > 0) EntitlementChip("Dal", "${beneficiary.dalKg}kg", Color(0xFF1976D2))
                if (beneficiary.keroseneL > 0) EntitlementChip("Kerosene", "${beneficiary.keroseneL}L", Color(0xFFE64A19))
            }
        }
    }
}

@Composable
private fun EntitlementChip(label: String, value: String, color: Color) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Surface(shape = RoundedCornerShape(8.dp), color = color.copy(alpha = 0.15f)) {
            Text(value,
                modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold, color = color))
        }
        Spacer(modifier = Modifier.height(4.dp))
        Text(label, style = MaterialTheme.typography.labelSmall.copy(color = TextSecondary))
    }
}

@Composable
private fun MemberCard(
    name: String,
    relation: String,
    age: Int,
    gender: String,
    isSelected: Boolean,
    photoData: ByteArray?,
    onClick: () -> Unit
) {
    val bitmap = remember(photoData) {
        photoData?.let { try { BitmapFactory.decodeByteArray(it, 0, it.size)?.asImageBitmap() } catch (e: Exception) { null } }
    }

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .border(
                width = if (isSelected) 2.dp else 0.dp,
                color = if (isSelected) PrimaryAccent else Color.Transparent,
                shape = RoundedCornerShape(16.dp)
            ),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (isSelected) SurfaceColor else SurfaceVariant.copy(alpha = 0.5f)
        ),
        elevation = CardDefaults.cardElevation(if (isSelected) 6.dp else 2.dp)
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier.size(56.dp).clip(CircleShape)
                    .background(if (isSelected) PrimaryAccent.copy(alpha = 0.2f) else SurfaceVariant),
                contentAlignment = Alignment.Center
            ) {
                if (bitmap != null) {
                    Image(bitmap = bitmap, contentDescription = null,
                        modifier = Modifier.fillMaxSize(), contentScale = ContentScale.Crop)
                } else {
                    Text(
                        text = name.first().uppercaseChar().toString(),
                        style = MaterialTheme.typography.headlineSmall.copy(
                            fontWeight = FontWeight.Bold,
                            color = if (isSelected) PrimaryAccent else TextSecondary
                        )
                    )
                }
            }
            Spacer(modifier = Modifier.width(16.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(name, style = MaterialTheme.typography.titleMedium.copy(
                    fontWeight = FontWeight.Bold,
                    color = if (isSelected) TextPrimary else TextSecondary))
                Text(
                    text = buildString {
                        append(relation)
                        if (age > 0) append(" · Age $age")
                        if (gender.isNotBlank()) append(" · $gender")
                    },
                    style = MaterialTheme.typography.bodySmall.copy(color = TextSecondary),
                    fontSize = 12.sp
                )
            }
            if (isSelected) {
                Icon(Icons.Default.CheckCircle, contentDescription = "Selected",
                    tint = PrimaryAccent, modifier = Modifier.size(24.dp))
            }
        }
    }
}
