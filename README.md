# Smart PDS System

A modern UI/UX for a Smart Public Distribution System (PDS) featuring Biometric Auth, QR Scanning, Voice Assistance, and Inventory Management.

## Features
- **Role-Based Login**: Admin (Dashboard) and User (Scan/Payment) portals.
- **Smart Scanning**: QR Code based Identification + Face Recognition Authorization.
- **Automated Rationing**: Logic to calculate weight based on family members (Adult: 300g, Child: 100g).
- **Accessibility**: "Read Aloud" screen reader and Voice-Enabled Chatbot.
- **Inventory Management**: Real-time tracking of Total vs Dispensed ration.
- **Payment Integration**: UPI (QR) and Cash options.

## Tech Stack
- **Frontend**: React.js, Tailwind CSS, Framer Motion, Web Speech API.
- **Backend**: Python Flask, Firebase Admin SDK (Simulated), OpenCV, Face Recognition.

## Prerequisites
- Node.js (v18+)
- Python (v3.9+)
- CMake (required for `dlib`/`face_recognition` library)

## Setup Instructions

### 1. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### 2. Backend Setup
```bash
cd backend
python -m venv venv
# Activate venv:
# Windows: venv\Scripts\activate
# Mac/Linux: source venv/bin/activate

pip install -r requirements.txt
python app.py
```

### 3. Firebase Configuration
- Create a Firebase Project.
- Replace config in `frontend/src/firebase_config.js`.
- Download Service Account Key and place in `backend/` (update `app.py`).

## Mocking Hardware
- Since Camera/ESP32 are hardware dependent, the UI provides **Simulation Buttons** (e.g., "Simulate QR Scan", "Verify Face") to test the flow without devices.
- The `app.py` runs a separate thread to simulate ESP32 dispensing delay.

### 4. Deployment (Firebase Hosting)
To make the app live:
1.  Install CLI: `npm install -g firebase-tools`
2.  Login: `firebase login`
3.  Initialize: `firebase init hosting` (Choose `dist` as public directory, `Yes` for SPA).
4.  Build: `npm run build`
5.  Deploy: `firebase deploy`

## Usage
1. Open Frontend (`http://localhost:5173`) or your deployed URL.
2. Login as **Admin** (`admin@pds.com` / `admin123`) to view Dashboard.
3. Login as **User** (or go to Home) to access Scan/Payment features.
4. Click **Read Aloud** on Home page for accessibility.
5. Use the **Chatbot Icon** (bottom right) to speak commands.
