import { Typography } from "antd";
import { RobotOutlined } from "@ant-design/icons";

const { Text } = Typography;

interface ChatMessageProps {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp?: string;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({
  role,
  content,
  timestamp,
}) => {
  if (role === "system") {
    return (
      <div style={{ textAlign: "center", margin: "8px 0" }}>
        <Text type="secondary" italic style={{ fontSize: 12 }}>
          {content}
        </Text>
      </div>
    );
  }

  const isUser = role === "user";

  return (
    <div
      style={{
        display: "flex",
        justifyContent: isUser ? "flex-end" : "flex-start",
        marginBottom: 12,
      }}
    >
      {!isUser && (
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: "#f0f5ff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginRight: 8,
            flexShrink: 0,
          }}
        >
          <RobotOutlined style={{ color: "#2563eb", fontSize: 16 }} />
        </div>
      )}
      <div
        style={{
          maxWidth: "70%",
          padding: "10px 14px",
          borderRadius: 12,
          background: isUser ? "#2563eb" : "#ffffff",
          color: isUser ? "#ffffff" : "rgba(0, 0, 0, 0.88)",
          boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
          wordBreak: "break-word",
          whiteSpace: "pre-wrap",
        }}
      >
        <div>{content}</div>
        {timestamp && (
          <div
            style={{
              fontSize: 10,
              marginTop: 4,
              opacity: 0.7,
              textAlign: "right",
            }}
          >
            {timestamp}
          </div>
        )}
      </div>
    </div>
  );
};
