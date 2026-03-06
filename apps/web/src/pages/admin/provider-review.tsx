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
import { useTranslation } from "react-i18next";

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

const fileIcon = (mimeType: string) =>
  mimeType === "application/pdf" ? <FilePdfOutlined /> : <FileImageOutlined />;

export const ProviderReview = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const role = localStorage.getItem("cds-role") || "admin";
  const [rejectionReason, setRejectionReason] = useState("");

  const docTypeLabels: Record<string, string> = {
    BUSINESS_LICENSE: t("provider.documents.types.BUSINESS_LICENSE"),
    INSURANCE: t("provider.documents.types.INSURANCE"),
    COMMERCIAL_REGISTER: t("provider.documents.types.COMMERCIAL_REGISTER"),
    OTHER: t("provider.documents.types.OTHER"),
  };

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
      title: t("admin.approveConfirm"),
      icon: <CheckCircleOutlined style={{ color: "#52c41a" }} />,
      content: t("admin.approveDescription"),
      okText: t("admin.approveProvider"),
      cancelText: t("common.cancel"),
      onOk: async () => {
        try {
          await axios.patch(
            `/api/v1/providers/${id}/status`,
            { status: "ACTIVE" },
            { headers: { "X-User-Role": role } }
          );
          message.success(t("admin.approved"));
          refetch();
        } catch (err: unknown) {
          const errorMsg = err instanceof Error ? err.message : t("common.unknownError");
          message.error(`Fehler: ${errorMsg}`);
        }
      },
    });
  };

  const handleSuspend = () => {
    Modal.confirm({
      title: t("admin.suspendConfirm"),
      icon: <ExclamationCircleOutlined />,
      content: (
        <Input.TextArea
          placeholder={t("admin.suspendReason")}
          rows={3}
          onChange={(e) => setRejectionReason(e.target.value)}
        />
      ),
      okText: t("admin.suspendProvider"),
      okType: "danger",
      cancelText: t("common.cancel"),
      onOk: async () => {
        try {
          await axios.patch(
            `/api/v1/providers/${id}/status`,
            { status: "SUSPENDED", reason: rejectionReason || undefined },
            { headers: { "X-User-Role": role } }
          );
          message.success(t("admin.suspended"));
          refetch();
        } catch (err: unknown) {
          const errorMsg = err instanceof Error ? err.message : t("common.unknownError");
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
      message.success(action === "APPROVE" ? t("admin.docApproved") : t("admin.docRejectedMsg"));
      refetch();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : t("common.unknownError");
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
  if (!provider) return <Empty description={t("provider.notFound")} />;

  const status = String(provider.status ?? "");
  const canApprove = status === "PENDING" || status === "SUSPENDED";
  const canSuspend = status === "PENDING" || status === "ACTIVE";

  return (
    <Show
      title={t("admin.providerReview") + ": " + String(provider.name ?? "")}
      headerButtons={
        <Button onClick={() => navigate("/admin/providers")}>{t("admin.backToList")}</Button>
      }
    >
      <Row gutter={24}>
        <Col span={16}>
          <Descriptions bordered column={2} size="small">
            <Descriptions.Item label={t("common.status")} span={2}>
              <Tag color={statusColors[status] ?? "default"} style={{ fontSize: 14 }}>
                {status}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label={t("provider.name")}>
              <Text strong>{String(provider.name)}</Text>
            </Descriptions.Item>
            <Descriptions.Item label={t("provider.email")}>
              {String(provider.email)}
            </Descriptions.Item>
            <Descriptions.Item label={t("provider.phone")}>
              {String(provider.phoneNumber)}
            </Descriptions.Item>
            <Descriptions.Item label={t("provider.taxNumber")}>
              {String((provider as Record<string, unknown>).taxNumber ?? "—")}
            </Descriptions.Item>
            <Descriptions.Item label={t("provider.registeredAt")}>
              {provider.createdAt
                ? new Date(String(provider.createdAt)).toLocaleDateString("de-DE")
                : "—"}
            </Descriptions.Item>
            <Descriptions.Item label={t("provider.plzAreas")}>
              <Space wrap>
                {((provider.supportedPostCodePrefixes as string[]) ?? []).map((p) => (
                  <Tag key={p}>{p}</Tag>
                ))}
              </Space>
            </Descriptions.Item>
          </Descriptions>

          <Title level={5} style={{ marginTop: 24 }}>
            {t("admin.documents")} ({documents.length})
          </Title>

          {documents.length > 0 ? (
            <Table<ProviderDocument>
              dataSource={documents}
              rowKey="id"
              pagination={false}
              size="small"
            >
              <Table.Column<ProviderDocument>
                title={t("common.type")}
                dataIndex="type"
                render={(type: string) => (
                  <Tag>{docTypeLabels[type] ?? type}</Tag>
                )}
              />
              <Table.Column<ProviderDocument>
                title={t("common.file")}
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
                title={t("common.status")}
                render={(_, record) => {
                  if (record.verified) {
                    return <Tag color="success" icon={<CheckCircleOutlined />}>{t("admin.docVerified")}</Tag>;
                  }
                  if (record.rejectionReason) {
                    return (
                      <Tooltip title={record.rejectionReason}>
                        <Tag color="error" icon={<CloseCircleOutlined />}>{t("admin.docRejected")}</Tag>
                      </Tooltip>
                    );
                  }
                  return <Tag color="processing">{t("admin.docPending")}</Tag>;
                }}
              />
              <Table.Column<ProviderDocument>
                title={t("common.actions")}
                render={(_, record) => (
                  <Space>
                    <Button
                      size="small"
                      icon={<DownloadOutlined />}
                      onClick={() => handleDownload(record.id, record.originalFilename)}
                    >
                      {t("common.download")}
                    </Button>
                    {!record.verified && (
                      <>
                        <Button
                          size="small"
                          type="primary"
                          icon={<CheckCircleOutlined />}
                          onClick={() => handleVerifyDoc(record.id, "APPROVE")}
                        >
                          {t("admin.approve")}
                        </Button>
                        <Button
                          size="small"
                          danger
                          icon={<CloseCircleOutlined />}
                          onClick={() => handleVerifyDoc(record.id, "REJECT")}
                        >
                          {t("admin.reject")}
                        </Button>
                      </>
                    )}
                  </Space>
                )}
              />
            </Table>
          ) : (
            <Empty description={t("admin.noDocuments")} />
          )}
        </Col>

        <Col span={8}>
          <Card size="small" title={t("admin.actions")}>
            <Space direction="vertical" style={{ width: "100%" }}>
              {canApprove && (
                <Button
                  type="primary"
                  block
                  icon={<CheckCircleOutlined />}
                  onClick={handleApprove}
                >
                  {t("admin.approveProvider")}
                </Button>
              )}
              {canSuspend && (
                <Button
                  danger
                  block
                  icon={<CloseCircleOutlined />}
                  onClick={handleSuspend}
                >
                  {t("admin.suspendProvider")}
                </Button>
              )}
              {!canApprove && !canSuspend && (
                <Text type="secondary">{t("admin.noActions")}</Text>
              )}
            </Space>
          </Card>
        </Col>
      </Row>
    </Show>
  );
};

export default ProviderReview;
