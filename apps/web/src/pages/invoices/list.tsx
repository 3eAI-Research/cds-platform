import { useCustom } from "@refinedev/core";
import { Table, Tag, Button, Space } from "antd";
import { EyeOutlined, DownloadOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

const statusColors: Record<string, string> = {
  DRAFT: "default",
  ISSUED: "blue",
  PAID: "green",
  CANCELLED: "red",
};

export default function InvoiceList() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const role = localStorage.getItem("cds-role") || "customer";

  const { data, isLoading } = useCustom<any>({
    url: role === "admin" ? "/invoices/admin/all" : "/invoices",
    method: "get",
    config: {
      query: { pageSize: 50 },
      headers: { "X-User-Role": role },
    },
  });

  const invoices = data?.data?.items ?? data?.data ?? [];

  const formatEur = (cents: number) => `\u20AC${(cents / 100).toFixed(2)}`;

  return (
    <div style={{ padding: 24 }}>
      <h2>{t("invoice.title", "Invoices")}</h2>
      <Table
        dataSource={invoices}
        rowKey="id"
        loading={isLoading}
        pagination={{ pageSize: 20 }}
        columns={[
          {
            title: t("invoice.number", "Invoice #"),
            dataIndex: "invoiceNumber",
            key: "invoiceNumber",
          },
          {
            title: t("invoice.status", "Status"),
            dataIndex: "status",
            key: "status",
            render: (status: string) => (
              <Tag color={statusColors[status] || "default"}>{status}</Tag>
            ),
          },
          {
            title: t("invoice.total", "Total"),
            dataIndex: "totalAmount",
            key: "totalAmount",
            render: (v: number) => formatEur(v),
          },
          {
            title: t("invoice.vat", "VAT"),
            dataIndex: "vatAmount",
            key: "vatAmount",
            render: (v: number) => formatEur(v),
          },
          {
            title: t("invoice.commission", "Commission"),
            dataIndex: "commissionAmount",
            key: "commissionAmount",
            render: (v: number) => formatEur(v),
          },
          {
            title: t("invoice.date", "Date"),
            dataIndex: "createdAt",
            key: "createdAt",
            render: (v: string) => new Date(v).toLocaleDateString("de-DE"),
          },
          {
            title: t("common.actions", "Actions"),
            key: "actions",
            render: (_: unknown, record: any) => (
              <Space>
                <Button
                  type="link"
                  icon={<EyeOutlined />}
                  onClick={() => navigate(`/invoices/${record.id}`)}
                />
                {record.pdfKey && (
                  <Button
                    type="link"
                    icon={<DownloadOutlined />}
                    onClick={() => window.open(`/api/v1/invoices/${record.id}/download`, "_blank")}
                  />
                )}
              </Space>
            ),
          },
        ]}
      />
    </div>
  );
}
