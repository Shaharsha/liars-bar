# Stage 1: Build frontend
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ .
RUN npm run build

# Stage 2: Run backend + serve frontend
FROM python:3.12-slim AS production
RUN pip install --no-cache-dir poetry
WORKDIR /app
COPY backend/pyproject.toml backend/poetry.lock* ./
RUN poetry config virtualenvs.create false && poetry install --only main --no-root --no-interaction
COPY backend/ .
COPY --from=frontend-build /app/frontend/dist ./static

ENV PORT=10000
EXPOSE ${PORT}
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT}
