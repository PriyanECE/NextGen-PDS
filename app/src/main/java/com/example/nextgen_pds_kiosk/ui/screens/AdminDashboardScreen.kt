package com.example.nextgen_pds_kiosk.ui.screens

import android.graphics.BitmapFactory
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.ExitToApp
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.*
import androidx.compose.material3.TabRowDefaults.tabIndicatorOffset
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.example.nextgen_pds_kiosk.data.Beneficiary
import com.example.nextgen_pds_kiosk.ui.components.GlassmorphicCard
import com.example.nextgen_pds_kiosk.ui.components.MetricCard
import com.example.nextgen_pds_kiosk.ui.components.SimpleBarChart
import com.example.nextgen_pds_kiosk.ui.components.SimplePieChart
import com.example.nextgen_pds_kiosk.viewmodel.AdminViewModel
import com.example.nextgen_pds_kiosk.data.local.InventoryLog
import com.example.nextgen_pds_kiosk.data.local.TransactionLog
import java.text.SimpleDateFormat
import java.util.*

enum class AdminTab(val title: String) {
    OVERVIEW("Overview & Analytics"),
    USERS("Beneficiary CRM"),
    INVENTORY("Inventory Levels"),
    LOGS("Transaction Ledger"),
    SETTINGS("System Settings")
}

@Composable
fun AdminDashboardScreen(
    onNavigateBack: () -> Unit,
    onNavigateEnrollment: () -> Unit,
    onExitKiosk: () -> Unit,
    viewModel: AdminViewModel = hiltViewModel()
) {
    val beneficiaries by viewModel.beneficiaries.collectAsState(initial = emptyList())
    val transactions by viewModel.transactions.collectAsState(initial = emptyList())
    val inventoryLogs by viewModel.inventoryLogs.collectAsState(initial = emptyList())

    var selectedTab by remember { mutableStateOf(AdminTab.OVERVIEW) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp)
    ) {
        // Top Header
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            IconButton(
                onClick = onNavigateBack,
                colors = IconButtonDefaults.iconButtonColors(contentColor = Color.White)
            ) {
                Icon(Icons.Default.ArrowBack, contentDescription = "Back")
            }
            Spacer(modifier = Modifier.width(16.dp))
            Text(
                text = "System Administration",
                color = Color.White,
                fontSize = 32.sp,
                fontWeight = FontWeight.Bold
            )
            Spacer(modifier = Modifier.weight(1f))
            Button(
                onClick = onExitKiosk,
                modifier = Modifier.height(48.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFE57373))
            ) {
                Icon(Icons.Default.ExitToApp, contentDescription = null)
                Spacer(modifier = Modifier.width(8.dp))
                Text("Exit Kiosk")
            }
        }

        Spacer(modifier = Modifier.height(24.dp))

        // Tab Row
        ScrollableTabRow(
            selectedTabIndex = selectedTab.ordinal,
            containerColor = Color.Transparent,
            contentColor = Color.White,
            edgePadding = 0.dp,
            divider = {},
            indicator = { tabPositions ->
                if (selectedTab.ordinal < tabPositions.size) {
                    TabRowDefaults.SecondaryIndicator(
                        Modifier.tabIndicatorOffset(tabPositions[selectedTab.ordinal]),
                        color = Color(0xFF4DB6AC),
                        height = 4.dp
                    )
                }
            }
        ) {
            AdminTab.values().forEachIndexed { index, tab ->
                Tab(
                    selected = selectedTab == tab,
                    onClick = { selectedTab = tab },
                    text = {
                        Text(
                            text = tab.title,
                            fontSize = 18.sp,
                            fontWeight = if (selectedTab == tab) FontWeight.Bold else FontWeight.Normal
                        )
                    }
                )
            }
        }

        Spacer(modifier = Modifier.height(24.dp))

        // Tab Content
        GlassmorphicCard(modifier = Modifier.fillMaxSize()) {
            when (selectedTab) {
                AdminTab.OVERVIEW -> OverviewTab(beneficiaries, transactions)
                AdminTab.USERS -> UsersTab(beneficiaries, onNavigateEnrollment, viewModel::deleteBeneficiary)
                AdminTab.INVENTORY -> InventoryTab(inventoryLogs)
                AdminTab.LOGS -> LogsTab(transactions)
                AdminTab.SETTINGS -> SettingsTab()
            }
        }
    }
}

