import { useList } from "@refinedev/core";
import { List } from "@refinedev/antd";
import { Table, Tag, Typography, Space } from "antd";
import { CheckCircleOutlined, EuroOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";

const { Text } = Typography;

const statusColors: Record<string, string> = {
  DRAFT: "default",
  PENDING_CUSTOMER: "processing",
  PENDING_PROVIDER: "processing",
  ACTIVE: "success",
  COMPLETED: "purple",
  CANCELLED: "error",
};

const statusLabels: Record<string, string> = {
  DRAFT: "Entwurf",
  PENDING_CUSTOMER: "Kundenbestätigung",
  PENDING_PROVIDER: "Anbieterbestätigung",
  ACTIVE: "Aktiv",
  COMPLETED: "Abgeschlossen",
  CANCELLED: "Storniert",
};

interface ContractRecord {
  id: string;
  status: string;
  agreedPriceAmount?: number;
  customerAcceptedAt?: string;
  providerAcceptedAt?: string;
  serviceDate?: string;
  createdAt: string;
}

export const ContractList = () => {
  const navigate = useNavigate();
  const { data, isLoading } = useList({ resource: "contracts" });

  return (
    <List title="Verträge">
      <Table<ContractRecord>
        dataSource={data?.data as ContractRecord[]}
        loading={isLoading}
        rowKey="id"
        pagination={{ pageSize: 20 }}
        onRow={(record) => ({
          onClick: () => navigate(`/contracts/${record.id}`),
          style: { cursor: "pointer" },
        })}
      >
        <Table.Column<ContractRecord>
          title="ID"
          dataIndex="id"
          width={100}
          render={(id: string) => <Text copyable={{ text: id }}>{id.slice(0, 8)}</Text>}
        />
        <Table.Column<ContractRecord>
          title="Status"
          dataIndex="status"
          width={160}
          render={(s: string) => (
            <Tag color={statusColors[s] ?? "default"}>
              {statusLabels[s] ?? s}
            </Tag>
          )}
          filters={Object.entries(statusLabels).map(([k, v]) => ({ text: v, value: k }))}
          onFilter={(value, record) => record.status === value}
        />
        <Table.Column<ContractRecord>
          title="Preis"
          dataIndex="agreedPriceAmount"
          width={120}
          render={(cents: number) =>
            cents ? (
              <Text>
                <EuroOutlined /> {(cents / 100).toFixed(2)}
              </Text>
            ) : (
              "—"
            )
          }
          sorter={(a, b) =>
            (a.agreedPriceAmount ?? 0) - (b.agreedPriceAmount ?? 0)
          }
        />
        <Table.Column<ContractRecord>
          title="Bestätigung"
          key="acceptance"
          width={160}
          render={(_, record) => (
            <Space size={4}>
              <Tag
                color={record.customerAcceptedAt ? "green" : "default"}
                icon={record.customerAcceptedAt ? <CheckCircleOutlined /> : undefined}
              >
                Kunde
              </Tag>
              <Tag
                color={record.providerAcceptedAt ? "green" : "default"}
                icon={record.providerAcceptedAt ? <CheckCircleOutlined /> : undefined}
              >
                Anbieter
              </Tag>
            </Space>
          )}
        />
        <Table.Column<ContractRecord>
          title="Servicedatum"
          dataIndex="serviceDate"
          width={110}
          render={(val: string) =>
            val ? new Date(val).toLocaleDateString("de-DE") : "—"
          }
        />
        <Table.Column<ContractRecord>
          title="Erstellt"
          dataIndex="createdAt"
          width={100}
          render={(d: string) => new Date(d).toLocaleDateString("de-DE")}
          defaultSortOrder="descend"
          sorter={(a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          }
        />
      </Table>
    </List>
  );
};

export default ContractList;
