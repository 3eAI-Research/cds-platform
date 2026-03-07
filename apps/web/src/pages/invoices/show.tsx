import { useCustom } from "@refinedev/core";
import { useParams, useNavigate } from "react-router-dom";
import { Descriptions, Tag, Button, Card, Space } from "antd";
import { ArrowLeftOutlined, DownloadOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";

const statusColors: Record<string, string> = {
  DRAFT: "default",
  ISSUED: "blue",
  PAID: "green",
  CANCELLED: "red",
};

export default function InvoiceShow() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const role = localStorage.getItem("cds-role") || "customer";

  const { data, isLoading } = useCustom<any>({
    url: `/invoices/${id}`,
    method: "get",
    config: { headers: { "X-User-Role": role } },
  });

  const invoice = data?.data?.data ?? data?.data ?? {};
  const formatEur = (cents: number) => `\u20AC${((cents || 0) / 100).toFixed(2)}`;

  if (isLoading) return <div style={{ padding: 24 }}>Loading...</div>;

  return (
    <div style={{ padding: 24 }}>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate("/invoices")}>
          {t("common.back", "Back")}
        </Button>
        {invoice.pdfKey && (
          <Button
            type="primary"
            icon={<DownloadOutlined />}
            onClick={() => window.open(`/api/v1/invoices/${id}/download`, "_blank")}
          >
            {t("invoice.downloadPdf", "Download PDF")}
          </Button>
        )}
      </Space>

      <Card title={`${t("invoice.title", "Invoice")} ${invoice.invoiceNumber || ""}`}>
        <Descriptions bordered column={2}>
          <Descriptions.Item label={t("invoice.status", "Status")}>
            <Tag color={statusColors[invoice.status] || "default"}>{invoice.status}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label={t("invoice.number", "Invoice #")}>{invoice.invoiceNumber}</Descriptions.Item>
          <Descriptions.Item label={t("invoice.customer", "Customer")}>{invoice.customerName}</Descriptions.Item>
          <Descriptions.Item label={t("invoice.provider", "Provider")}>{invoice.providerName}</Descriptions.Item>
          <Descriptions.Item label={t("invoice.subtotal", "Subtotal")}>{formatEur(invoice.subtotalAmount)}</Descriptions.Item>
          <Descriptions.Item label={`${t("invoice.vat", "VAT")} (${invoice.vatRate}%)`}>{formatEur(invoice.vatAmount)}</Descriptions.Item>
          <Descriptions.Item label={`${t("invoice.commission", "Commission")} (${invoice.commissionRate}%)`}>{formatEur(invoice.commissionAmount)}</Descriptions.Item>
          <Descriptions.Item label={t("invoice.total", "Total")}><strong>{formatEur(invoice.totalAmount)}</strong></Descriptions.Item>
          <Descriptions.Item label={t("invoice.service", "Service")} span={2}>{invoice.serviceDescription}</Descriptions.Item>
          <Descriptions.Item label={t("invoice.date", "Date")}>{invoice.createdAt ? new Date(invoice.createdAt).toLocaleDateString("de-DE") : "-"}</Descriptions.Item>
          <Descriptions.Item label={t("invoice.issuedAt", "Issued At")}>{invoice.issuedAt ? new Date(invoice.issuedAt).toLocaleDateString("de-DE") : "-"}</Descriptions.Item>
        </Descriptions>
      </Card>
    </div>
  );
}
