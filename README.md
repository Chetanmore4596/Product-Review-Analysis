<h1 align="center">🧠 Product Review Sentiment Analysis</h1>

<p align="center">
  <b>Dataset Upload, Cleaning, Analysis, and Sentiment Insights</b><br/>
  Full-stack app to upload datasets and generate sentiment-focused analytics with interactive charts.
</p>

<p align="center">
  ⚛️ React • ⚡ Vite • 🟢 Node.js • 🐍 Python • 📊 pandas
</p>

---

## ✨ Overview

**Product Review Sentiment Analysis** is a full-stack MERN + Python project that allows users to upload datasets and get sentiment insights in one flow.

It includes:
- 📁 Dataset upload support (`.csv`, `.tsv`, `.txt`, `.xls`, `.xlsx`, `.json`, `.parquet`)
- 🧹 Dataset cleaning and preprocessing (Python pipeline)
- 📌 Analysis summary (missing values, duplicates, cleaning strategy)
- 🎯 Lexicon-based sentiment analysis for review text
- 📊 Chart-ready data for frontend visualizations

---

## 🌟 Features

- 📤 **Dataset Upload & Validation**  
  Upload structured dataset files from the UI and process them through backend + Python service.

- 🧠 **Python-Powered Processing**  
  Uses `pandas` and `numpy` for cleaning, analysis, and sentiment scoring.

- 📊 **Interactive Visual Insights**  
  Explore bar, line, pie, radar, and doughnut chart outputs.

- 🧾 **Schema + Table Preview**  
  Inspect columns, sample rows, and cleaned summaries directly in the frontend.

- 🎛️ **User Controls**  
  Adjust table size and inspect specific columns for focused analysis.

- 📱 **Responsive Frontend**  
  Modern React UI with smooth interactions.

---

## 🛠 Tech Stack

<p align="center">
  <img src="https://skillicons.dev/icons?i=react,vite,nodejs,express,python,github" />
</p>

- **Frontend:** React + Vite + Chart.js + Framer Motion  
- **Backend:** Node.js + Express + Multer  
- **Python Service:** pandas + numpy  
- **Process:** Express API orchestrates Python analysis and returns chart-ready JSON

---

## 📁 Project Structure

- `client/` React + Vite frontend
- `server/` Express API and file upload handling
- `python-service/` Data cleaning and sentiment analysis scripts
- `screenshots/` UI screenshots
- `sample_product_reviews.csv` Sample dataset

---

## ⚡ Installation & Setup

Follow these steps to run the project locally:

```bash
# 1️⃣ Go to backend and install dependencies
cd server
npm install

# 2️⃣ Go to frontend and install dependencies
cd ../client
npm install

# 3️⃣ Set up Python environment
cd ../python-service
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

---

## ▶️ Run the App

```bash
# Start backend
cd server
npm run dev
```

```bash
# Start frontend (in another terminal)
cd client
npm run dev
```

Frontend: `http://localhost:5173`  
Backend API: `http://localhost:5000` (or your configured port)

---

## 🔌 Core API Endpoints

- `GET /api/health`
- `POST /api/analyze` (multipart field: `dataset`)

---

## 📸 Demo / Screenshots

![Project Demo](.screenshots/Output.png)

---

## 🚀 Deployment

You can deploy:

- Frontend on **Vercel / Netlify / GitHub Pages**
- Backend on **Render / Railway / VPS**
- Ensure Python runtime is available on backend host

---

## 👨‍💻 Author

**Chetan More**
