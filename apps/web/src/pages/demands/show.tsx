import { useShow, useCustom } from "@refinedev/core";
import { Show } from "@refinedev/antd";
import {
  Typography,
  Descriptions,
  Tag,
  Spin,
  Card,
  Row,
  Col,
  Divider,
  Table,
  Button,
  Space,
  message,
  Empty,
} from "antd";
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  EuroOutlined,
} from "@ant-design/icons";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import axios from "axios";

const { Title, Text } = Typography;

interface Offer {
  id: string;
  demandId: string;
  providerCompanyId: string;
  status: string;
  totalPriceAmount: number;
  totalPriceCurrency: string;
  commissionAmount: number;
  providerNetAmount: number;
  vatAmount: number;
  vatRate: number;
  message?: string;
  validUntil: string;
  submittedAt?: string;
  createdAt: string;
}

const statusColors: Record<string, string> = {
  PUBLISHED: "blue",
  OFFERED: "orange",
  ACCEPTED: "green",
  CANCELLED: "red",
  EXPIRED: "default",
};

const offerStatusColors: Record<string, string> = {
  SUBMITTED: "processing",
  ACCEPTED: "success",
  REJECTED: "error",
  WITHDRAWN: "default",
  EXPIRED: "warning",
};

export const DemandShow = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();

  const serviceTypeLabels: Record<string, string> = {
    PRIVATE_MOVE: t("demand.serviceTypes.PRIVATE_MOVE"),
    COMMERCIAL_MOVE: t("demand.serviceTypes.COMMERCIAL_MOVE"),
    FURNITURE_TRANSPORT: t("demand.serviceTypes.FURNITURE_TRANSPORT"),
  };
  const { query } = useShow({ resource: "demands" });
  const { data, isLoading } = query;
  const record = data?.data as Record<string, unknown> | undefined;

  const role = localStorage.getItem("cds-role") || "customer";

  // Fetch offers for this demand
  const { data: offersData, refetch: refetchOffers } = useCustom<{
    items: Offer[];
    total: number;
  }>({
    url: `/offers`,
    method: "get",
    config: {
      query: { demandId: id, pageSize: 50 },
      headers: {
        "X-User-Role": role,
      },
    },
    queryOptions: { enabled: !!id },
  });

  const offers = offersData?.data?.items ?? [];

  const handleOfferAction = async (offerId: string, action: "accept" | "reject") => {
    try {
      await axios.patch(`/api/v1/offers/${offerId}/${action}`, null, {
        headers: { "X-User-Role": role },
      });
      message.success(action === "accept" ? t("offer.accepted") : t("offer.rejected"));
      refetchOffers();
      query.refetch();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : t("common.unknownError");
      message.error(`Fehler: ${errorMsg}`);
    }
  };

  if (isLoading) return <Spin size="large" />;
  if (!record) return <Empty description={t("demand.notFound")} />;

  const demandStatus = String(record.status ?? "");
  const isCustomer = role === "customer";

  const offerColumns = [
    {
      title: t("offer.provider"),
      dataIndex: "providerCompanyId",
      render: (val: string) => <Text copyable={{ text: val }}>{val.slice(0, 8)}...</Text>,
    },
    {
      title: t("common.price"),
      dataIndex: "totalPriceAmount",
      render: (cents: number) => (
        <Text strong>
          <EuroOutlined /> {(cents / 100).toFixed(2)} EUR
        </Text>
      ),
      sorter: (a: Offer, b: Offer) => a.totalPriceAmount - b.totalPriceAmount,
    },
    {
      title: t("offer.vat"),
      dataIndex: "vatAmount",
      render: (cents: number, rec: Offer) =>
        `${(cents / 100).toFixed(2)} EUR (${(rec.vatRate * 100).toFixed(0)}%)`,
    },
    {
      title: t("offer.validUntil"),
      dataIndex: "validUntil",
      render: (val: string) =>
        val ? new Date(val).toLocaleDateString("de-DE") : "—",
    },
    {
      title: t("common.status"),
      dataIndex: "status",
      render: (val: string) => (
        <Tag color={offerStatusColors[val] ?? "default"}>{val}</Tag>
      ),
    },
    {
      title: t("offer.message"),
      dataIndex: "message",
      render: (val?: string) => val || <Text type="secondary">—</Text>,
      ellipsis: true,
    },
    ...(isCustomer
      ? [
          {
            title: t("offer.action"),
            key: "action",
            render: (_: unknown, rec: Offer) =>
              rec.status === "SUBMITTED" && demandStatus !== "ACCEPTED" ? (
                <Space>
                  <Button
                    type="primary"
                    size="small"
                    icon={<CheckCircleOutlined />}
                    onClick={() => handleOfferAction(rec.id, "accept")}
                  >
                    {t("offer.accept")}
                  </Button>
                  <Button
                    danger
                    size="small"
                    icon={<CloseCircleOutlined />}
                    onClick={() => handleOfferAction(rec.id, "reject")}
                  >
                    {t("offer.reject")}
                  </Button>
                </Space>
              ) : null,
          },
        ]
      : []),
  ];

  return (
    <Show
      title={`${t("demand.title")} ${String(record.id ?? "").slice(0, 8)}`}
      headerButtons={({ defaultButtons }) => (
        <>
          {defaultButtons}
          {role === "provider" && demandStatus === "PUBLISHED" && (
            <Button
              type="primary"
              onClick={() => navigate(`/demands/${id}/offer`)}
            >
              {t("offer.submit")}
            </Button>
          )}
        </>
      )}
    >
      <Row gutter={24}>
        <Col span={16}>
          <Descriptions bordered column={2} size="small">
            <Descriptions.Item label={t("common.status")}>
              <Tag color={statusColors[demandStatus] ?? "default"}>
                {demandStatus}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label={t("demand.movingType")}>
              {serviceTypeLabels[String(record.serviceType)] ?? String(record.serviceType)}
            </Descriptions.Item>
            <Descriptions.Item label={`${t("demand.offers")} (${String(record.offerCount ?? 0)})`}>
              <Tag icon={<ClockCircleOutlined />}>
                {String(record.offerCount ?? 0)} {t("demand.offers")}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label={t("demand.createdAt")}>
              {record.createdAt
                ? new Date(String(record.createdAt)).toLocaleDateString("de-DE")
                : "—"}
            </Descriptions.Item>
            <Descriptions.Item label={t("demand.validUntil")}>
              {record.expiresAt
                ? new Date(String(record.expiresAt)).toLocaleDateString("de-DE")
                : "—"}
            </Descriptions.Item>
            <Descriptions.Item label={t("demand.language")}>
              {String(record.preferredLocale ?? "de").toUpperCase()}
            </Descriptions.Item>
          </Descriptions>

          {String(record.additionalNotes ?? "") && (
            <Card size="small" title={t("demand.notes")} style={{ marginTop: 16 }}>
              <Text>{String(record.additionalNotes)}</Text>
            </Card>
          )}
        </Col>

        <Col span={8}>
          <Card size="small" title={t("demand.quickInfo")}>
            <Space direction="vertical" style={{ width: "100%" }}>
              <div>
                <Text type="secondary">{t("demand.requestId")}</Text>
                <br />
                <Text copyable>{String(record.id)}</Text>
              </div>
              <div>
                <Text type="secondary">{t("demand.customer")}</Text>
                <br />
                <Text>{String(record.customerUserId ?? "").slice(0, 8)}...</Text>
              </div>
              {record.transportationId != null && (
                <div>
                  <Text type="secondary">{t("demand.transportId")}</Text>
                  <br />
                  <Text copyable>
                    {String(record.transportationId).slice(0, 8)}...
                  </Text>
                </div>
              )}
            </Space>
          </Card>
        </Col>
      </Row>

      <Divider />

      <Title level={5}>
        {t("demand.offers")} ({offers.length})
      </Title>

      {offers.length > 0 ? (
        <Table
          dataSource={offers}
          columns={offerColumns}
          rowKey="id"
          pagination={false}
          size="small"
        />
      ) : (
        <Empty description={t("demand.noOffers")} />
      )}
    </Show>
  );
};

export default DemandShow;
