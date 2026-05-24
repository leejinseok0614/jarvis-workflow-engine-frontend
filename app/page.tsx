"use client";

import { useEffect, useRef, useState } from "react";
import JarvisRing from "./components/JarvisRing";
import Composer from "./components/Composer";
import type { ChatMessage } from "./lib/types";

const initialMessages: ChatMessage[] = [
  {
    id: "welcome",
    role: "system",
    text: "자비스는 당신의 명령을 받습니다.",
    timestamp: new Date().toISOString(),
  },
];

export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [runId, setRunId] = useState<string | null>(null);
  const [assistantDraftId, setAssistantDraftId] = useState<string | null>(null);
  const [stream, setStream] = useState("");
  const [status, setStatus] = useState("idle");
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [recording, setRecording] = useState(false);
  const [ringState, setRingState] = useState<"idle" | "listening" | "speaking">("idle");
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    setVoiceSupported(true);
    const recognition = new SpeechRecognition();
    recognition.lang = "ko-KR";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      const transcript = event.results?.[0]?.[0]?.transcript;
      if (transcript) {
        setInput(transcript);
        void sendMessage(transcript);
      }
    };

    recognition.onend = () => {
      setRecording(false);
    };

    recognitionRef.current = recognition;
  }, []);

  useEffect(() => {
    if (status === "completed" || status === "failed") {
      setRingState("idle");
    }
  }, [status]);

  useEffect(() => {
    if (!runId) return;
    const source = new EventSource(`/api/workflows/${runId}/events`);

    source.onmessage = async (evt) => {
      const event = JSON.parse(evt.data) as Record<string, unknown>;
      const type = event.type as string;

      if (type === "workflow.started") {
        setStatus("running");
        setRingState("speaking");
      }

      if (type === "stream.chunk") {
        const label = event.label as string;
        setStream((current) => {
          const next = current ? `${current} ${label}` : label;
          if (assistantDraftId) {
            updateAssistantMessage(assistantDraftId, next);
          }
          return next;
        });
      }

      if (type === "workflow.completed" || type === "workflow.failed") {
        setIsSending(false);
        setStatus(type === "workflow.completed" ? "completed" : "failed");

        if (type === "workflow.completed") {
          const response = await fetch(`/api/workflows/${runId}/state`);
          if (response.ok) {
            const state = await response.json();
            const answer = state.final_answer ?? stream ?? "처리가 완료되었습니다.";
            if (assistantDraftId) updateAssistantMessage(assistantDraftId, answer);
          }
        } else if (assistantDraftId) {
          updateAssistantMessage(assistantDraftId, "문제가 발생했습니다. 다시 시도해 주세요.");
        }
      }
    };

    source.onerror = () => {
      source.close();
    };

    return () => {
      source.close();
    };
  }, [runId, assistantDraftId, stream]);

  const updateAssistantMessage = (id: string, text: string) => {
    setMessages((current) =>
      current.map((message) => (message.id === id ? { ...message, text } : message)),
    );
  };

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isSending) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      text: trimmed,
      timestamp: new Date().toISOString(),
    };

    const assistantId = `assistant-${Date.now()}`;
    const assistantMessage: ChatMessage = {
      id: assistantId,
      role: "assistant",
      text: "자비스가 내용을 이해하고 있습니다...",
      timestamp: new Date().toISOString(),
    };

    setMessages((current) => [...current, userMessage, assistantMessage]);
    setInput("");
    setIsSending(true);
    setStatus("running");
    setStream("");
    setAssistantDraftId(assistantId);

    const response = await fetch("/api/workflows/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        objective: trimmed,
        context: {
          source: "jarvis-ui-chat",
          requested_at: new Date().toISOString(),
          history: messages.map((message) => ({
            role: message.role,
            text: message.text,
            timestamp: message.timestamp,
          })),
        },
      }),
    });

    if (!response.ok) {
      setIsSending(false);
      setStatus("failed");
      setRingState("idle");
      updateAssistantMessage(assistantId, "서버 연결에 실패했습니다. 잠시 후 다시 시도해주세요.");
      return;
    }

    const body = await response.json();
    setRunId(body.run_id);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void sendMessage(input);
  };

  const toggleRecording = () => {
    if (!voiceSupported || !recognitionRef.current) return;
    if (recording) {
      recognitionRef.current.stop();
      setRecording(false);
      setRingState("idle");
      return;
    }
    recognitionRef.current.start();
    setRecording(true);
    setRingState("listening");
  };

  return (
    <main className="shell">
      <section className="jarvisScreen">
        <JarvisRing ringState={ringState} />
      </section>

      <Composer
        input={input}
        setInput={setInput}
        isSending={isSending}
        voiceSupported={voiceSupported}
        recording={recording}
        handleSubmit={handleSubmit}
        toggleRecording={toggleRecording}
      />
    </main>
  );
}
