import { useCustom } from "@refinedev/core";
import { List } from "@refinedev/antd";
import { Table, Tag, Typography } from "antd";
import { useTranslation } from "react-i18next";

const { Text } = Typography;

const stateColors: Record<string, string> = {
  COLLECTING: "processing",
  READY: "success",
  CANCELLED: "default",
  COMPLETED: "success",
};

interface AgentMessage {
  id: string;
  role: string;
  content: string;
  createdAt: string;
}

interface AgentSession {
  id: string;
  userId: string;
  state: string;
  messageCount: number;
  photoCount: number;
  messages?: AgentMessage[];
  createdAt: string;
}

export const AgentSessions = () => {
  const { t } = useTranslation();
  const role = localStorage.getItem("cds-role") || "admin";

  const { data, isLoading } = useCustom<{ items: AgentSession[]; total: number }>({
    url: "/agent/admin/sessions",
    method: "get",
    config: {
      query: { pageSize: 50 },
      headers: { "X-User-Role": role },
    },
  });

  const sessions = data?.data?.items ?? [];

  const expandedRowRender = (record: AgentSession) => {
    const messages = record.messages ?? [];
    if (messages.length === 0) {
      return <Text type="secondary">{t("common.noData")}</Text>;
    }
    return (
      <Table<AgentMessage>
        dataSource={messages}
        rowKey="id"
        pagination={false}
        size="small"
      >
        <Table.Column<AgentMessage>
          title={t("common.type")}
          dataIndex="role"
          render={(role: string) => (
            <Tag color={role === "user" ? "blue" : "green"}>{role}</Tag>
          )}
        />
        <Table.Column<AgentMessage>
          title={t("admin.messageCount")}
          dataIndex="content"
          render={(content: string) => (
            <Text style={{ fontSize: 12 }}>{content}</Text>
          )}
        />
        <Table.Column<AgentMessage>
          title={t("common.created")}
          dataIndex="createdAt"
          render={(d: string) => new Date(d).toLocaleString("de-DE")}
        />
      </Table>
    );
  };

  return (
    <List title={t("admin.agentSessions")}>
      <Table<AgentSession>
        dataSource={sessions}
        rowKey="id"
        loading={isLoading}
        pagination={false}
        size="small"
        expandable={{ expandedRowRender }}
      >
        <Table.Column<AgentSession>
          title="User ID"
          dataIndex="userId"
          render={(id: string) => <Text copyable={{ text: id }}>{id.slice(0, 8)}...</Text>}
        />
        <Table.Column<AgentSession>
          title={t("common.status")}
          dataIndex="state"
          render={(state: string) => (
            <Tag color={stateColors[state] ?? "default"}>{state}</Tag>
          )}
        />
        <Table.Column<AgentSession>
          title={t("admin.messageCount")}
          dataIndex="messageCount"
        />
        <Table.Column<AgentSession>
          title={t("admin.photoCount")}
          dataIndex="photoCount"
        />
        <Table.Column<AgentSession>
          title={t("common.created")}
          dataIndex="createdAt"
          render={(d: string) => new Date(d).toLocaleDateString("de-DE")}
        />
      </Table>
    </List>
  );
};

export default AgentSessions;
