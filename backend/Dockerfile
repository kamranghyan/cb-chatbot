FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1

RUN pip install --no-cache-dir "poetry==1.8.3"

WORKDIR /app
COPY pyproject.toml poetry.lock* ./
RUN poetry config virtualenvs.create false \
 && poetry install --no-interaction --no-ansi --no-root --only main

# AWS creds Dockerfile mein NAHI (old Dockerfile.local mein ENV AWS_ACCESS_KEY_ID= tha
# jo git leak ka risk hai). Creds runtime pe: env_file / IAM role / task role.

COPY . .

CMD ["uvicorn", "src.app:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
