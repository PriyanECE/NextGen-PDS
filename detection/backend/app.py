from flask import Flask, request, jsonify
from flask_cors import CORS
import firebase_admin
from firebase_admin import credentials, firestore
import threading
import time

# Initialize Flask
app = Flask(__name__)
CORS(app)

# Initialize Firebase (Mock/Placeholder)
# cred = credentials.Certificate("path/to/serviceAccountKey.json")
# firebase_admin.initialize_app(cred)
# db = firestore.client()

# Mock DB for Prototype if Firebase creds missing
MOCK_DB = {
    "inventory": {"total": 1000, "dispensed": 450},
    "users": [
        {"id": "RC-123", "name": "Ramesh", "members": 4, "last_dispensed": "2024-01-01"}
    ]
}

# --- Global State for Hardware ---
latest_weight = 0.0
is_dispensing = False

@app.route('/')
def home():
    return jsonify({"status": "Smart PDS Backend Online"})

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    # Implement Admin Auth Check
    if data.get('email') == 'admin@pds.com' and data.get('password') == 'admin123':
        return jsonify({"role": "admin", "token": "mock-admin-token"})
    return jsonify({"error": "Invalid credentials"}), 401

@app.route('/api/inventory', methods=['GET'])
def get_inventory():
    # return jsonify(MOCK_DB['inventory'])
    # In real app, fetch from Firestore
    return jsonify(MOCK_DB['inventory'])

@app.route('/api/scan-qr', methods=['POST'])
def scan_qr():
    # In real app, this might trigger a camera frame analysis
    # Here, we accept the scanned string from Frontend
    qr_data = request.json.get('qr_data')
    # Validate User
    user = next((u for u in MOCK_DB['users'] if u['id'] == qr_data), None)
    if user:
        return jsonify({"status": "success", "user": user})
    return jsonify({"status": "not_found"}), 404

@app.route('/api/dispense', methods=['POST'])
def dispense():
    global is_dispensing
    data = request.json
    amount = data.get('amount') # in Kg

    if is_dispensing:
        return jsonify({"error": "Dispenser Busy"}), 400

    # Start Dispensing Thread (Simulates ESP32 Comms)
    threading.Thread(target=simulate_dispense, args=(amount,)).start()
    
    # Update Inventory
    MOCK_DB['inventory']['dispensed'] += amount
    
    return jsonify({"status": "started", "amount": amount})

def simulate_dispense(amount):
    global is_dispensing
    is_dispensing = True
    print(f"Sending to ESP32: Dispense {amount}kg")
    # ser.write(f"D:{amount}\n".encode())
    time.sleep(3) # Simulate time
    is_dispensing = False
    print("Dispensing Complete")

if __name__ == '__main__':
    app.run(debug=True, port=5000)
