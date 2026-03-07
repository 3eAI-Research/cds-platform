import { useState, useEffect, useRef } from "react";
import { useCustom } from "@refinedev/core";
import { List, Badge, Input, Button, Typography, Space, Empty, Spin, Avatar } from "antd";
import { SendOutlined, UserOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { useSocket } from "../../hooks/useSocket";
import axios from "axios";

const { Text } = Typography;

interface ChatChannel {
  id: string;
  demandId: string;
  customerUserId: string;
  providerUserId: string;
  lastMessageAt: string | null;
  lastMessage: { content: string; senderUserId: string; createdAt: string } | null;
  unreadCount: number;
}

interface ChatMessage {
  id: string;
  channelId: string;
  senderUserId: string;
  content: string;
  createdAt: string;
  readAt: string | null;
}

export default function ChatPage() {
  const { t } = useTranslation();
  const role = localStorage.getItem("cds-role") || "customer";
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { on } = useSocket();

  // Determine current user ID based on role
  const currentUserId =
    role === "admin"
      ? "00000000-0000-0000-0000-000000000003"
      : role === "provider"
        ? "00000000-0000-0000-0000-000000000002"
        : "00000000-0000-0000-0000-000000000001";

  // Fetch channels
  const { data: channelData, isLoading: channelsLoading, refetch: refetchChannels } = useCustom<any>({
    url: "/chat/channels",
    method: "get",
    config: {
      query: { pageSize: 50 },
      headers: { "X-User-Role": role },
    },
  });

  const channels: ChatChannel[] = channelData?.data?.items ?? channelData?.data ?? [];

  // Fetch messages for selected channel
  const fetchMessages = async (channelId: string) => {
    try {
      const res = await axios.get(`/api/v1/chat/channels/${channelId}/messages`, {
        params: { pageSize: 100 },
        headers: { "X-User-Role": role },
      });
      const raw = res.data;
      const data = raw.data ?? raw;
      setMessages((data.items ?? data ?? []).reverse());
    } catch {
      setMessages([]);
    }
  };

  // Select channel
  const handleSelectChannel = async (channelId: string) => {
    setSelectedChannel(channelId);
    await fetchMessages(channelId);
    // Mark as read
    try {
      await axios.patch(`/api/v1/chat/channels/${channelId}/read`, null, {
        headers: { "X-User-Role": role },
      });
      refetchChannels();
    } catch {
      // silent
    }
  };

  // Send message
  const handleSend = async () => {
    if (!messageText.trim() || !selectedChannel) return;
    setSending(true);
    try {
      await axios.post(
        `/api/v1/chat/channels/${selectedChannel}/messages`,
        { content: messageText },
        { headers: { "X-User-Role": role } },
      );
      setMessageText("");
      await fetchMessages(selectedChannel);
      refetchChannels();
    } catch {
      // silent
    } finally {
      setSending(false);
    }
  };

  // Real-time: listen for new messages
  useEffect(() => {
    const unsub = on("NEW_MESSAGE", (event) => {
      const { channelId } = event.payload as { channelId: string };
      if (channelId === selectedChannel) {
        fetchMessages(channelId);
      }
      refetchChannels();
    });
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [on, selectedChannel]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const getPartnerLabel = (ch: ChatChannel) => {
    const partnerId = ch.customerUserId === currentUserId ? ch.providerUserId : ch.customerUserId;
    return partnerId.slice(0, 8) + "...";
  };

  return (
    <div className="cds-chat-container" style={{ display: "flex", height: "calc(100vh - 120px)", padding: 0 }}>
      {/* Left: Channel list */}
      <div
        className={`cds-chat-sidebar${selectedChannel ? " cds-chat-sidebar--hidden" : ""}`}
        style={{
          width: 320,
          borderRight: "1px solid #f0f0f0",
          overflow: "auto",
          background: "#fafafa",
        }}
      >
        <div style={{ padding: "12px 16px", borderBottom: "1px solid #f0f0f0" }}>
          <Text strong style={{ fontSize: 16 }}>
            {t("chat.title", "Messages")}
          </Text>
        </div>
        {channelsLoading ? (
          <Spin style={{ padding: 24, display: "block", textAlign: "center" }} />
        ) : channels.length === 0 ? (
          <Empty description={t("chat.noChannels", "No conversations yet")} style={{ padding: 24 }} image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <List
            dataSource={channels}
            renderItem={(ch) => (
              <List.Item
                onClick={() => handleSelectChannel(ch.id)}
                style={{
                  padding: "12px 16px",
                  cursor: "pointer",
                  background: selectedChannel === ch.id ? "#e6f4ff" : undefined,
                }}
              >
                <List.Item.Meta
                  avatar={<Avatar icon={<UserOutlined />} />}
                  title={
                    <Space>
                      <Text>{getPartnerLabel(ch)}</Text>
                      {ch.unreadCount > 0 && <Badge count={ch.unreadCount} size="small" />}
                    </Space>
                  }
                  description={
                    <Text type="secondary" ellipsis style={{ fontSize: 12, maxWidth: 200 }}>
                      {ch.lastMessage?.content ?? t("chat.noMessages", "No messages")}
                    </Text>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </div>

      {/* Right: Messages */}
      <div className="cds-chat-messages" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {!selectedChannel ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Text type="secondary">{t("chat.selectChannel", "Select a conversation")}</Text>
          </div>
        ) : (
          <>
            {/* Back button (visible on mobile via CSS) */}
            <div className="cds-chat-back" style={{ padding: "8px 16px", borderBottom: "1px solid #f0f0f0" }}>
              <Button size="small" onClick={() => setSelectedChannel(null)}>
                ← {t("common.back", "Back")}
              </Button>
            </div>
            {/* Messages area */}
            <div style={{ flex: 1, overflow: "auto", padding: 16 }}>
              {messages.map((msg) => {
                const isMine = msg.senderUserId === currentUserId;
                return (
                  <div
                    key={msg.id}
                    style={{
                      display: "flex",
                      justifyContent: isMine ? "flex-end" : "flex-start",
                      marginBottom: 8,
                    }}
                  >
                    <div
                      style={{
                        maxWidth: "70%",
                        padding: "8px 12px",
                        borderRadius: 12,
                        background: isMine ? "#2563eb" : "#f0f0f0",
                        color: isMine ? "#fff" : "#000",
                      }}
                    >
                      <div>{msg.content}</div>
                      <div style={{ fontSize: 10, opacity: 0.7, marginTop: 4, textAlign: "right" }}>
                        {new Date(msg.createdAt).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input area */}
            <div style={{ padding: "8px 16px", borderTop: "1px solid #f0f0f0", display: "flex", gap: 8 }}>
              <Input
                placeholder={t("chat.typeMessage", "Type a message...")}
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onPressEnter={handleSend}
                disabled={sending}
              />
              <Button
                type="primary"
                icon={<SendOutlined />}
                onClick={handleSend}
                loading={sending}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
