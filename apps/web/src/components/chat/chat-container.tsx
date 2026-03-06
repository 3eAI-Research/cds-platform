import { useState, useEffect, useRef, useCallback } from "react";
import { Spin, Typography, message } from "antd";
import { RobotOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { ChatMessage } from "./chat-message";
import { ChatInput } from "./chat-input";
import { SummaryCard } from "./summary-card";

const { Text } = Typography;

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp?: string;
}

type SessionState =
  | "COLLECTING"
  | "SUMMARY"
  | "CONFIRMED"
  | "PLAN_READY"
  | "EXPIRED"
  | "ERROR";

const API_BASE = "/api/v1/agent";
const CREDITS_URL = "/api/v1/credits/balance";

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("cds-token") ?? "";
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

function formatTime(): string {
  return new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const ChatContainer: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [extractedData, setExtractedData] = useState<Record<string, unknown>>(
    {}
  );
  const [sessionState, setSessionState] = useState<SessionState>("COLLECTING");
  const [loading, setLoading] = useState(false);
  const [creditBalance, setCreditBalance] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading, scrollToBottom]);

  // Fetch credit balance
  const fetchBalance = useCallback(async () => {
    try {
      const res = await fetch(CREDITS_URL, {
        headers: authHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setCreditBalance(data.balance ?? data.credits ?? 0);
      }
    } catch {
      // ignore
    }
  }, []);

  // Create session on mount
  useEffect(() => {
    const createSession = async () => {
      try {
        const res = await fetch(`${API_BASE}/sessions`, {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({}),
        });
        if (res.ok) {
          const data = await res.json();
          setSessionId(data.id ?? data.sessionId);
          setMessages([
            {
              role: "assistant",
              content: t("agent.welcome"),
              timestamp: formatTime(),
            },
          ]);
        } else {
          setMessages([
            {
              role: "system",
              content: t("common.error"),
            },
          ]);
        }
      } catch {
        setMessages([
          {
            role: "system",
            content: t("common.error"),
          },
        ]);
      }
    };

    createSession();
    fetchBalance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSendMessage = async (text: string) => {
    if (!sessionId || loading) return;

    const userMsg: Message = {
      role: "user",
      content: text,
      timestamp: formatTime(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/sessions/${sessionId}/messages`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ content: text }),
      });

      if (!res.ok) {
        if (res.status === 410 || res.status === 404) {
          setSessionState("EXPIRED");
          setMessages((prev) => [
            ...prev,
            { role: "system", content: t("agent.sessionExpired") },
          ]);
          return;
        }
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();

      if (data.reply || data.message || data.content) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: data.reply ?? data.message ?? data.content,
            timestamp: formatTime(),
          },
        ]);
      }

      if (data.extractedData) {
        setExtractedData(data.extractedData);
      }
      if (data.state) {
        setSessionState(data.state as SessionState);
      }
    } catch {
      message.error(t("common.error"));
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = async (files: File[]) => {
    if (!sessionId || loading) return;

    setLoading(true);
    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        content: `${t("agent.photoAnalysis")} (${files.length} ${files.length === 1 ? "photo" : "photos"})`,
        timestamp: formatTime(),
      },
    ]);

    try {
      const formData = new FormData();
      files.forEach((file) => formData.append("photos", file));

      const token = localStorage.getItem("cds-token") ?? "";
      const res = await fetch(`${API_BASE}/sessions/${sessionId}/photos`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();

      if (data.reply || data.message || data.content) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: data.reply ?? data.message ?? data.content,
            timestamp: formatTime(),
          },
        ]);
      }

      if (data.extractedData) {
        setExtractedData(data.extractedData);
      }
      if (data.state) {
        setSessionState(data.state as SessionState);
      }
    } catch {
      message.error(t("common.error"));
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!sessionId || loading) return;
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/sessions/${sessionId}/confirm`, {
        method: "POST",
        headers: authHeaders(),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      setSessionState("CONFIRMED");
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            data.reply ?? data.message ?? t("demand.created"),
          timestamp: formatTime(),
        },
      ]);

      // Navigate to demand list after short delay
      setTimeout(() => navigate("/demands"), 2000);
    } catch {
      message.error(t("common.error"));
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReport = async () => {
    if (!sessionId || loading) return;
    if (creditBalance < 1) {
      message.warning(t("agent.buyCredits"));
      return;
    }
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/sessions/${sessionId}/plan`, {
        method: "POST",
        headers: authHeaders(),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      setSessionState("PLAN_READY");
      setCreditBalance((prev) => Math.max(0, prev - 1));

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            data.reply ?? data.message ?? "Report generated successfully.",
          timestamp: formatTime(),
        },
      ]);

      fetchBalance();
    } catch {
      message.error(t("common.error"));
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate("/demands");
  };

  const isInputDisabled =
    sessionState === "CONFIRMED" ||
    sessionState === "EXPIRED" ||
    sessionState === "ERROR";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "calc(100vh - 180px)",
        background: "#f8fafc",
        borderRadius: 12,
        overflow: "hidden",
        border: "1px solid #f0f0f0",
      }}
    >
      {/* Messages area */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "16px 16px 8px 16px",
        }}
      >
        {messages.map((msg, idx) => (
          <ChatMessage
            key={idx}
            role={msg.role}
            content={msg.content}
            timestamp={msg.timestamp}
          />
        ))}

        {/* Summary card when in SUMMARY state */}
        {sessionState === "SUMMARY" && (
          <SummaryCard
            extractedData={extractedData}
            onConfirm={handleConfirm}
            onGenerateReport={handleGenerateReport}
            onCancel={handleCancel}
            creditBalance={creditBalance}
            loading={loading}
          />
        )}

        {/* Typing indicator */}
        {loading && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 12,
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: "#f0f5ff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <RobotOutlined style={{ color: "#2563eb", fontSize: 16 }} />
            </div>
            <div
              style={{
                padding: "8px 14px",
                borderRadius: 12,
                background: "#ffffff",
                boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
              }}
            >
              <Spin size="small" />{" "}
              <Text type="secondary" style={{ fontSize: 12 }}>
                {t("agent.typing")}
              </Text>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input bar */}
      <ChatInput
        onSend={handleSendMessage}
        onPhotoUpload={handlePhotoUpload}
        disabled={isInputDisabled}
        loading={loading}
      />
    </div>
  );
};
