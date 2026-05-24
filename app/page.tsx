"use client";

import { Activity, Boxes, CircleCheck, Play, RotateCcw, ShieldCheck, Workflow } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type AgentRole = "supervisor" | "planner" | "executor" | "validator";

interface TraceEvent {
  id: string;
  run_id: string;
  type: string;
  label: string;
  agent?: AgentRole;
  data?: unknown;
  timestamp: string;
}

interface WorkflowPlanStep {
  id: string;
  title: string;
  objective: string;
  status: string;
}

interface WorkflowState {
  run_id: string;
  objective: string;
  status: string;
  active_agent: AgentRole;
  plan: WorkflowPlanStep[];
  final_answer?: string | null;
}

const agents = [
  { id: "supervisor", label: "Supervisor", x: 380, y: 46, icon: ShieldCheck },
  { id: "planner", label: "Planner", x: 90, y: 190, icon: Workflow },
  { id: "executor", label: "Executor", x: 380, y: 190, icon: Boxes },
  { id: "validator", label: "Validator", x: 670, y: 190, icon: CircleCheck }
] as const;

const edges = [
  ["supervisor", "planner"],
  ["planner", "executor"],
  ["executor", "validator"],
  ["validator", "supervisor"],
  ["executor", "supervisor"]
] as const;

export default function Home() {
  const [objective, setObjective] = useState(
    "Build a production-ready onboarding workflow with tool execution and validation."
  );
  const [state, setState] = useState<WorkflowState>();
  const [trace, setTrace] = useState<TraceEvent[]>([]);
  const [stream, setStream] = useState("");
  const [isRunning, setIsRunning] = useState(false);

  const activeEdge = useMemo(() => {
    const lastMessage = [...trace].reverse().find((event) => event.type === "agent.message");
    const message = lastMessage?.data as { sender?: string; receiver?: string } | undefined;
    return message?.sender && message?.receiver ? `${message.sender}:${message.receiver}` : "";
  }, [trace]);

  useEffect(() => {
    if (!state?.run_id) return;

    const source = new EventSource(`/api/workflows/${state.run_id}/events`);
    source.onmessage = (message) => {
      const event = JSON.parse(message.data) as TraceEvent;
      setTrace((current) => (current.some((item) => item.id === event.id) ? current : [...current, event]));
      if (event.type === "stream.chunk") {
        setStream((current) => `${current}${current ? " " : ""}${event.label}`);
      }
      if (event.type === "workflow.completed" || event.type === "workflow.failed" || event.type === "agent.completed") {
        void refreshState(state.run_id);
      }
      if (event.type === "workflow.completed" || event.type === "workflow.failed") {
        setIsRunning(false);
      }
    };

    return () => source.close();
  }, [state?.run_id]);

  async function refreshState(runId: string) {
    const response = await fetch(`/api/workflows/${runId}/state`);
    if (response.ok) {
      setState(await response.json());
    }
  }

  async function runWorkflow() {
    setIsRunning(true);
    setTrace([]);
    setStream("");
    const response = await fetch("/api/workflows/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        objective,
        context: {
          source: "next16-workflow-visualizer",
          requested_at: new Date().toISOString()
        }
      })
    });
    const body = (await response.json()) as { run_id: string };
    await refreshState(body.run_id);
  }

  return (
    <main className="shell">
      <section className="topbar">
        <div>
          <h1>JARVIS Workflow Engine</h1>
          <p>Python LangGraph backend with Next 16 workflow visualization.</p>
        </div>
        <button onClick={runWorkflow} disabled={isRunning}>
          {isRunning ? <RotateCcw size={18} /> : <Play size={18} />}
          {isRunning ? "Running" : "Run"}
        </button>
      </section>

      <section className="promptRow">
        <textarea value={objective} onChange={(event) => setObjective(event.target.value)} />
        <div className="statusPanel">
          <span>Status</span>
          <strong>{state?.status ?? "idle"}</strong>
          <small>{state?.run_id ?? "No active run"}</small>
        </div>
      </section>

      <section className="workspace">
        <div className="visualizer">
          <div className="panelHeader">
            <Activity size={18} />
            <h2>Workflow Visualization</h2>
          </div>
          <svg viewBox="0 0 860 340" role="img" aria-label="Agent workflow graph">
            {edges.map(([from, to]) => {
              const source = agents.find((agent) => agent.id === from)!;
              const target = agents.find((agent) => agent.id === to)!;
              const active = activeEdge === `${from}:${to}`;
              return (
                <line
                  key={`${from}-${to}`}
                  x1={source.x + 48}
                  y1={source.y + 32}
                  x2={target.x + 48}
                  y2={target.y + 32}
                  className={active ? "edge active" : "edge"}
                />
              );
            })}
            {agents.map((agent) => {
              const Icon = agent.icon;
              const active = state?.active_agent === agent.id;
              return (
                <g key={agent.id} transform={`translate(${agent.x}, ${agent.y})`} className={active ? "node active" : "node"}>
                  <rect width="116" height="72" rx="8" />
                  <Icon x="16" y="16" size={24} />
                  <text x="16" y="56">{agent.label}</text>
                </g>
              );
            })}
          </svg>
        </div>

        <div className="traceViewer">
          <div className="panelHeader">
            <Workflow size={18} />
            <h2>Execution Trace</h2>
          </div>
          <div className="traceList">
            {trace.map((event) => (
              <article key={event.id} className={`traceItem ${event.type.replace(".", "-")}`}>
                <span>{new Date(event.timestamp).toLocaleTimeString()}</span>
                <strong>{event.label}</strong>
                <small>{event.type}</small>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="details">
        <div className="planPanel">
          <h2>Plan</h2>
          {state?.plan.length ? null : <p>No plan generated yet.</p>}
          {state?.plan.map((step) => (
            <article key={step.id} className="planStep">
              <div>
                <strong>{step.title}</strong>
                <span>{step.objective}</span>
              </div>
              <small>{step.status}</small>
            </article>
          ))}
        </div>
        <div className="outputPanel">
          <h2>Streaming Response</h2>
          <p>{stream || "Streaming output will appear here while agents execute."}</p>
          {state?.final_answer ? <strong>{state.final_answer}</strong> : null}
        </div>
      </section>
    </main>
  );
}
