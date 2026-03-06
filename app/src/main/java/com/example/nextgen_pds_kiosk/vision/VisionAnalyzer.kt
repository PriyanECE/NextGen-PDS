package com.example.nextgen_pds_kiosk.vision

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Matrix
import android.util.Log
import androidx.annotation.OptIn
import androidx.camera.core.ExperimentalGetImage
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.ImageProxy
// import com.example.nextgen_pds_kiosk.utils.BitmapUtils // Will create if missing
import com.google.mediapipe.framework.image.BitmapImageBuilder
import com.google.mediapipe.tasks.core.BaseOptions
import com.google.mediapipe.tasks.vision.core.RunningMode
import com.google.mediapipe.tasks.vision.handlandmarker.HandLandmarker
import com.google.mediapipe.tasks.vision.handlandmarker.HandLandmarkerResult
import org.pytorch.IValue
import org.pytorch.Module
import org.pytorch.torchvision.TensorImageUtils
import java.io.File
import java.io.FileOutputStream
import java.io.IOException

// Represents the real-time state of the physical dispenser area
enum class VisionState {
    IDLE,
    HANDS_DETECTED,    // Danger: Hands are in the way
    NO_BAG,            // Danger: Hands clear, but no bag present to catch grains
    BAG_DETECTED       // Safe: Bags present, Hands clear
}

