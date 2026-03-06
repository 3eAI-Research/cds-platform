import { useCustom } from "@refinedev/core";
import { List } from "@refinedev/antd";
import { Table, Tag, Button, Space, Typography } from "antd";
import {
  EyeOutlined,
  EnvironmentOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";

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
    <List title="Firma-Genehmigungen">
      <Table<Provider>
        dataSource={providers}
        rowKey="id"
        loading={isLoading}
        pagination={false}
        size="small"
      >
        <Table.Column<Provider>
          title="Firma"
          dataIndex="name"
          render={(name: string) => <Text strong>{name}</Text>}
        />
        <Table.Column<Provider>
          title="E-Mail"
          dataIndex="email"
        />
        <Table.Column<Provider>
          title="Telefon"
          dataIndex="phoneNumber"
        />
        <Table.Column<Provider>
          title="Status"
          dataIndex="status"
          render={(status: string) => (
            <Tag color={statusColors[status] ?? "default"}>{status}</Tag>
          )}
        />
        <Table.Column<Provider>
          title="PLZ-Gebiete"
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
          title="Registriert"
          dataIndex="createdAt"
          render={(d: string) => new Date(d).toLocaleDateString("de-DE")}
        />
        <Table.Column<Provider>
          title="Aktionen"
          render={(_, record) => (
            <Space>
              <Button
                size="small"
                icon={<EyeOutlined />}
                onClick={() => navigate(`/admin/providers/${record.id}`)}
              >
                Prüfen
              </Button>
            </Space>
          )}
        />
      </Table>
    </List>
  );
};

export default PendingProviders;
