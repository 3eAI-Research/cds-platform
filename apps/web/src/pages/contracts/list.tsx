import { useList } from "@refinedev/core";
import { List } from "@refinedev/antd";
import { Table, Tag, Typography, Space } from "antd";
import { CheckCircleOutlined, EuroOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

const { Text } = Typography;

const statusColors: Record<string, string> = {
  DRAFT: "default",
  PENDING_CUSTOMER: "processing",
  PENDING_PROVIDER: "processing",
  ACTIVE: "success",
  COMPLETED: "purple",
  CANCELLED: "error",
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
  const { t } = useTranslation();
  const { data, isLoading } = useList({ resource: "contracts" });

  const statusLabels: Record<string, string> = {
    DRAFT: t("contract.draft"),
    PENDING_CUSTOMER: t("contract.pendingCustomer"),
    PENDING_PROVIDER: t("contract.pendingProvider"),
    ACTIVE: t("contract.active"),
    COMPLETED: t("contract.completed"),
    CANCELLED: t("contract.cancelled"),
  };

  return (
    <List title={t("contract.title")}>
      <Table<ContractRecord>
        dataSource={data?.data as ContractRecord[]}
        scroll={{ x: 600 }}
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
          title={t("common.status")}
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
          title={t("common.price")}
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
          title={t("common.confirmation")}
          key="acceptance"
          width={160}
          render={(_, record) => (
            <Space size={4}>
              <Tag
                color={record.customerAcceptedAt ? "green" : "default"}
                icon={record.customerAcceptedAt ? <CheckCircleOutlined /> : undefined}
              >
                {t("auth.customer")}
              </Tag>
              <Tag
                color={record.providerAcceptedAt ? "green" : "default"}
                icon={record.providerAcceptedAt ? <CheckCircleOutlined /> : undefined}
              >
                {t("auth.provider")}
              </Tag>
            </Space>
          )}
        />
        <Table.Column<ContractRecord>
          title={t("contract.serviceDate")}
          dataIndex="serviceDate"
          width={110}
          render={(val: string) =>
            val ? new Date(val).toLocaleDateString("de-DE") : "—"
          }
        />
        <Table.Column<ContractRecord>
          title={t("common.created")}
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
