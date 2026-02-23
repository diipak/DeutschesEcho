"""
Live Tutor WebSocket — Bridges browser audio ↔ Gemini Multimodal Live API.

Browser sends 16 kHz PCM16 mono bytes → Gemini processes → returns audio bytes → Browser plays.
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from google import genai
from google.genai import types
import asyncio
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
                "You are an expert, encouraging A1 German language tutor. "
                "Keep your responses short (1-2 sentences maximum). "
                "Speak natively in German, but if the user speaks English, reply in very simple German. "
                "Correct their pronunciation politely. "
                "You can now see the user's camera feed. If the user holds up an object and asks what it is in German (e.g., 'Was ist das?'), look at the latest video frame, identify the object, and tell them the German vocabulary word including its definite article (der/die/das). Keep the explanation brief."
            )
        )
    ]
)


@router.websocket("/ws/live")
async def live_tutor_websocket(websocket: WebSocket):
    """
    Bidirectional audio bridge: Browser ↔ FastAPI ↔ Gemini Live API.
    """
    await websocket.accept()
    logger.info("Live Tutor WebSocket connected.")
    print("[LiveTutor] Browser WebSocket accepted.")

    # Initialize the Gemini async client
    # It reads GEMINI_API_KEY from the environment automatically via dotenv
    api_key = os.getenv("GEMINI_API_KEY")
    client = genai.Client(api_key=api_key)

    # Configure the live session
    config = types.LiveConnectConfig(
        response_modalities=[types.Modality.AUDIO],
        system_instruction=SYSTEM_INSTRUCTION,
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
                        # We now receive JSON payloads containing base64 encoded chunks
                        message_str = await websocket.receive_text()
                        try:
                            import json
                            import base64
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
                try:
                    print("[LiveTutor] Waiting for Gemini responses...")
                    while True:
                        async for response in session.receive():
                            # The audio response is tucked in the server_content -> model_turn
                            server_content = response.server_content
                            if server_content is not None and server_content.model_turn is not None:
                                for part in server_content.model_turn.parts:
                                    if part.inline_data and part.inline_data.data:
                                        audio_data = part.inline_data.data
                                        # Send the PCM16 audio bytes directly down the WebSocket
                                        await websocket.send_bytes(audio_data)
                                        
                            # Handle text output / transcriptions (just for logging)
                            if server_content is not None:
                                if server_content.turn_complete:
                                    print("[LiveTutor] Gemini turn complete.")
                                if server_content.interrupted:
                                    print("[LiveTutor] Gemini interrupted.")
                                if server_content.model_turn:
                                    for part in server_content.model_turn.parts:
                                        if part.text:
                                            print(f"[LiveTutor] Gemini says: {part.text}")
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
