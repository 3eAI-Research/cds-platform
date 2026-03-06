import { useCustom } from "@refinedev/core";
import { List } from "@refinedev/antd";
import { Table, Tabs, Tag, Typography } from "antd";
import { useTranslation } from "react-i18next";

const { Text } = Typography;

interface CreditBalance {
  id: string;
  userId: string;
  balance: number;
  updatedAt: string;
}

interface PaymentTransaction {
  id: string;
  userId: string;
  packName: string;
  amount: number;
  credits: number;
  status: string;
  stripeSessionId: string;
  createdAt: string;
}

const paymentStatusColors: Record<string, string> = {
  COMPLETED: "success",
  PENDING: "processing",
  FAILED: "error",
  REFUNDED: "warning",
};

export const CreditOverview = () => {
  const { t } = useTranslation();
  const role = localStorage.getItem("cds-role") || "admin";

  const { data: balancesData, isLoading: balancesLoading } = useCustom<{
    items: CreditBalance[];
    total: number;
  }>({
    url: "/credits/admin/balances",
    method: "get",
    config: {
      query: { pageSize: 50 },
      headers: { "X-User-Role": role },
    },
  });

  const { data: paymentsData, isLoading: paymentsLoading } = useCustom<{
    items: PaymentTransaction[];
    total: number;
  }>({
    url: "/payments/admin/transactions",
    method: "get",
    config: {
      query: { pageSize: 50 },
      headers: { "X-User-Role": role },
    },
  });

  const balances = balancesData?.data?.items ?? [];
  const payments = paymentsData?.data?.items ?? [];

  return (
    <List title={t("admin.creditOverview")}>
      <Tabs
        defaultActiveKey="balances"
        items={[
          {
            key: "balances",
            label: t("admin.balances"),
            children: (
              <Table<CreditBalance>
                dataSource={balances}
                rowKey="id"
                loading={balancesLoading}
                pagination={false}
                size="small"
              >
                <Table.Column<CreditBalance>
                  title="User ID"
                  dataIndex="userId"
                  render={(id: string) => (
                    <Text copyable={{ text: id }}>{id.slice(0, 8)}...</Text>
                  )}
                />
                <Table.Column<CreditBalance>
                  title={t("admin.credits")}
                  dataIndex="balance"
                  render={(balance: number) => (
                    <Text strong>{balance}</Text>
                  )}
                />
                <Table.Column<CreditBalance>
                  title={t("common.created")}
                  dataIndex="updatedAt"
                  render={(d: string) => new Date(d).toLocaleDateString("de-DE")}
                />
              </Table>
            ),
          },
          {
            key: "payments",
            label: t("admin.payments"),
            children: (
              <Table<PaymentTransaction>
                dataSource={payments}
                rowKey="id"
                loading={paymentsLoading}
                pagination={false}
                size="small"
              >
                <Table.Column<PaymentTransaction>
                  title="User ID"
                  dataIndex="userId"
                  render={(id: string) => (
                    <Text copyable={{ text: id }}>{id.slice(0, 8)}...</Text>
                  )}
                />
                <Table.Column<PaymentTransaction>
                  title={t("admin.packName")}
                  dataIndex="packName"
                />
                <Table.Column<PaymentTransaction>
                  title={t("common.amount")}
                  dataIndex="amount"
                  render={(amount: number) => `${(amount / 100).toFixed(2)} EUR`}
                />
                <Table.Column<PaymentTransaction>
                  title={t("admin.credits")}
                  dataIndex="credits"
                />
                <Table.Column<PaymentTransaction>
                  title={t("common.status")}
                  dataIndex="status"
                  render={(status: string) => (
                    <Tag color={paymentStatusColors[status] ?? "default"}>
                      {status}
                    </Tag>
                  )}
                />
                <Table.Column<PaymentTransaction>
                  title={t("admin.stripeSession")}
                  dataIndex="stripeSessionId"
                  render={(id: string) =>
                    id ? (
                      <Text copyable={{ text: id }} style={{ fontSize: 11 }}>
                        {id.slice(0, 12)}...
                      </Text>
                    ) : (
                      "-"
                    )
                  }
                />
                <Table.Column<PaymentTransaction>
                  title={t("common.created")}
                  dataIndex="createdAt"
                  render={(d: string) => new Date(d).toLocaleDateString("de-DE")}
                />
              </Table>
            ),
          },
        ]}
      />
    </List>
  );
};

export default CreditOverview;
