package com.example.nextgen_pds_kiosk.voice

import javax.inject.Inject
import javax.inject.Singleton

enum class AppIntent {
    // Navigation
    NAVIGATE_NEXT,
    NAVIGATE_BACK,
    CONFIRM,
    HOME,

    // Dispensing actions
    START_DISPENSING,
    PAUSE_DISPENSING,
    RESUME_DISPENSING,
    TARE_SCALE,

    // Quantity control
    INCREASE_QUANTITY,
    DECREASE_QUANTITY,

    // Language switching
    SWITCH_LANGUAGE_ENGLISH,
    SWITCH_LANGUAGE_HINDI,
    SWITCH_LANGUAGE_TAMIL,

    // Admin
    OPEN_ADMIN,

    UNKNOWN
}

@Singleton
class IntentParser @Inject constructor() {

    // ── 1. NAVIGATE NEXT / CONFIRM ─────────────────────────────────────────
    private val nextKeywords = listOf(
        // English
        "next", "continue", "start", "proceed", "go to next", "begin", "confirm", "okay", "ok",
        "yes", "accept", "forward",
        // Tamil
        "தொடரவும்", "அடுத்தது", "ஆரம்பி", "சரி", "ஒப்புக்கொள்",
        // Hindi
        "shuru", "aage", "chalo", "shuru karein", "aage badho", "haan", "theek hai",
        "शुरू", "आगे", "हाँ", "ठीक है"
    )

    // ── 2. NAVIGATE BACK / CANCEL ──────────────────────────────────────────
    private val backKeywords = listOf(
        // English
        "back", "go back", "return", "cancel", "previous", "exit",
        // Tamil
        "பின்னால்", "திரும்பு", "ரத்துசெய்", "வெளியேறு",
        // Hindi
        "peeche", "wapas", "khatam", "wapas jao", "peeche jao", "radda karo",
        "रद्द", "वापस", "पिछला"
    )

    // ── 3. DISPENSE / START DISPENSING ────────────────────────────────────
    private val dispenseKeywords = listOf(
        // English
        "dispense", "give me", "start dispensing", "drop", "provide", "release",
        // Tamil
        "வழங்கு", "கொடு", "ரிலீஸ்", "வழங்கவும்",
        // Hindi
        "nikalo", "pradan karein", "anaj nikalo", "shuru karo",
        "दीजिए", "निकालो", "प्रदान"
    )

    // ── 4. PAUSE ──────────────────────────────────────────────────────────
    private val pauseKeywords = listOf(
        // English
        "pause", "stop", "hold", "wait", "halt",
        // Tamil
        "நிறுத்து", "பாஸ்", "காத்திரு",
        // Hindi
        "ruko", "rok do", "band karo", "thehro",
        "रोको", "बंद करो", "ठहरो"
    )

    // ── 5. RESUME ─────────────────────────────────────────────────────────
    private val resumeKeywords = listOf(
        // English
        "resume", "continue dispensing", "restart", "unpause",
        // Tamil
        "தொடர்", "மீண்டும் தொடரவும்",
        // Hindi
        "phir shuru", "dobara shuru", "vapas shuru",
        "फिर शुरू", "दोबारा"
    )

    // ── 6. TARE / ZERO SCALE ─────────────────────────────────────────────
    private val tareKeywords = listOf(
        // English — correct word
        "tare", "tare scale", "zero scale", "reset scale", "zero", "calibrate", "reset weight",
        "tare the scale", "tare it", "zero it", "do tare",
        // Phonetic confusables — what STT will likely hear instead of "tare"
        "tyre", "tire", "tear", "pare", "pear", "bare", "dare", "wear",
        "there scale", "tyre scale", "tear scale",
        // Tamil
        "தாரே", "சுழி", "அளவை சுழியாக்கு", "மீட்டமை",
        // Hindi
        "tare karo", "zero karo", "scale sahi karo", "mitti karo",
        "शून्य", "तारे करो", "रीसेट", "तार", "टेयर"
    )

    // ── 7. INCREASE ───────────────────────────────────────────────────────
    private val increaseKeywords = listOf(
        // English
        "more", "increase", "add", "plus", "extra", "raise",
        // Tamil
        "அதிகம்", "கூட்டு", "இன்னும்", "அதிகரி",
        // Hindi
        "zyada", "aur", "badhao", "jyada", "ज़्यादा", "और", "बढ़ाओ"
    )

    // ── 8. DECREASE ───────────────────────────────────────────────────────
    private val decreaseKeywords = listOf(
        // English
        "less", "decrease", "subtract", "minus", "reduce", "lower",
        // Tamil
        "குறை", "கழி", "கம்மி", "குறை செய்",
        // Hindi
        "kam", "ghatao", "kam karo", "कम", "घटाओ"
    )

