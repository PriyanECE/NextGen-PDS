import asyncio
import edge_tts
import sys
import os
import json

# Ensure clean output (UTF-8)
sys.stdout.reconfigure(encoding='utf-8')

VOICE_MAP = {
    "en-IN": "en-IN-NeerjaNeural",
    "ta-IN": "ta-IN-PallaviNeural",
    "hi-IN": "hi-IN-SwaraNeural",
    "te-IN": "te-IN-MohanNeural",
    "kn-IN": "kn-IN-GaganNeural", 
    "ml-IN": "ml-IN-MidhunNeural",
    "mr-IN": "mr-IN-AarohiNeural"
}

async def generate_tts(text, lang, output_file):
    try:
        voice = VOICE_MAP.get(lang, "en-IN-NeerjaNeural") 
        communicate = edge_tts.Communicate(text, voice)
        await communicate.save(output_file)
        return {"status": "success", "file": output_file}
    except Exception as e:
        return {"status": "error", "error": str(e)}

async def main_loop():
    # Signal ready
    print(json.dumps({"status": "ready"}))
    sys.stdout.flush()

    loop = asyncio.get_event_loop()
    
    while True:
        try:
            # Run blocking stdin read in executor to play nice with asyncio
            line = await loop.run_in_executor(None, sys.stdin.readline)
            if not line:
                break
            
            line = line.strip()
            if not line:
                continue

            try:
                data = json.loads(line)
                text = data.get('text')
                lang = data.get('lang')
                output = data.get('output_file')

                if text and lang and output:
                    result = await generate_tts(text, lang, output)
                    print(json.dumps(result))
                else:
                    print(json.dumps({"status": "error", "error": "Invalid arguments"}))
            except json.JSONDecodeError:
                print(json.dumps({"status": "error", "error": "Invalid JSON"}))
            
            sys.stdout.flush()

        except Exception as e:
            print(json.dumps({"status": "error", "error": str(e)}))
            sys.stdout.flush()

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--persistent":
        try:
            asyncio.run(main_loop())
        except KeyboardInterrupt:
            pass
    else:
        # Legacy/CLI mode
        if len(sys.argv) < 4:
            # print("ERROR: Usage: python tts_service.py <text> <lang> <output_file>")
            sys.exit(1)
        
        text = sys.argv[1]
        lang = sys.argv[2]
        output = sys.argv[3]
        
        try:
            asyncio.run(generate_tts(text, lang, output))
            # Legacy success message
            print(f"SUCCESS:{output}") 
        except Exception as e:
            print(f"ERROR:{str(e)}")
