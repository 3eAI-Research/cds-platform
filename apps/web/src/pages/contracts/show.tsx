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
  Steps,
  Modal,
  Input,
} from "antd";
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import axios from "axios";
import { useState } from "react";

const { Text } = Typography;

const statusColors: Record<string, string> = {
  DRAFT: "default",
  PENDING_CUSTOMER: "processing",
  PENDING_PROVIDER: "processing",
  ACTIVE: "success",
  CANCELLED: "error",
  COMPLETED: "purple",
};

const statusStep: Record<string, number> = {
  DRAFT: 0,
  PENDING_CUSTOMER: 1,
  PENDING_PROVIDER: 1,
  ACTIVE: 2,
  COMPLETED: 3,
  CANCELLED: -1,
};

export const ContractShow = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const role = localStorage.getItem("cds-role") || "customer";
  const [cancelReason, setCancelReason] = useState("");

  const { data, isLoading, refetch } = useCustom({
    url: `/contracts/${id}`,
    method: "get",
    config: { headers: { "X-User-Role": role } },
    queryOptions: { enabled: !!id },
  });

  const contract = data?.data as Record<string, unknown> | undefined;

  const handleAccept = async () => {
    const endpoint =
      role === "customer"
        ? `/api/v1/contracts/${id}/customer-accept`
        : `/api/v1/contracts/${id}/provider-accept`;
    try {
      await axios.patch(endpoint, null, {
        headers: { "X-User-Role": role },
      });
      message.success(t("contract.accepted"));
      refetch();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : t("common.unknownError");
      message.error(`Fehler: ${errorMsg}`);
    }
  };

  const handleCancel = () => {
    Modal.confirm({
      title: t("contract.cancelConfirm"),
      icon: <ExclamationCircleOutlined />,
      content: (
        <Input.TextArea
          placeholder={t("contract.cancelReason")}
          rows={3}
          onChange={(e) => setCancelReason(e.target.value)}
        />
      ),
      okText: t("contract.cancel"),
      okType: "danger",
      cancelText: t("common.cancel"),
      onOk: async () => {
        try {
          await axios.patch(
            `/api/v1/contracts/${id}/cancel`,
            { reason: cancelReason || undefined },
            { headers: { "X-User-Role": role } }
          );
          message.success(t("contract.cancelledMsg"));
          refetch();
        } catch (err: unknown) {
          const errorMsg = err instanceof Error ? err.message : t("common.unknownError");
          message.error(`Fehler: ${errorMsg}`);
        }
      },
    });
  };

  if (isLoading) return <Spin size="large" />;
  if (!contract) return <Empty description={t("contract.notFound")} />;

  const status = String(contract.status ?? "");
  const canAccept =
    (role === "customer" && status === "PENDING_CUSTOMER") ||
    (role === "customer" && status === "DRAFT" && !contract.customerAcceptedAt) ||
    (role === "provider" && status === "PENDING_PROVIDER") ||
    (role === "provider" && status === "DRAFT" && !contract.providerAcceptedAt);
  const canCancel = ["DRAFT", "PENDING_CUSTOMER", "PENDING_PROVIDER", "ACTIVE"].includes(status);
  const canReview = status === "ACTIVE" || status === "COMPLETED";

  return (
    <Show title={`${t("contract.title")} ${String(contract.id ?? "").slice(0, 8)}`}>
      <Steps
        current={statusStep[status] ?? 0}
        status={status === "CANCELLED" ? "error" : undefined}
        style={{ marginBottom: 24 }}
        items={[
          { title: t("contract.draft") },
          { title: t("contract.pendingConfirmation") },
          { title: t("contract.active") },
          { title: t("contract.completed") },
        ]}
      />

      <Row gutter={24}>
        <Col span={16}>
          <Descriptions bordered column={2} size="small">
            <Descriptions.Item label={t("common.status")} span={2}>
              <Tag color={statusColors[status] ?? "default"}>{status}</Tag>
              {contract.customerAcceptedAt != null && (
                <Tag color="green" icon={<CheckCircleOutlined />}>
                  {t("contract.customerConfirmed")}
                </Tag>
              )}
              {contract.providerAcceptedAt != null && (
                <Tag color="green" icon={<CheckCircleOutlined />}>
                  {t("contract.providerConfirmed")}
                </Tag>
              )}
            </Descriptions.Item>

            <Descriptions.Item label={t("contract.agreedPrice")}>
              <Text strong>
                {((Number(contract.agreedPriceAmount) || 0) / 100).toFixed(2)} EUR
              </Text>
            </Descriptions.Item>
            <Descriptions.Item label={t("offer.vat")}>
              {((Number(contract.vatAmount) || 0) / 100).toFixed(2)} EUR
            </Descriptions.Item>

            <Descriptions.Item label={t("contract.commission")}>
              <Text type="danger">
                {((Number(contract.commissionAmount) || 0) / 100).toFixed(2)} EUR
              </Text>
            </Descriptions.Item>
            <Descriptions.Item label={t("contract.serviceDate")}>
              {contract.serviceDate
                ? new Date(String(contract.serviceDate)).toLocaleDateString("de-DE")
                : "—"}
            </Descriptions.Item>

            <Descriptions.Item label={t("contract.createdAt")}>
              {contract.createdAt
                ? new Date(String(contract.createdAt)).toLocaleDateString("de-DE")
                : "—"}
            </Descriptions.Item>
            <Descriptions.Item label={t("contract.demandId")}>
              <Button
                type="link"
                size="small"
                onClick={() =>
                  navigate(`/demands/${String(contract.demandId)}`)
                }
              >
                {String(contract.demandId ?? "").slice(0, 8)}...
              </Button>
            </Descriptions.Item>
          </Descriptions>

          {String(contract.serviceDescription ?? "") && (
            <Card
              size="small"
              title={t("contract.serviceDescription")}
              style={{ marginTop: 16 }}
            >
              <Text>{String(contract.serviceDescription)}</Text>
            </Card>
          )}

          {status === "CANCELLED" && (
            <Card
              size="small"
              title={t("contract.cancellation")}
              style={{ marginTop: 16 }}
            >
              <Text type="danger">
                {String(contract.cancellationReason ?? t("contract.noReasonGiven"))}
              </Text>
              <br />
              <Text type="secondary">
                {t("contract.cancelledAt")}:{" "}
                {contract.cancelledAt
                  ? new Date(String(contract.cancelledAt)).toLocaleDateString("de-DE")
                  : "—"}
              </Text>
            </Card>
          )}
        </Col>

        <Col span={8}>
          <Card size="small" title={t("common.actions")}>
            <Space direction="vertical" style={{ width: "100%" }}>
              {canAccept && (
                <Button
                  type="primary"
                  block
                  icon={<CheckCircleOutlined />}
                  onClick={handleAccept}
                >
                  {t("contract.accept")}
                </Button>
              )}
              {canReview && (
                <Button
                  block
                  onClick={() => navigate(`/contracts/${id}/review`)}
                >
                  {t("review.submit")}
                </Button>
              )}
              {canCancel && (
                <Button
                  danger
                  block
                  icon={<CloseCircleOutlined />}
                  onClick={handleCancel}
                >
                  {t("contract.cancel")}
                </Button>
              )}
              {!canAccept && !canReview && !canCancel && (
                <Text type="secondary">{t("common.noActions")}</Text>
              )}
            </Space>
          </Card>

          <Card size="small" title={t("contract.ids")} style={{ marginTop: 16 }}>
            <Space direction="vertical" size={4} style={{ width: "100%" }}>
              <div>
                <Text type="secondary">{t("contract.contractId")}</Text>
                <br />
                <Text copyable style={{ fontSize: 12 }}>
                  {String(contract.id)}
                </Text>
              </div>
              <div>
                <Text type="secondary">{t("contract.offerId")}</Text>
                <br />
                <Text copyable style={{ fontSize: 12 }}>
                  {String(contract.offerId ?? "")}
                </Text>
              </div>
            </Space>
          </Card>
        </Col>
      </Row>
    </Show>
  );
};

export default ContractShow;