class VisionAnalyzer(
    private val context: Context,
    private val onStateDetected: (VisionState) -> Unit
) : ImageAnalysis.Analyzer {

    companion object {
        private const val TAG = "VisionAnalyzer"
        private const val BAG_MODEL_FILE = "bag_detection.pt"
        private const val HAND_MODEL_FILE = "hand_landmarker.task"
    }

    private var handLandmarker: HandLandmarker? = null
    private var bagModule: Module? = null
    private var isProcessing = false

    init {
        setupHandLandmarker()
        setupBagDetectionModel()
    }

    private fun setupHandLandmarker() {
        try {
            val baseOptions = BaseOptions.builder()
                .setModelAssetPath(HAND_MODEL_FILE)
                .build()

            val options = HandLandmarker.HandLandmarkerOptions.builder()
                .setBaseOptions(baseOptions)
                // Using IMAGE mode to process individual frames synchronously to avoid Native context async crashing
                .setRunningMode(RunningMode.IMAGE)
                .setNumHands(1)
                .build()

            handLandmarker = HandLandmarker.createFromOptions(context, options)
            Log.d(TAG, "HandLandmarker initialized")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to init MediaPipe HandLandmarker", e)
        }
    }

    private fun setupBagDetectionModel() {
        try {
            val moduleFile = getAssetFilePath(context, BAG_MODEL_FILE)
            if (moduleFile != null) {
                // bag_detection.pt is a standard TorchScript model (not Lite)
                bagModule = Module.load(moduleFile)
                Log.d(TAG, "Bag Detection PyTorch Model loaded")
            } else {
                Log.e(TAG, "Bag model not found in assets")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to load Bag Detection model", e)
        }
    }

    @OptIn(ExperimentalGetImage::class)
    override fun analyze(imageProxy: ImageProxy) {
        if (isProcessing) {
            imageProxy.close()
            return
        }
        isProcessing = true

        val mediaImage = imageProxy.image
        if (mediaImage != null && handLandmarker != null) {
            try {
                // 1. Convert ImageProxy to Bitmap for ML processing (Fallback implementation if Utils missing)
                val bitmap = imageProxy.toBitmap()
                val rotatedBitmap = rotateBitmap(bitmap, imageProxy.imageInfo.rotationDegrees)

                // 2. Run Hand Detection (Fastest, High Priority Safety) synchronously
                val mpImage = BitmapImageBuilder(rotatedBitmap).build()
                val result = handLandmarker?.detect(mpImage)

                val isHandDetected = result?.landmarks()?.isNotEmpty() == true

                if (isHandDetected) {
                    onStateDetected(VisionState.HANDS_DETECTED)
                } else {
                    // 3. No Hands — Now check for the Bag (Heavier PyTorch Model)
                    val bgDetected = runBagDetection(rotatedBitmap)
                    if (bgDetected) {
                        onStateDetected(VisionState.BAG_DETECTED)
                    } else {
                        onStateDetected(VisionState.NO_BAG)
                    }
                }
            } catch (e: Exception) {
                Log.e(TAG, "Analysis failed", e)
            }
        }

        isProcessing = false
        imageProxy.close()
    }

    /**
     * Runs inference on the bag_detection.pt PyTorch model.
     * Assuming YOLOv5/v8 export mapping or standard Imagenet mapping.
     */
    private fun runBagDetection(bitmap: Bitmap): Boolean {
        if (bagModule == null) return false

        try {
            // Usually models require 640x640 or standard 224x224. 
            // We use 640 as a standard YOLO input shape.
            val resizedBitmap = Bitmap.createScaledBitmap(bitmap, 640, 640, true)

            // Convert Android Bitmap to PyTorch Tensor using standard ImageNet normalizations
            val inputTensor = TensorImageUtils.bitmapToFloat32Tensor(
                resizedBitmap,
                TensorImageUtils.TORCHVISION_NORM_MEAN_RGB,
                TensorImageUtils.TORCHVISION_NORM_STD_RGB
            )

            // Forward pass
            val outputTuple = bagModule!!.forward(IValue.from(inputTensor))
            
            // Depending on the PyTorch export format, it can return a Tuple or a Tensor directly.
            val outputTensor = if (outputTuple.isTuple) {
                val t = outputTuple.toTuple()[0].toTensor()
                Log.d(TAG, "PyTorch output is Tuple. Extracted Tensor shape: ${t.shape().contentToString()}")
                t
            } else {
                val t = outputTuple.toTensor()
                Log.d(TAG, "PyTorch output is Tensor. Shape: ${t.shape().contentToString()}")
                t
            }
            
            val scores = outputTensor.dataAsFloatArray
            Log.d(TAG, "PyTorch output total float elements: ${scores.size}")

            if (scores.isNotEmpty()) {
                val sampleSize = minOf(10, scores.size)
                Log.d(TAG, "First $sampleSize scores: ${scores.take(sampleSize).joinToString()}")
            }

            // A generic confidence check: if any output score > safety threshold, a bag is present.
            // Adjust threshold based on the model's calibration
            val threshold = 0.5f 
            var highestConfidence = -100.0f
            
            for (score in scores) {
                if (score > highestConfidence) {
                    highestConfidence = score
                }
            }
            
            Log.d(TAG, "Highest Output Confidence Score: $highestConfidence")
            
            return highestConfidence > threshold
        } catch (e: Exception) {
            Log.e(TAG, "PyTorch Inference error", e)
            return false
        }
    }

    private fun rotateBitmap(bitmap: Bitmap?, rotationDegrees: Int): Bitmap {
        if (bitmap == null) return Bitmap.createBitmap(1, 1, Bitmap.Config.ARGB_8888)
        if (rotationDegrees == 0) return bitmap
        val matrix = Matrix()
        matrix.postRotate(rotationDegrees.toFloat())
        return Bitmap.createBitmap(bitmap, 0, 0, bitmap.width, bitmap.height, matrix, true)
    }

    // Helper: Copy asset to cache for PyTorch to load via absolute path
    private fun getAssetFilePath(context: Context, assetName: String): String? {
        val file = File(context.filesDir, assetName)
        if (file.exists() && file.length() > 0) {
            return file.absolutePath
        }
        try {
            context.assets.open(assetName).use { `is` ->
                FileOutputStream(file).use { os ->
                    val buffer = ByteArray(4 * 1024)
                    var read: Int
                    while (`is`.read(buffer).also { read = it } != -1) {
                        os.write(buffer, 0, read)
                    }
                    os.flush()
                }
            }
            return file.absolutePath
        } catch (e: IOException) {
            Log.e(TAG, "Error copying asset", e)
        }
        return null
    }

    fun close() {
        handLandmarker?.close()
        // PyTorch module doesn't have an explicit close in Lite API, handled by GC
    }
}
