# JARVIS Workflow Engine Frontend

Next 16 UI for visualizing JARVIS workflow runs from the Python backend.

## Stack

- Next 16
- React 19
- TypeScript
- lucide-react

## Run

```bash
npm install
npm run dev
```

The app runs on `http://localhost:3000` and proxies `/api/*` requests to the backend at `http://localhost:8000`.

## Main View

- workflow graph visualization
- active agent highlighting
- execution trace viewer
- streaming response panel
- generated plan/status panel
