import asyncio, json, websockets

async def main():
    token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJlbWFpbCI6ImRldkBsb2NhbC50ZXN0Iiwicm9sZV9pZCI6MSwiZGVwYXJ0bWVudF9pZCI6MSwic2VjdXJpdHlfY2xlYXJhbmNlIjoiU0VDUkVUIiwiYnJhbmRfaWQiOiIxIiwic2Vzc2lvbl9pZCI6OSwiZXh0ZXJuYWxfc2Vzc2lvbl9pZCI6ImE0dXAzTWdxM2lEOTJHM3hKNXVValEiLCJleHAiOjE3ODQyNDc5MzR9.JyYi3I2hXss88gjz0hln0Wh-54ghv_WKNiyroiRSTwk"
    async with websockets.connect(f"ws://localhost:8000/api/v1/chat/ws?token={token}") as ws:
        await ws.send(json.dumps({"question": "How much water for rice?"}))
        while True:
            msg = json.loads(await ws.recv())
            if msg["event"] == "token":
                print(msg["data"]["text"], end="", flush=True)
            if msg["event"] == "done":
                print("\n\ndone:", msg["data"]); break

asyncio.run(main())