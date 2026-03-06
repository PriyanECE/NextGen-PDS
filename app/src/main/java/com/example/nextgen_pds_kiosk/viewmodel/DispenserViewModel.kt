package com.example.nextgen_pds_kiosk.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.nextgen_pds_kiosk.data.api.DispenserApiService
import com.example.nextgen_pds_kiosk.voice.VoiceManager
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import retrofit2.HttpException
import java.io.IOException
import javax.inject.Inject

sealed class DispenserState {
    object Idle : DispenserState()
    object Taring : DispenserState()
    object Ready : DispenserState()
    data class Dispensing(val currentWeight: Float, val targetWeight: Float) : DispenserState()
    object Completed : DispenserState()
    data class Error(val message: String) : DispenserState()
}

sealed class ConnectionState {
    object Checking : ConnectionState()
    object Online : ConnectionState()
    object Offline : ConnectionState()
}

@HiltViewModel
class DispenserViewModel @Inject constructor(
    private val apiService: DispenserApiService,
    val voiceManager: VoiceManager
) : ViewModel() {

    private val _uiState = MutableStateFlow<DispenserState>(DispenserState.Idle)
    val uiState: StateFlow<DispenserState> = _uiState

    private val _connectionState = MutableStateFlow<ConnectionState>(ConnectionState.Checking)
    val connectionState: StateFlow<ConnectionState> = _connectionState

    // Real-time weight exposed separately for the Dispensing screen
    private val _currentWeightKg = MutableStateFlow(0f)
    val currentWeightKg: StateFlow<Float> = _currentWeightKg

    private val _targetWeightKg = MutableStateFlow(0f)
    val targetWeightKg: StateFlow<Float> = _targetWeightKg

    private var targetWeightKgValue: Float = 0f
    private var pingJob: Job? = null

    init {
        startConnectionPing()
    }

    // ── Tare ──────────────────────────────────────────────────────────────────
    fun tareScale() {
        viewModelScope.launch {
            _uiState.value = DispenserState.Taring
            voiceManager.speak("Taring the scale. Please wait.")
            try {
                val response = apiService.tareScale()
                if (response.isSuccessful) {
                    _currentWeightKg.value = 0f
                    _uiState.value = DispenserState.Ready
                    voiceManager.speak("Scale is ready. You can now place your container.")
                } else {
                    _uiState.value = DispenserState.Error("Tare failed. Check hardware connection.")
                    voiceManager.speak("Tare failed. Please check the hardware connection.")
                }
            } catch (e: IOException) {
                _uiState.value = DispenserState.Error("Network error: Could not reach dispenser.")
                voiceManager.speak("Network error: Could not reach the dispenser.")
            } catch (e: HttpException) {
                _uiState.value = DispenserState.Error("HTTP Error: ${e.code()}")
                voiceManager.speak("Hardware returned an HTTP Error.")
            } catch (e: Exception) {
                _uiState.value = DispenserState.Error("Unexpected Tare Error.")
            }
        }
    }

    // ── Start Dispensing ──────────────────────────────────────────────────────
    fun startDispensing(targetKg: Float) {
        if (_uiState.value is DispenserState.Dispensing) return

        targetWeightKgValue = targetKg
        _targetWeightKg.value = targetKg
        _currentWeightKg.value = 0f
        _uiState.value = DispenserState.Dispensing(0f, targetKg)

        voiceManager.speak(
            "Starting motor. Target weight is $targetKg kilograms. " +
            "Please keep your hands clear of the dispensing area."
        )

        viewModelScope.launch {
            try {
                // Convert kg → grams for the hardware API
                val response = apiService.startDispensing(targetKg * 1000f)
                if (response.isSuccessful) {
                    // Hardware accepted
                } else {
                    _uiState.value = DispenserState.Error("Dispensing rejected by hardware.")
                    voiceManager.speak("Dispensing failed. Please try again.")
                }
            } catch (e: IOException) {
                _uiState.value = DispenserState.Error("Network error during dispense.")
                voiceManager.speak("Network error. Could not start dispensing.")
            } catch (e: HttpException) {
                _uiState.value = DispenserState.Error("HTTP Error: ${e.code()} during dispense.")
            } catch (e: Exception) {
                _uiState.value = DispenserState.Error("Unexpected Dispense Error.")
            }
        }
    }

    // ── Stop Dispensing ───────────────────────────────────────────────────────
    fun stopDispensing() {
        viewModelScope.launch {
            try {
                apiService.stopDispensing()
                _uiState.value = DispenserState.Idle
                _targetWeightKg.value = 0f
                voiceManager.speak("Dispensing stopped.")
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    // ── Hardware Connection Ping ──────────────────────────────────────────────
    fun checkConnectionNow() {
        _connectionState.value = ConnectionState.Checking
        startConnectionPing()
    }

    private fun startConnectionPing() {
        pingJob?.cancel()
        pingJob = viewModelScope.launch {
            while (true) {
                try {
                    val response = apiService.getStatus() // Ping the status endpoint
                    if (response.isSuccessful) {
                        if (_connectionState.value != ConnectionState.Online) {
                            _connectionState.value = ConnectionState.Online
                        }
                        
                        // Parse live continuous weight!
                        val body = response.body()
                        if (body != null) {
                            val weightKg = body.currentWeightG / 1000f
                            _currentWeightKg.value = weightKg
                            
                            // If actively dispensing, check for auto-completion
                            if (_uiState.value is DispenserState.Dispensing) {
                                _uiState.value = DispenserState.Dispensing(weightKg, targetWeightKgValue)
                                
                                if (body.status == "idle" && weightKg >= targetWeightKgValue * 0.95f) {
                                    _uiState.value = DispenserState.Completed
                                    voiceManager.speak("Dispensing completed. Please remove your container.")
                                }
                            }
                        }
                    } else {
                        if (_connectionState.value != ConnectionState.Offline) {
                            _connectionState.value = ConnectionState.Offline
                        }
                    }
                } catch (e: Exception) {
                    if (_connectionState.value != ConnectionState.Offline) {
                        _connectionState.value = ConnectionState.Offline
                    }
                }
                delay(500) // Fast 500ms ping for real-time load cell data
            }
        }
    }

    // ── Pause / Resume ────────────────────────────────────────────────────────
    fun pauseDispensing() {
        viewModelScope.launch {
            try {
                apiService.pauseDispensing()
                voiceManager.speak("Dispensing paused.")
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    fun resumeDispensing() {
        viewModelScope.launch {
            try {
                apiService.resumeDispensing()
                voiceManager.speak("Resuming dispensing.")
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    // ── Cleanup ───────────────────────────────────────────────────────────────
    fun resetState() {
        _uiState.value = DispenserState.Idle
        _currentWeightKg.value = 0f
        _targetWeightKg.value  = 0f
    }

    fun onLeavingScreen() {
        pingJob?.cancel()
        voiceManager.stopListening()
    }
}
