# FreshGuard AI - Production Deployment Guide

This guide outlines the production deployment setup and steps for the **FreshGuard AI** web application.

---

## 1. System Architecture

```
                       ┌─────────────────────────────┐
                       │       Frontend Client       │
                       │     (React + Vite SPA)      │
                       │  Vercel / Netlify / Render  │
                       └──────────────┬──────────────┘
                                      │
                         HTTPS REST API (JSON / FormData)
                         VITE_API_URL -> Backend URL
                                      │
                       ┌──────────────▼──────────────┐
                       │       Backend Service       │
                       │      (Flask + Gunicorn)     │
                       │   Render / Railway / Cloud  │
                       └───────┬─────────────┬───────┘
                               │             │
                ┌──────────────▼───┐     ┌───▼────────────────┐
                │ MobileNetV2 Keras│     │   Random Forest    │
                │ Image Model      │     │   Structured Model │
                └──────────────────┘     └────────────────────┘
```

---

## 2. Backend Deployment

### Recommended Platforms
- **Render** (Web Service, Native Python 3.10/3.11/3.12)
- **Railway** (Python Service)
- **Fly.io** or **AWS App Runner** / **ECS** (Containerized)

### Deployment Settings
- **Root Directory**: `backend` (or run commands targeting `backend`)
- **Build Command**:
  ```bash
  pip install -r requirements.txt
  ```
- **Start Command (Production WSGI)**:
  ```bash
  gunicorn app:app --bind 0.0.0.0:$PORT --workers 1 --threads 1 --timeout 180
  ```
  *(Note: A timeout of 180 seconds and 1 worker with 1 thread allows TensorFlow to operate within 512MB RAM without memory contention).*

### Environment Variables
| Variable | Required | Default | Description |
| :--- | :---: | :---: | :--- |
| `PORT` | Optional | `5000` | Port assigned dynamically by host (Render/Railway set this automatically). |
| `ALLOWED_ORIGINS` | Optional | `*` | Comma-separated list of allowed frontend domains, e.g. `https://freshguard-ai.vercel.app`. |
| `FLASK_DEBUG` | Optional | `False` | Keep `False` in production. |
| `IMAGE_MODEL_PATH`| Optional | `backend/model/FreshGuard_Good_Bad_MobileNetV2.keras` | Override path to the MobileNetV2 image model if stored elsewhere. |
| `RF_MODEL_PATH` | Optional | `backend/model/freshguard_random_forest.pkl` | Override path to the Random Forest model if stored elsewhere. |
| `UPLOAD_FOLDER` | Optional | `backend/uploads` | Temporary upload folder for uploaded images (cleaned up after prediction). |

### Important Model File Notes
- Ensure `backend/model/FreshGuard_Good_Bad_MobileNetV2.keras` and `backend/model/freshguard_random_forest.pkl` are committed to your git repository or uploaded via Git LFS / cloud volume storage.
- Linux filesystems are case-sensitive. The backend automatically handles filename case-sensitivity fallback for `freshguard_random_forest.pkl` and `FreshGuard_random_forest.pkl`.

---

## 3. Frontend Deployment

### Recommended Platforms
- **Vercel**
- **Netlify**
- **Cloudflare Pages**
- **Render Static Site**

### Deployment Settings
- **Root Directory**: `frontend`
- **Build Command**:
  ```bash
  npm run build
  ```
- **Output / Publish Directory**:
  ```
  dist
  ```

### Environment Variables
| Variable | Required | Example | Description |
| :--- | :---: | :--- | :--- |
| `VITE_API_URL` | **Yes (in prod)** | `https://freshguard-ai-backend.onrender.com` | Base URL of your deployed Flask backend (without trailing slash). |

> [!TIP]
> Always deploy the **Backend** first so you have its live URL ready to set as `VITE_API_URL` when deploying the Frontend.

---

## 4. Local Testing & Verification

### Run Backend Locally
```bash
# In the project root or backend folder with virtual environment active:
python backend/app.py
```
Backend runs on `http://127.0.0.1:5000`.

### Run Frontend Locally
```bash
cd frontend
npm install
npm run dev
```
Frontend runs on `http://localhost:5173` and automatically connects to `http://127.0.0.1:5000` (from `frontend/.env` or default fallback).

### Test Production Build Locally
```bash
cd frontend
npm run lint
npm run build
npm run preview
```

---

## 5. Deployment Verification Checklist

- [ ] **Backend Health**: Visit `https://your-backend-url/` → Expect `{"message": "FreshGuard AI Backend is Running", "status": "success"}`.
- [ ] **Frontend Connection**: Frontend indicator displays "Server Connected" / green dot.
- [ ] **Image Freshness Check**: Upload a fruit/vegetable photo in the Image Analysis tab and verify classification ("Good to Eat" / "Bad to Eat" with confidence).
- [ ] **Manual Quality Assessment**: Fill in the 13 fruit parameters (e.g. using "Fill with Sample Apple Data") and verify freshness assessment.
- [ ] **User Features**: Test Login, session persistence, History record tracking, Profile view, and Logout.
