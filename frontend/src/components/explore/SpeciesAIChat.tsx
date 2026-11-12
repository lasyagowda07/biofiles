"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import type { FormEvent } from "react";

import {
  ArrowSquareOut,
  BookOpen,
  ChatCircleDots,
  PaperPlaneTilt,
  Robot,
  SpinnerGap,
  WarningCircle,
} from "@phosphor-icons/react";

import {
  askSpeciesAI,
  type SpeciesAISource,
} from "@/lib/species-ai";

// --------------------------------------------------
// TYPES
// --------------------------------------------------

type SpeciesAIChatProps = {
  speciesId: number;
  speciesName: string;
};

type ChatMessage = {
  id: number;
  role: "user" | "assistant";
  content: string;
  sources?: SpeciesAISource[];
  answerable?: boolean;
};

// --------------------------------------------------
// SUGGESTED QUESTIONS
// --------------------------------------------------

const SUGGESTED_QUESTIONS = [
  "What does this species eat?",
  "Where is this species commonly found?",
  "What makes this species unique?",
];

// --------------------------------------------------
// COMPONENT
// --------------------------------------------------

export default function SpeciesAIChat({
  speciesId,
  speciesName,
}: SpeciesAIChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const [question, setQuestion] = useState("");

  const [isAsking, setIsAsking] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const nextMessageId = useRef(1);

  const requestInProgress = useRef(false);

  // --------------------------------------------------
  // AUTO SCROLL
  // --------------------------------------------------

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  }, [messages, isAsking]);

  // --------------------------------------------------
  // ASK QUESTION
  // --------------------------------------------------

  async function handleAsk(customQuestion?: string) {
    const text = (customQuestion ?? question).trim();

    if (!text || requestInProgress.current) return;

    requestInProgress.current = true;

    setIsAsking(true);
    setError(null);
    setQuestion("");

    const userMessage: ChatMessage = {
      id: nextMessageId.current++,
      role: "user",
      content: text,
    };

    setMessages((previous) => [...previous, userMessage]);

    try {
      const result = await askSpeciesAI(speciesId, text);

      const assistantMessage: ChatMessage = {
        id: nextMessageId.current++,
        role: "assistant",
        content: result.answer,
        sources: result.sources,
        answerable: result.answerable,
      };

      setMessages((previous) => [
        ...previous,
        assistantMessage,
      ]);
    } catch (caughtError) {
      console.error("BioFiles AI error:", caughtError);

      setError(
        "BioFiles AI couldn't answer that question. Please try again."
      );

      // Restore the question so the user can retry.
      setQuestion(text);
    } finally {
      requestInProgress.current = false;
      setIsAsking(false);
    }
  }

  // --------------------------------------------------
  // FORM SUBMISSION
  // --------------------------------------------------

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    void handleAsk();
  }

  // --------------------------------------------------
  // RENDER
  // --------------------------------------------------

  return (
    <section className="mt-8 border-[3px] border-[#254d32] bg-[#fffdf7] shadow-[5px_5px_0_#254d32]">
      {/* CHAT TITLE BAR */}

      <div className="flex items-center justify-between gap-3 border-b-[3px] border-[#254d32] bg-[#a8bfa0] px-4 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <Robot
            size={24}
            weight="duotone"
            className="shrink-0"
          />

          <div className="min-w-0">
            <h3 className="font-[family-name:var(--font-press-start)] text-[9px] leading-relaxed">
              BIOFILES AI
            </h3>

            <p className="mt-1 truncate font-[family-name:var(--font-space-mono)] text-[11px]">
              RESEARCHING: {speciesName}
            </p>
          </div>
        </div>

        <span className="shrink-0 border-2 border-[#254d32] bg-[#dce8d6] px-2 py-1 font-[family-name:var(--font-space-mono)] text-[9px] font-bold">
          ONLINE
        </span>
      </div>

      {/* CHAT MESSAGES */}

      <div className="max-h-[420px] min-h-[220px] space-y-5 overflow-y-auto bg-[#f5f1e6] p-4 md:p-5">
        {/* WELCOME MESSAGE */}

        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center border-2 border-[#254d32] bg-[#a8bfa0]">
            <Robot size={20} weight="duotone" />
          </div>

          <div className="min-w-0 flex-1 border-2 border-[#254d32] bg-[#fffdf7] p-4">
            <p className="font-[family-name:var(--font-dm-sans)] text-sm leading-6">
              Hello! I'm BioFiles AI. Ask me anything about{" "}
              <strong>{speciesName}</strong>.
            </p>

            <p className="mt-2 font-[family-name:var(--font-dm-sans)] text-xs leading-5 text-[#58705b]">
              My answers are grounded in Wikipedia research,
              with sources you can explore.
            </p>
          </div>
        </div>

        {/* SUGGESTED QUESTIONS */}

        {messages.length === 0 && (
          <div className="space-y-2 pl-0 md:pl-12">
            <p className="mb-3 font-[family-name:var(--font-space-mono)] text-[10px] font-bold">
              TRY ASKING:
            </p>

            {SUGGESTED_QUESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                disabled={isAsking}
                onClick={() => void handleAsk(suggestion)}
                className="block w-full border-2 border-[#254d32] bg-[#dce8d6] px-3 py-3 text-left font-[family-name:var(--font-dm-sans)] text-xs leading-5 transition-colors hover:bg-[#a8bfa0] disabled:opacity-60"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}

        {/* CONVERSATION */}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex items-start gap-3 ${
              message.role === "user"
                ? "flex-row-reverse"
                : ""
            }`}
          >
            {/* AVATAR */}

            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center border-2 border-[#254d32] ${
                message.role === "user"
                  ? "bg-[#e7a977]"
                  : "bg-[#a8bfa0]"
              }`}
            >
              {message.role === "user" ? (
                <ChatCircleDots size={20} weight="duotone" />
              ) : (
                <Robot size={20} weight="duotone" />
              )}
            </div>

            {/* MESSAGE */}

            <div
              className={`min-w-0 max-w-[85%] border-2 border-[#254d32] p-4 ${
                message.role === "user"
                  ? "bg-[#e7a977]"
                  : "bg-[#fffdf7]"
              }`}
            >
              <p className="whitespace-pre-wrap break-words font-[family-name:var(--font-dm-sans)] text-sm leading-6">
                {message.content}
              </p>

              {/* CITATIONS */}

              {message.role === "assistant" &&
                message.sources &&
                message.sources.length > 0 && (
                  <div className="mt-4 border-t-2 border-[#b9c8af] pt-3">
                    <div className="mb-3 flex items-center gap-2">
                      <BookOpen size={16} weight="duotone" />

                      <span className="font-[family-name:var(--font-space-mono)] text-[10px] font-bold">
                        SOURCES
                      </span>
                    </div>

                    <div className="space-y-2">
                      {message.sources.map((source) => (
                        <a
                          key={`${message.id}-${source.chunk_index}`}
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-start gap-2 border-2 border-[#254d32] bg-[#f5f1e6] px-3 py-2 text-xs transition-colors hover:bg-[#dce8d6]"
                        >
                          <ArrowSquareOut
                            size={15}
                            weight="bold"
                            className="mt-0.5 shrink-0"
                          />

                          <span className="min-w-0 break-words font-[family-name:var(--font-dm-sans)] leading-5">
                            {source.source_name}:{" "}
                            {source.section}
                          </span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
            </div>
          </div>
        ))}

        {/* AI LOADING */}

        {isAsking && (
          <div
            role="status"
            className="flex items-start gap-3"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center border-2 border-[#254d32] bg-[#a8bfa0]">
              <Robot size={20} weight="duotone" />
            </div>

            <div className="flex items-center gap-3 border-2 border-[#254d32] bg-[#fffdf7] px-4 py-3">
              <SpinnerGap
                size={19}
                className="animate-spin"
              />

              <span className="font-[family-name:var(--font-space-mono)] text-xs">
                ANALYZING FIELD NOTES...
              </span>
            </div>
          </div>
        )}

        {/* ERROR */}

        {error && (
          <div
            role="alert"
            className="flex items-start gap-3 border-2 border-[#b54738] bg-[#fff0e9] p-4 text-[#9e382b]"
          >
            <WarningCircle
              size={20}
              weight="bold"
              className="shrink-0"
            />

            <p className="font-[family-name:var(--font-dm-sans)] text-xs leading-5">
              {error}
            </p>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* QUESTION INPUT */}

      <form
        onSubmit={handleSubmit}
        className="border-t-[3px] border-[#254d32] bg-[#fffdf7] p-4"
      >
        <label
          htmlFor={`species-question-${speciesId}`}
          className="mb-3 block font-[family-name:var(--font-space-mono)] text-[10px] font-bold"
        >
          ASK A QUESTION
        </label>

        <div className="flex items-stretch gap-2">
          <input
            id={`species-question-${speciesId}`}
            type="text"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder={`Ask about ${speciesName}...`}
            maxLength={1000}
            disabled={isAsking}
            className="min-w-0 flex-1 border-2 border-[#254d32] bg-[#f5f1e6] px-3 py-3 font-[family-name:var(--font-dm-sans)] text-sm outline-none focus:bg-white disabled:opacity-60"
          />

          <button
            type="submit"
            disabled={!question.trim() || isAsking}
            aria-label="Send question"
            className="flex w-12 shrink-0 items-center justify-center border-2 border-[#254d32] bg-[#e7a977] transition-colors hover:bg-[#f3c69b] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isAsking ? (
              <SpinnerGap
                size={19}
                className="animate-spin"
              />
            ) : (
              <PaperPlaneTilt
                size={20}
                weight="bold"
              />
            )}
          </button>
        </div>

        <p className="mt-3 font-[family-name:var(--font-space-mono)] text-[9px] leading-4 text-[#58705b]">
          Answers are generated from indexed Wikipedia
          research. Verify important information using
          the cited sources.
        </p>
      </form>
    </section>
  );
}