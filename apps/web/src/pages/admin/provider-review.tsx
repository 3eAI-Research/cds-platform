import { useCustom } from "@refinedev/core";
import { Show } from "@refinedev/antd";
import {
  Typography,
  Descriptions,
  Tag,
  Spin,
  Card,
  Row,
  Col,
  Button,
  Space,
  message,
  Empty,
  Modal,
  Input,
  Table,
  Tooltip,
} from "antd";
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  DownloadOutlined,
  FilePdfOutlined,
  FileImageOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { useState } from "react";

const { Text, Title } = Typography;

const statusColors: Record<string, string> = {
  PENDING: "processing",
  ACTIVE: "success",
  SUSPENDED: "warning",
  DEACTIVATED: "default",
};

interface ProviderDocument {
  id: string;
  companyId: string;
  type: string;
  mimeType: string;
  fileSize: number;
  originalFilename: string;
  verified: boolean;
  verifiedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
}

const docTypeLabels: Record<string, string> = {
  BUSINESS_LICENSE: "Gewerbeschein",
  INSURANCE: "Versicherung",
  COMMERCIAL_REGISTER: "Handelsregister",
  OTHER: "Sonstiges",
};

const fileIcon = (mimeType: string) =>
  mimeType === "application/pdf" ? <FilePdfOutlined /> : <FileImageOutlined />;

