"""
Live Tutor WebSocket — Bridges browser audio ↔ Gemini Multimodal Live API.

Browser sends 16 kHz PCM16 mono bytes → Gemini processes → returns audio bytes → Browser plays.

Uses output_audio_transcription and input_audio_transcription to get
subtitles and user transcript WITHOUT function calling (which causes 1011
crashes on the native audio model).
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from google import genai
from google.genai import types
import asyncio
import base64
import json
import logging
import os

logger = logging.getLogger("live_tutor")
logger.setLevel(logging.INFO)

router = APIRouter(tags=["Live Tutor"])

# Gemini model to use for live streaming
GEMINI_LIVE_MODEL = "gemini-2.5-flash-native-audio-latest"

# System instruction for the A1 German tutor persona
SYSTEM_INSTRUCTION = types.Content(
    parts=[
        types.Part(
            text=(
                "You are Tim, an expert, encouraging A1 German language tutor. "
                "Speak ONLY natively in German. Keep responses short (1-2 sentences).\n\n"
                "If the user makes a grammar mistake, gently correct them in German "
                "before continuing the conversation.\n\n"
                "You can also see the user's camera feed. If the user holds up an object and asks "
                "what it is in German (e.g., 'Was ist das?'), identify it and tell them the German "
                "vocabulary word including its definite article (der/die/das)."
            )
        )
    ]
)


@router.websocket("/ws/live")
async def live_tutor_websocket(websocket: WebSocket):
    """
    Bidirectional audio bridge: Browser ↔ FastAPI ↔ Gemini Live API.
    
    Uses input/output audio transcription for subtitles instead of
    function calling (which crashes the native audio model with 1011).
    """
    await websocket.accept()
    logger.info("Live Tutor WebSocket connected.")
    print("[LiveTutor] Browser WebSocket accepted.")

    # Initialize the Gemini async client
    api_key = os.getenv("GEMINI_API_KEY")
    client = genai.Client(api_key=api_key)

    # Configure the live session — NO TOOLS (they crash native audio model)
    config = types.LiveConnectConfig(
        response_modalities=[types.Modality.AUDIO],
        system_instruction=SYSTEM_INSTRUCTION,
        # Enable transcription so we can display subtitles and user text
        output_audio_transcription=types.AudioTranscriptionConfig(),
        input_audio_transcription=types.AudioTranscriptionConfig(),
    )

    try:
        async with client.aio.live.connect(
            model=GEMINI_LIVE_MODEL, config=config
        ) as session:
            print(f"[LiveTutor] Gemini Live session opened (model={GEMINI_LIVE_MODEL}).")

            # -- Task A: Browser → Gemini --
            async def browser_to_gemini():
                """Continuously forward browser audio chunks to Gemini using realtime input."""
                try:
                    while True:
                        message_str = await websocket.receive_text()
                        try:
                            payload = json.loads(message_str)
                            msg_type = payload.get("type")
                            b64_data = payload.get("data")
                            
                            if not b64_data:
                                continue
                                
                            raw_bytes = base64.b64decode(b64_data)
                            
                            if msg_type == "audio":
                                await session.send_realtime_input(
                                    audio=types.Blob(
                                        data=raw_bytes,
                                        mime_type="audio/pcm;rate=16000"
                                    )
                                )
                            elif msg_type == "video":
                                await session.send_realtime_input(
                                    video=types.Blob(
                                        data=raw_bytes,
                                        mime_type="image/jpeg"
                                    )
                                )
                        except Exception as parse_err:
                            print(f"[LiveTutor] Payload parsing drop: {parse_err}")
                except WebSocketDisconnect:
                    print("[LiveTutor] Browser disconnected (Task A).")
                except asyncio.CancelledError:
                    print("[LiveTutor] Task A cancelled.")
                except Exception as e:
                    print(f"[LiveTutor] Task A error: {e}")

            # -- Task B: Gemini → Browser --
            async def gemini_to_browser():
                """Continuously forward Gemini audio responses back to browser."""
                current_turn_german = ""
                try:
                    print("[LiveTutor] Waiting for Gemini responses...")
                    while True:
                        async for response in session.receive():
                            server_content = response.server_content
                            
                            # Handle audio from model turn
                            if server_content is not None and server_content.model_turn is not None:
                                for part in server_content.model_turn.parts:
                                    if part.inline_data and part.inline_data.data:
                                        audio_data = part.inline_data.data
                                        b64_audio = base64.b64encode(audio_data).decode('utf-8')
                                        await websocket.send_text(json.dumps({
                                            "type": "audio",
                                            "data": b64_audio
                                        }))
                                    
                                    if part.text:
                                        print(f"[LiveTutor] Gemini thinking (suppressed): {part.text[:100]}...")
                            
                            # Handle output transcription (AI's spoken German text → subtitles)
                            if server_content is not None and server_content.output_transcription:
                                transcript_text = server_content.output_transcription.text
                                if transcript_text:
                                    print(f"[LiveTutor] AI transcript: {transcript_text}")
                                    current_turn_german += transcript_text
                                    await websocket.send_text(json.dumps({
                                        "type": "ai_subtitle",
                                        "data": transcript_text
                                    }))
                            
                            # Handle input transcription (User's spoken text)
                            # Disabled: User reported it is too noisy and frequently picks up wrong languages
                            # if server_content is not None and server_content.input_transcription:
                            #     user_text = server_content.input_transcription.text
                            #     if user_text:
                            #         print(f"[LiveTutor] User transcript: {user_text}")
                            #         await websocket.send_text(json.dumps({
                            #             "type": "user_transcript",
                            #             "data": user_text
                            #         }))
                            
                            # Handle turn signals
                            if server_content is not None:
                                if server_content.turn_complete:
                                    print("[LiveTutor] Gemini turn complete.")
                                    
                                    # --- PASS 2: TRANSLATE THE TURN ---
                                    # When the AI finishes speaking the German sentence, ask the fast
                                    # gemini-2.5-flash text model to translate it into English for the UI.
                                    if current_turn_german.strip():
                                        german_to_translate = current_turn_german
                                        current_turn_german = "" # Reset immediately for next turn
                                        
                                        # Fire and forget translation request
                                        async def fetch_translation(text_to_translate):
                                            try:
                                                print(f"[LiveTutor] Requesting translation for: {text_to_translate}")
                                                # Use the simple generate_content interface
                                                translation_response = await client.aio.models.generate_content(
                                                    model="gemini-2.5-flash", 
                                                    contents=f"You are a translator. Translate this German text into casual, natural English. Output ONLY the English translation and absolutely nothing else. Text to translate: '{text_to_translate}'"
                                                )
                                                if translation_response.text:
                                                    print(f"[LiveTutor] Translation complete: {translation_response.text}")
                                                    await websocket.send_text(json.dumps({
                                                        "type": "ai_english_translation",
                                                        "data": translation_response.text
                                                    }))
                                            except Exception as e:
                                                print(f"[LiveTutor] Background translation failed: {e}")
                                                
                                        # Start the translation without blocking the websocket loop
                                        asyncio.create_task(fetch_translation(german_to_translate))
                                        
                                    await websocket.send_text(json.dumps({
                                        "type": "turn_complete"
                                    }))
                                if server_content.interrupted:
                                    print("[LiveTutor] Gemini interrupted.")

                except WebSocketDisconnect:
                    print("[LiveTutor] Browser disconnected (Task B).")
                except asyncio.CancelledError:
                    print("[LiveTutor] Task B cancelled.")
                except Exception as e:
                    print(f"[LiveTutor] Task B error: {e}")
                finally:
                    print("[LiveTutor] Task B exited.")

            # Run both tasks concurrently — if either finishes or errors, cancel the other
            task_a = asyncio.create_task(browser_to_gemini())
            task_b = asyncio.create_task(gemini_to_browser())
            
            done, pending = await asyncio.wait(
                [task_a, task_b],
                return_when=asyncio.FIRST_COMPLETED
            )
            for p in pending:
                p.cancel()
            
            print("[LiveTutor] Ending Gemini Live Session...")
            try:
                await websocket.close()
            except Exception:
                pass

    except WebSocketDisconnect:
        logger.info("Live Tutor WebSocket disconnected.")
        print("[LiveTutor] Client disconnected.")
    except Exception as e:
        logger.error(f"Error in Live Tutor WebSocket: {e}")
        print(f"[LiveTutor] Session error: {e}")
    finally:
        print("[LiveTutor] Session closed.")
        try:
            await websocket.close()
        except Exception:
            pass
