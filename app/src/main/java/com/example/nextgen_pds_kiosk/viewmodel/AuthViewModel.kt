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

sealed class AuthState {
    object Loading : AuthState()
    data class Success(val beneficiary: Beneficiary) : AuthState()
    data class Error(val message: String) : AuthState()
}

@HiltViewModel
class AuthViewModel @Inject constructor(
    private val repository: BeneficiaryRepository,
    val voiceManager: VoiceManager
) : ViewModel() {

    private val _uiState = MutableStateFlow<AuthState>(AuthState.Loading)
    val uiState: StateFlow<AuthState> = _uiState

    fun loadBeneficiary(beneficiaryId: String) {
        viewModelScope.launch {
            _uiState.value = AuthState.Loading
            try {
                val match = repository.getBeneficiaryById(beneficiaryId)
                if (match != null) {
                    _uiState.value = AuthState.Success(match)
                } else {
                    _uiState.value = AuthState.Error("Smart card not found. Please scan again.")
                }
            } catch (e: Exception) {
                e.printStackTrace()
                _uiState.value = AuthState.Error("Failed to load profile from database.")
            }
        }
    }

    fun refreshBeneficiary(beneficiaryId: String) = loadBeneficiary(beneficiaryId)
}
