import { useList } from "@refinedev/core";
import { List } from "@refinedev/antd";
import { Table, Tag, Typography, Button, Space, message } from "antd";
import { EuroOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import axios from "axios";

const { Text } = Typography;

const statusColors: Record<string, string> = {
  PENDING: "processing",
  COMPLETED: "success",
  FAILED: "error",
  REFUNDED: "warning",
};

interface PaymentRecord {
  id: string;
  contractId: string;
  status: string;
  amount: number;
  currency: string;
  createdAt: string;
}

export const PaymentList = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const role = localStorage.getItem("cds-role") || "customer";

  const { data, isLoading, refetch } = useList({
    resource: "payments",
    pagination: { pageSize: 20 },
  });

  const handleAction = async (paymentId: string, action: "complete" | "fail" | "refund") => {
    try {
      await axios.patch(`/api/v1/payments/${paymentId}/${action}`, null, {
        headers: { "X-User-Role": role },
      });
      message.success(
        action === "complete"
          ? t("payment.completed")
          : action === "fail"
            ? t("payment.failed")
            : t("payment.refunded")
      );
      refetch();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Fehler";
      message.error(errorMsg);
    }
  };

  return (
    <List title={t("payment.title")}>
      <Table<PaymentRecord>
        dataSource={data?.data as PaymentRecord[]}
        loading={isLoading}
        rowKey="id"
        pagination={{ pageSize: 20 }}
      >
        <Table.Column<PaymentRecord>
          title="ID"
          dataIndex="id"
          width={100}
          render={(id: string) => <Text copyable={{ text: id }}>{id.slice(0, 8)}</Text>}
        />
        <Table.Column<PaymentRecord>
          title={t("common.amount")}
          dataIndex="amount"
          width={120}
          render={(cents: number) => (
            <Text strong>
              <EuroOutlined /> {(cents / 100).toFixed(2)}
            </Text>
          )}
          sorter={(a, b) => a.amount - b.amount}
        />
        <Table.Column<PaymentRecord>
          title={t("common.status")}
          dataIndex="status"
          width={120}
          render={(s: string) => (
            <Tag color={statusColors[s] ?? "default"}>{s}</Tag>
          )}
          filters={Object.keys(statusColors).map((s) => ({ text: s, value: s }))}
          onFilter={(value, record) => record.status === value}
        />
        <Table.Column<PaymentRecord>
          title={t("payment.contract")}
          dataIndex="contractId"
          render={(id: string) =>
            id ? (
              <Button
                type="link"
                size="small"
                onClick={() => navigate(`/contracts/${id}`)}
              >
                {id.slice(0, 8)}...
              </Button>
            ) : (
              "—"
            )
          }
        />
        <Table.Column<PaymentRecord>
          title={t("common.created")}
          dataIndex="createdAt"
          width={100}
          render={(d: string) => new Date(d).toLocaleDateString("de-DE")}
          defaultSortOrder="descend"
          sorter={(a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          }
        />
        <Table.Column<PaymentRecord>
          title={t("common.actions")}
          key="actions"
          width={200}
          render={(_, record) => (
            <Space size={4}>
              {record.status === "PENDING" && (
                <>
                  <Button
                    size="small"
                    type="primary"
                    onClick={() => handleAction(record.id, "complete")}
                  >
                    {t("payment.complete")}
                  </Button>
                  <Button
                    size="small"
                    danger
                    onClick={() => handleAction(record.id, "fail")}
                  >
                    {t("payment.fail")}
                  </Button>
                </>
              )}
              {record.status === "COMPLETED" && (
                <Button
                  size="small"
                  onClick={() => handleAction(record.id, "refund")}
                >
                  {t("payment.refund")}
                </Button>
              )}
            </Space>
          )}
        />
      </Table>
    </List>
  );
};

export default PaymentList;
