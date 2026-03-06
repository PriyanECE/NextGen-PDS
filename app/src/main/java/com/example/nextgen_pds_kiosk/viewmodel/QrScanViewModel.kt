package com.example.nextgen_pds_kiosk.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.nextgen_pds_kiosk.data.Beneficiary
import com.example.nextgen_pds_kiosk.data.BeneficiaryRepository
import com.example.nextgen_pds_kiosk.voice.VoiceManager
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

sealed class QrScanState {
    object Idle : QrScanState()
    object Scanning : QrScanState()
    data class Found(val beneficiary: Beneficiary) : QrScanState()
    data class NotFound(val cardNo: String) : QrScanState()
}

@HiltViewModel
class QrScanViewModel @Inject constructor(
    private val repository: BeneficiaryRepository,
    val voiceManager: VoiceManager
) : ViewModel() {


    private val _state = MutableStateFlow<QrScanState>(QrScanState.Idle)
    val state: StateFlow<QrScanState> = _state

    private var lastScanned = ""

    fun onQrDecoded(rawValue: String) {
        // Debounce — ignore if same code scanned again
        if (rawValue == lastScanned || _state.value is QrScanState.Found) return
        lastScanned = rawValue
        _state.value = QrScanState.Scanning

        viewModelScope.launch {
            val beneficiary = repository.getBeneficiaryById(rawValue)
            _state.value = if (beneficiary != null) {
                QrScanState.Found(beneficiary)
            } else {
                QrScanState.NotFound(rawValue)
            }
        }
    }

    fun resetScan() {
        lastScanned = ""
        _state.value = QrScanState.Idle
    }
}
