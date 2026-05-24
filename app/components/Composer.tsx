import { FormEvent } from "react";
import { Mic, Send } from "lucide-react";

type ComposerProps = {
  input: string;
  setInput: (value: string) => void;
  isSending: boolean;
  voiceSupported: boolean;
  recording: boolean;
  handleSubmit: (event: FormEvent<HTMLFormElement>) => void;
  toggleRecording: () => void;
};

export default function Composer({
  input,
  setInput,
  isSending,
  voiceSupported,
  recording,
  handleSubmit,
  toggleRecording,
}: ComposerProps) {
  return (
    <form className="composer" onSubmit={handleSubmit}>
      <div className="inputRow">
        <button
          type="button"
          className="micButton"
          disabled={!voiceSupported}
          onClick={toggleRecording}
          aria-label={recording ? "음성 인식 중지" : "음성 입력 시작"}
        >
          <Mic size={18} />
        </button>

        <input
          type="text"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="자비스, 무엇을 도와줄까?"
          disabled={isSending}
          aria-label="명령어 입력"
        />

        <button type="submit" disabled={!input.trim() || isSending} aria-label="전송">
          <Send size={18} />
        </button>
      </div>
    </form>
  );
}
