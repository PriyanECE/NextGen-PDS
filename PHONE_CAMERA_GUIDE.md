# Phone Camera Setup Guide

## Your IP Webcam Info
- IPv4: `http://100.88.97.225:8080`
- Status: Video connections: 0, Audio: 0

## Quick Start

1. **Make sure phone and PC are on SAME WiFi**
2. **Keep IP Webcam app running on phone**
3. **Run the script:**
   ```powershell
   python connect_mobile.py
   ```

## If Connection Fails

### Test 1: Check in Browser
Open this URL in your PC browser:
```
http://100.88.97.225:8080
```

If you see the IP Webcam interface, connection is working!

### Test 2: Try Different URLs
Edit `connect_mobile.py` line 15 and try these:

```python
# Option 1 (current)
phone_url = "http://100.88.97.225:8080/video"

# Option 2
phone_url = "http://100.88.97.225:8080/videofeed"

# Option 3 (for still images)
phone_url = "http://100.88.97.225:8080/shot.jpg"
```

### Test 3: Check Firewall
- Windows Firewall might be blocking
- Temporarily disable and try again

### Test 4: Restart Everything
1. Close IP Webcam app
2. Restart app
3. Check new IP address (it might change!)
4. Update script with new IP
5. Run again

## What the Script Does

- **GREEN boxes**: Hands detected
- **BLUE boxes**: Bags detected
- Shows hand landmarks (21 points)
- Real-time detection
- Press 'q' to quit

## Troubleshooting

**"Failed to connect"**
- Phone and PC on different WiFi networks
- IP address changed (check app)
- Firewall blocking

**"Connected but can't read frames"**
- Camera permissions on phone
- Try different URL format
- Restart IP Webcam app

**Slow/Laggy**
- Reduce resolution in IP Webcam settings
- Use WiFi 5GHz if available
- Close other apps on phone

## Alternative: USB Connection

If WiFi doesn't work, use DroidCam:
1. Install DroidCam on phone and PC
2. Connect via USB
3. Use: `cap = cv2.VideoCapture(1)`
