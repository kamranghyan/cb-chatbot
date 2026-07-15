import uvicorn

from src.config import get_settings

if __name__ == "__main__":
    s = get_settings()
    uvicorn.run(
        "src.app:app",
        host=s.APP_HOST,
        port=s.APP_PORT,
        reload=s.is_local,
    )