@Composable
fun OverviewTab(beneficiaries: List<Beneficiary>, transactions: List<TransactionLog>) {
    Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
        Row(horizontalArrangement = Arrangement.spacedBy(16.dp), modifier = Modifier.fillMaxWidth()) {
            MetricCard("Total Users", beneficiaries.size.toString(), "Enrolled Profiles", Modifier.weight(1f))
            MetricCard("Total Transactions", transactions.size.toString(), "Lifetime Activity", Modifier.weight(1f))
            MetricCard("Total Dispensed", transactions.sumOf { it.amountDispensed.toDouble() }.toInt().toString() + " kg", "Gross distribution", Modifier.weight(1f))
        }

        Spacer(modifier = Modifier.height(24.dp))

        Row(horizontalArrangement = Arrangement.spacedBy(16.dp), modifier = Modifier.weight(1f)) {
            // Analytics Bar Chart
            Column(modifier = Modifier.weight(2f)) {
                Text("Recent Activity Pulse", color = Color.White, fontSize = 18.sp, fontWeight = FontWeight.Bold)
                Spacer(modifier = Modifier.height(16.dp))
                
                // MOCK DATA for now since the hardware is empty
                val mockData = listOf(10f, 45f, 25f, 80f, 60f, 30f, 90f)
                val mockLabels = listOf("Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun")
                
                SimpleBarChart(
                    data = mockData,
                    labels = mockLabels,
                    modifier = Modifier.fillMaxSize()
                )
            }

            // Analytics Pie Chart
            Column(modifier = Modifier.weight(1f), horizontalAlignment = Alignment.CenterHorizontally) {
                Text("Stock Capacity", color = Color.White, fontSize = 18.sp, fontWeight = FontWeight.Bold)
                Spacer(modifier = Modifier.height(16.dp))
                SimplePieChart(
                    filledPercentage = 76f,
                    label = "Silo Status",
                    modifier = Modifier.size(200.dp)
                )
            }
        }
    }
}

@Composable
fun UsersTab(
    beneficiaries: List<Beneficiary>,
    onNavigateEnrollment: () -> Unit,
    onDelete: (Beneficiary) -> Unit
) {
    var searchQuery by remember { mutableStateOf("") }
    val filteredList = beneficiaries.filter {
        it.name.contains(searchQuery, ignoreCase = true) || it.beneficiaryId.contains(searchQuery, ignoreCase = true)
    }

    Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
        Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            OutlinedTextField(
                value = searchQuery,
                onValueChange = { searchQuery = it },
                label = { Text("Search by Name or ID") },
                leadingIcon = { Icon(Icons.Default.Search, contentDescription = "Search") },
                singleLine = true,
                modifier = Modifier.weight(1f)
            )
            Spacer(modifier = Modifier.width(16.dp))
            Button(
                onClick = onNavigateEnrollment,
                modifier = Modifier.height(56.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF4DB6AC))
            ) {
                Icon(Icons.Default.Add, contentDescription = null)
                Spacer(modifier = Modifier.width(8.dp))
                Text("Enroll New User")
            }
        }
        
        Spacer(modifier = Modifier.height(16.dp))

        if (filteredList.isEmpty()) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Text("No users found.", color = Color.White)
            }
        } else {
            LazyColumn(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                items(filteredList) { user ->
                    DatabaseRow(user = user, onDelete = { onDelete(user) })
                }
            }
        }
    }
}

@Composable
fun InventoryTab(logs: List<InventoryLog>) {
    Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
        Text("Stock & Inventory Records", color = Color.White, fontSize = 20.sp, fontWeight = FontWeight.Bold)
        Spacer(modifier = Modifier.height(16.dp))
        
        if (logs.isEmpty()) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Text("No inventory logs found.", color = Color.Gray)
            }
        } else {
            LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                items(logs) { log ->
                    Row(
                        modifier = Modifier.fillMaxWidth().background(Color.White.copy(alpha=0.05f), RoundedCornerShape(8.dp)).padding(16.dp),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text("${log.itemName}: ${log.actionType}", color = Color.White, fontWeight = FontWeight.Bold)
                        Text("${if(log.amountAddedOrRemoved > 0) "+" else ""}${log.amountAddedOrRemoved} kg", color = if(log.amountAddedOrRemoved > 0) Color.Green else Color.Red)
                        Text(SimpleDateFormat("yyyy-MM-dd HH:mm", Locale.getDefault()).format(Date(log.timestamp)), color = Color.Gray)
                    }
                }
            }
        }
    }
}

@Composable
fun LogsTab(transactions: List<TransactionLog>) {
    Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
        Text("Dispensing Ledger", color = Color.White, fontSize = 20.sp, fontWeight = FontWeight.Bold)
        Spacer(modifier = Modifier.height(16.dp))
        
        if (transactions.isEmpty()) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Text("No transactions completed matching criteria.", color = Color.Gray)
            }
        } else {
            LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                items(transactions) { tx ->
                    Row(
                        modifier = Modifier.fillMaxWidth().background(Color.White.copy(alpha=0.05f), RoundedCornerShape(8.dp)).padding(16.dp),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text(tx.transactionId.take(8), color = Color.Cyan)
                        Text(tx.beneficiaryName, color = Color.White, modifier = Modifier.weight(1f).padding(start = 16.dp))
                        Text("-${tx.amountDispensed} kg", color = Color.Yellow)
                        Text(SimpleDateFormat("yyyy-MM-dd HH:mm", Locale.getDefault()).format(Date(tx.timestamp)), color = Color.Gray)
                    }
                }
            }
        }
    }
}

