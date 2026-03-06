import { useCustom } from "@refinedev/core";
import { List } from "@refinedev/antd";
import { Table, Tag, Button, Space, Typography } from "antd";
import {
  EyeOutlined,
  EnvironmentOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

const { Text } = Typography;

const statusColors: Record<string, string> = {
  PENDING: "processing",
  ACTIVE: "success",
  SUSPENDED: "warning",
  DEACTIVATED: "default",
};

interface Provider {
  id: string;
  name: string;
  email: string;
  phoneNumber: string;
  status: string;
  supportedPostCodePrefixes: string[];
  createdAt: string;
}

export const PendingProviders = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const role = localStorage.getItem("cds-role") || "admin";

  const { data, isLoading } = useCustom<{ items: Provider[]; total: number }>({
    url: "/providers",
    method: "get",
    config: {
      query: { status: "PENDING", pageSize: 50 },
      headers: { "X-User-Role": role },
    },
  });

  const providers = data?.data?.items ?? [];

  return (
    <List title={t("admin.pendingProviders")}>
      <Table<Provider>
        dataSource={providers}
        rowKey="id"
        loading={isLoading}
        pagination={false}
        size="small"
      >
        <Table.Column<Provider>
          title={t("provider.name")}
          dataIndex="name"
          render={(name: string) => <Text strong>{name}</Text>}
        />
        <Table.Column<Provider>
          title={t("provider.email")}
          dataIndex="email"
        />
        <Table.Column<Provider>
          title={t("provider.phone")}
          dataIndex="phoneNumber"
        />
        <Table.Column<Provider>
          title={t("common.status")}
          dataIndex="status"
          render={(status: string) => (
            <Tag color={statusColors[status] ?? "default"}>{status}</Tag>
          )}
        />
        <Table.Column<Provider>
          title={t("provider.plzAreas")}
          dataIndex="supportedPostCodePrefixes"
          render={(prefixes: string[]) => (
            <Space wrap size={2}>
              {(prefixes ?? []).slice(0, 5).map((p) => (
                <Tag key={p} icon={<EnvironmentOutlined />} style={{ fontSize: 11 }}>
                  {p}
                </Tag>
              ))}
              {(prefixes ?? []).length > 5 && (
                <Text type="secondary" style={{ fontSize: 11 }}>
                  +{prefixes.length - 5}
                </Text>
              )}
            </Space>
          )}
        />
        <Table.Column<Provider>
          title={t("common.created")}
          dataIndex="createdAt"
          render={(d: string) => new Date(d).toLocaleDateString("de-DE")}
        />
        <Table.Column<Provider>
          title={t("common.actions")}
          render={(_, record) => (
            <Space>
              <Button
                size="small"
                icon={<EyeOutlined />}
                onClick={() => navigate(`/admin/providers/${record.id}`)}
              >
                {t("admin.review")}
              </Button>
            </Space>
          )}
        />
      </Table>
    </List>
  );
};

export default PendingProviders;
