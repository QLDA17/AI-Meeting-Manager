# MultiMinutes AI - Frontend Foundation

This is the React-based frontend for MultiMinutes AI, integrated with the Gemini-powered backend.

## Tech Stack
- **Framework**: React 18 + Vite
- **Language**: TypeScript
- **Styling**: TailwindCSS
- **Icons**: Lucide-React
- **API Client**: Axios

## Getting Started

### 1. Start the Backend API
From the project root:
```bash
python src/api/main.py
```
The API will run at `http://localhost:8000`.

### 2. Start the Frontend
From the `frontend` folder:
```bash
npm install
npm run dev
```
The UI will be available at `http://localhost:5173`.

## Roles & Access
- **Admin**: Full access (System settings, Cost monitoring, Model health).
- **Manager**: Access to Team management and Meeting summaries.
- **Staff**: Access to own Meeting transcripts and Action items.

## Demo Credentials
Use any password with the following usernames:
- `admin`
- `manager`
- `staff`