@Composable
fun DatabaseRow(user: Beneficiary, onDelete: () -> Unit = {}) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(Color.White.copy(alpha = 0.1f), RoundedCornerShape(12.dp))
            .padding(16.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        // Profile Picture
        Box(
            modifier = Modifier
                .size(64.dp)
                .clip(CircleShape)
                .background(Color.Gray.copy(alpha = 0.3f)),
            contentAlignment = Alignment.Center
        ) {
            if (user.photoData != null) {
                val bitmap = BitmapFactory.decodeByteArray(user.photoData, 0, user.photoData.size)
                if (bitmap != null) {
                    Image(
                        bitmap = bitmap.asImageBitmap(),
                        contentDescription = "Face",
                        contentScale = ContentScale.Crop,
                        modifier = Modifier.fillMaxSize()
                    )
                }
            } else {
                Text(user.name.take(1).uppercase(), color = Color.White, fontWeight = FontWeight.Bold)
            }
        }

        Spacer(modifier = Modifier.width(16.dp))

        // Raw Data Columns
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = "ID: ${user.beneficiaryId.take(8)}...",
                color = Color.Cyan,
                fontSize = 12.sp,
                fontWeight = FontWeight.Bold
            )
            Text(
                text = user.name,
                color = Color.White,
                fontSize = 18.sp,
                fontWeight = FontWeight.Bold
            )
            Text(
                text = "Notes: ${user.metadata}",
                color = Color.White.copy(alpha = 0.7f),
                fontSize = 14.sp
            )
        }

        // Vector Size Indicator
        Column(horizontalAlignment = Alignment.End) {
            Text(
                text = "AI Vector",
                color = Color.White.copy(alpha = 0.5f),
                fontSize = 10.sp
            )
            Text(
                text = "${user.embeddingVector.size} Dim",
                color = Color(0xFFAED581), // Light green
                fontSize = 12.sp,
                fontWeight = FontWeight.Bold
            )
            if (user.photoData != null) {
                Text(
                    text = "${user.photoData.size / 1024} KB WEBP",
                    color = Color.Yellow,
                    fontSize = 10.sp,
                    modifier = Modifier.padding(top = 4.dp)
                )
            }
        }
        
        Spacer(modifier = Modifier.width(16.dp))
        
        IconButton(onClick = onDelete) {
            Icon(Icons.Default.Delete, contentDescription = "Delete", tint = Color(0xFFE57373))
        }
    }
}

@Composable
fun SettingsTab() {
    val context = androidx.compose.ui.platform.LocalContext.current
    val sharedPrefs = remember { context.getSharedPreferences("kiosk_settings", android.content.Context.MODE_PRIVATE) }
    
    // Default fallback is the Android Hotspot DHCP range baseline
    var currentIp by remember { mutableStateOf(sharedPrefs.getString("esp8266_ip", "http://192.168.43.100/") ?: "http://192.168.43.100/") }
    var ipInput by remember { mutableStateOf(currentIp) }
    var saveStatus by remember { mutableStateOf("") }

    Column(modifier = Modifier.fillMaxSize().padding(24.dp)) {
        Text("Hardware Network Configuration", color = Color.White, fontSize = 20.sp, fontWeight = FontWeight.Bold)
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            "Enter the IP Address assigned to the ESP8266 by your Mobile Hotspot.\n" +
            "The port should end with a trailing slash (e.g., http://192.168.106.50/).", 
            color = Color.Gray, fontSize = 14.sp
        )
        
        Spacer(modifier = Modifier.height(24.dp))

        OutlinedTextField(
            value = ipInput,
            onValueChange = { ipInput = it },
            label = { Text("ESP8266 Base URL") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth(0.6f)
        )

        Spacer(modifier = Modifier.height(16.dp))

        Button(
            onClick = {
                val formattedIp = if (!ipInput.endsWith("/")) "$ipInput/" else ipInput
                val validIp = if (!formattedIp.startsWith("http")) "http://$formattedIp" else formattedIp
                
                sharedPrefs.edit().putString("esp8266_ip", validIp).apply()
                currentIp = validIp
                ipInput = validIp
                saveStatus = "Saved: $validIp (Restart app to apply)"
            },
            modifier = Modifier.height(48.dp),
            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF4DB6AC))
        ) {
            Text("Save Configuration")
        }

        if (saveStatus.isNotEmpty()) {
            Spacer(modifier = Modifier.height(16.dp))
            Text(saveStatus, color = Color.Yellow, fontWeight = FontWeight.Bold)
        }
    }
}