    // ── 9. HOME ───────────────────────────────────────────────────────────
    private val homeKeywords = listOf(
        // English
        "home", "go home", "main menu", "welcome", "start over", "next customer",
        // Tamil
        "வீடு", "முதன்மை மெனு", "தொடக்கம்",
        // Hindi
        "ghar", "mukhya menu", "home jao", "dobara", "dusra grahak",
        "घर", "मुख्य", "वापस जाओ"
    )

    // ── 10. OPEN ADMIN ───────────────────────────────────────────────────
    private val adminKeywords = listOf(
        // English
        "admin", "administrator", "settings", "management",
        // Tamil
        "நிர்வாகம்", "அட்மின்",
        // Hindi
        "admin", "prabandhan", "vyavastha",
        "प्रबंधन", "सेटिंग्स"
    )

    // ── 11. LANGUAGE SWITCHES ─────────────────────────────────────────────
    private val englishKeywords = listOf(
        "english", "speak in english", "switch to english",
        "angrezi", "angrezi mein", "angreji", "अंग्रेज़ी", "अंग्रेजी",
        "angilam", "ஆங்கிலம்", "english pesu", "இங்கிலீஷ்", "इंग्लिश"
    )

    private val hindiKeywords = listOf(
        "hindi", "हिंदी", "speak in hindi", "switch to hindi",
        "hindi mein", "hindi bolo", "hindi shuru",
        "indhi", "இந்தி", "ஹிந்தி", "हिंदी में"
    )

    private val tamilKeywords = listOf(
        "tamil", "தமிழ்", "speak in tamil", "switch to tamil", "thamizh",
        "tamil mein", "tamil pesu", "tamil shuru", "तमिल"
    )

    // ── PARSER ────────────────────────────────────────────────────────────
    fun parseIntent(text: String, currentLanguage: String = "en"): AppIntent {
        val s = text.lowercase().trim()
        if (s.isBlank()) return AppIntent.UNKNOWN

        // Priority 1 — Language switching (global, highest priority)
        if (englishKeywords.any { s.contains(it) }) return AppIntent.SWITCH_LANGUAGE_ENGLISH
        if (hindiKeywords.any  { s.contains(it) }) return AppIntent.SWITCH_LANGUAGE_HINDI
        if (tamilKeywords.any  { s.contains(it) }) return AppIntent.SWITCH_LANGUAGE_TAMIL

        // Priority 2 — Exact full match
        if (homeKeywords.contains(s))    return AppIntent.HOME
        if (adminKeywords.contains(s))   return AppIntent.OPEN_ADMIN
        if (nextKeywords.contains(s))    return AppIntent.NAVIGATE_NEXT
        if (backKeywords.contains(s))    return AppIntent.NAVIGATE_BACK
        if (dispenseKeywords.contains(s))return AppIntent.START_DISPENSING
        if (pauseKeywords.contains(s))   return AppIntent.PAUSE_DISPENSING
        if (resumeKeywords.contains(s))  return AppIntent.RESUME_DISPENSING
        if (tareKeywords.contains(s))    return AppIntent.TARE_SCALE
        if (increaseKeywords.contains(s))return AppIntent.INCREASE_QUANTITY
        if (decreaseKeywords.contains(s))return AppIntent.DECREASE_QUANTITY

        // Priority 3 — Fuzzy / contains match (user speaks full sentences)
        if (homeKeywords.any    { s.contains(it) }) return AppIntent.HOME
        if (adminKeywords.any   { s.contains(it) }) return AppIntent.OPEN_ADMIN
        if (resumeKeywords.any  { s.contains(it) }) return AppIntent.RESUME_DISPENSING
        if (pauseKeywords.any   { s.contains(it) }) return AppIntent.PAUSE_DISPENSING
        if (tareKeywords.any    { s.contains(it) }) return AppIntent.TARE_SCALE
        if (dispenseKeywords.any{ s.contains(it) }) return AppIntent.START_DISPENSING
        if (increaseKeywords.any{ s.contains(it) }) return AppIntent.INCREASE_QUANTITY
        if (decreaseKeywords.any{ s.contains(it) }) return AppIntent.DECREASE_QUANTITY
        if (nextKeywords.any    { s.contains(it) }) return AppIntent.NAVIGATE_NEXT
        if (backKeywords.any    { s.contains(it) }) return AppIntent.NAVIGATE_BACK

        return AppIntent.UNKNOWN
    }
}