export const ProviderReview = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const role = localStorage.getItem("cds-role") || "admin";
  const [rejectionReason, setRejectionReason] = useState("");

  // Fetch provider with admin detail (includes documents)
  const { data, isLoading, refetch } = useCustom({
    url: `/providers/${id}/admin`,
    method: "get",
    config: { headers: { "X-User-Role": role } },
    queryOptions: { enabled: !!id },
  });

  const provider = data?.data as Record<string, unknown> | undefined;
  const documents = (provider?.documents as ProviderDocument[]) ?? [];

  const handleApprove = async () => {
    Modal.confirm({
      title: "Firma genehmigen?",
      icon: <CheckCircleOutlined style={{ color: "#52c41a" }} />,
      content: "Die Firma wird als AKTIV markiert und kann Angebote einreichen.",
      okText: "Genehmigen",
      cancelText: "Abbrechen",
      onOk: async () => {
        try {
          await axios.patch(
            `/api/v1/providers/${id}/status`,
            { status: "ACTIVE" },
            { headers: { "X-User-Role": role } }
          );
          message.success("Firma genehmigt!");
          refetch();
        } catch (err: unknown) {
          const errorMsg = err instanceof Error ? err.message : "Unbekannter Fehler";
          message.error(`Fehler: ${errorMsg}`);
        }
      },
    });
  };

  const handleSuspend = () => {
    Modal.confirm({
      title: "Firma sperren?",
      icon: <ExclamationCircleOutlined />,
      content: (
        <Input.TextArea
          placeholder="Grund für die Sperrung (optional)"
          rows={3}
          onChange={(e) => setRejectionReason(e.target.value)}
        />
      ),
      okText: "Sperren",
      okType: "danger",
      cancelText: "Abbrechen",
      onOk: async () => {
        try {
          await axios.patch(
            `/api/v1/providers/${id}/status`,
            { status: "SUSPENDED", reason: rejectionReason || undefined },
            { headers: { "X-User-Role": role } }
          );
          message.success("Firma gesperrt.");
          refetch();
        } catch (err: unknown) {
          const errorMsg = err instanceof Error ? err.message : "Unbekannter Fehler";
          message.error(`Fehler: ${errorMsg}`);
        }
      },
    });
  };

  const handleVerifyDoc = async (docId: string, action: "APPROVE" | "REJECT") => {
    try {
      const payload: Record<string, string> = { action };
      if (action === "REJECT") {
        payload.rejectionReason = "Dokument nicht lesbar oder ungültig";
      }
      await axios.patch(
        `/api/v1/providers/${id}/documents/${docId}/verify`,
        payload,
        { headers: { "X-User-Role": role } }
      );
      message.success(action === "APPROVE" ? "Dokument bestätigt" : "Dokument abgelehnt");
      refetch();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Unbekannter Fehler";
      message.error(`Fehler: ${errorMsg}`);
    }
  };

  const handleDownload = (docId: string, filename: string) => {
    const link = document.createElement("a");
    link.href = `/api/v1/providers/${id}/documents/${docId}/download`;
    link.download = filename;
    link.click();
  };

  if (isLoading) return <Spin size="large" />;
  if (!provider) return <Empty description="Firma nicht gefunden" />;

  const status = String(provider.status ?? "");
  const canApprove = status === "PENDING" || status === "SUSPENDED";
  const canSuspend = status === "PENDING" || status === "ACTIVE";

  return (
    <Show
      title={`Firma prüfen: ${String(provider.name ?? "")}`}
      headerButtons={
        <Button onClick={() => navigate("/admin/providers")}>Zurück zur Liste</Button>
      }
    >
      <Row gutter={24}>
        <Col span={16}>
          <Descriptions bordered column={2} size="small">
            <Descriptions.Item label="Status" span={2}>
              <Tag color={statusColors[status] ?? "default"} style={{ fontSize: 14 }}>
                {status}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Firma">
              <Text strong>{String(provider.name)}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="E-Mail">
              {String(provider.email)}
            </Descriptions.Item>
            <Descriptions.Item label="Telefon">
              {String(provider.phoneNumber)}
            </Descriptions.Item>
            <Descriptions.Item label="Steuernummer">
              {String((provider as Record<string, unknown>).taxNumber ?? "—")}
            </Descriptions.Item>
            <Descriptions.Item label="Registriert am">
              {provider.createdAt
                ? new Date(String(provider.createdAt)).toLocaleDateString("de-DE")
                : "—"}
            </Descriptions.Item>
            <Descriptions.Item label="PLZ-Gebiete">
              <Space wrap>
                {((provider.supportedPostCodePrefixes as string[]) ?? []).map((p) => (
                  <Tag key={p}>{p}</Tag>
                ))}
              </Space>
            </Descriptions.Item>
          </Descriptions>

          <Title level={5} style={{ marginTop: 24 }}>
            Dokumente ({documents.length})
          </Title>

          {documents.length > 0 ? (
            <Table<ProviderDocument>
              dataSource={documents}
              rowKey="id"
              pagination={false}
              size="small"
            >
              <Table.Column<ProviderDocument>
                title="Typ"
                dataIndex="type"
                render={(type: string) => (
                  <Tag>{docTypeLabels[type] ?? type}</Tag>
                )}
              />
              <Table.Column<ProviderDocument>
                title="Datei"
                render={(_, record) => (
                  <Space>
                    {fileIcon(record.mimeType)}
                    <Text>{record.originalFilename}</Text>
                    <Text type="secondary">
                      ({(record.fileSize / 1024).toFixed(0)} KB)
                    </Text>
                  </Space>
                )}
              />
              <Table.Column<ProviderDocument>
                title="Status"
                render={(_, record) => {
                  if (record.verified) {
                    return <Tag color="success" icon={<CheckCircleOutlined />}>Bestätigt</Tag>;
                  }
                  if (record.rejectionReason) {
                    return (
                      <Tooltip title={record.rejectionReason}>
                        <Tag color="error" icon={<CloseCircleOutlined />}>Abgelehnt</Tag>
                      </Tooltip>
                    );
                  }
                  return <Tag color="processing">Ausstehend</Tag>;
                }}
              />
              <Table.Column<ProviderDocument>
                title="Aktionen"
                render={(_, record) => (
                  <Space>
                    <Button
                      size="small"
                      icon={<DownloadOutlined />}
                      onClick={() => handleDownload(record.id, record.originalFilename)}
                    >
                      Download
                    </Button>
                    {!record.verified && (
                      <>
                        <Button
                          size="small"
                          type="primary"
                          icon={<CheckCircleOutlined />}
                          onClick={() => handleVerifyDoc(record.id, "APPROVE")}
                        >
                          OK
                        </Button>
                        <Button
                          size="small"
                          danger
                          icon={<CloseCircleOutlined />}
                          onClick={() => handleVerifyDoc(record.id, "REJECT")}
                        >
                          Ablehnen
                        </Button>
                      </>
                    )}
                  </Space>
                )}
              />
            </Table>
          ) : (
            <Empty description="Keine Dokumente hochgeladen" />
          )}
        </Col>

        <Col span={8}>
          <Card size="small" title="Admin-Aktionen">
            <Space direction="vertical" style={{ width: "100%" }}>
              {canApprove && (
                <Button
                  type="primary"
                  block
                  icon={<CheckCircleOutlined />}
                  onClick={handleApprove}
                >
                  Firma genehmigen
                </Button>
              )}
              {canSuspend && (
                <Button
                  danger
                  block
                  icon={<CloseCircleOutlined />}
                  onClick={handleSuspend}
                >
                  Firma sperren
                </Button>
              )}
              {!canApprove && !canSuspend && (
                <Text type="secondary">Keine Aktionen verfügbar</Text>
              )}
            </Space>
          </Card>
        </Col>
      </Row>
    </Show>
  );
};

export default ProviderReview;
