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

const serviceTypeLabels: Record<string, string> = {
  PRIVATE_MOVE: "Privatumzug",
  COMMERCIAL_MOVE: "Firmenumzug",
  FURNITURE_TRANSPORT: "Möbeltransport",
};

export const DemandShow = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { query } = useShow({ resource: "demands" });
  const { data, isLoading } = query;
  const record = data?.data as Record<string, unknown> | undefined;

  const role = localStorage.getItem("cds-role") || "customer";

  // Fetch offers for this demand
  const { data: offersData, refetch: refetchOffers } = useCustom<{
    items: Offer[];
    total: number;
  }>({
    url: `/api/v1/offers`,
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
      message.success(action === "accept" ? "Angebot angenommen!" : "Angebot abgelehnt.");
      refetchOffers();
      query.refetch();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Unbekannter Fehler";
      message.error(`Fehler: ${errorMsg}`);
    }
  };

  if (isLoading) return <Spin size="large" />;
  if (!record) return <Empty description="Anfrage nicht gefunden" />;

  const demandStatus = String(record.status ?? "");
  const isCustomer = role === "customer";

  const offerColumns = [
    {
      title: "Anbieter",
      dataIndex: "providerCompanyId",
      render: (val: string) => <Text copyable={{ text: val }}>{val.slice(0, 8)}...</Text>,
    },
    {
      title: "Preis",
      dataIndex: "totalPriceAmount",
      render: (cents: number) => (
        <Text strong>
          <EuroOutlined /> {(cents / 100).toFixed(2)} EUR
        </Text>
      ),
      sorter: (a: Offer, b: Offer) => a.totalPriceAmount - b.totalPriceAmount,
    },
    {
      title: "MwSt.",
      dataIndex: "vatAmount",
      render: (cents: number, rec: Offer) =>
        `${(cents / 100).toFixed(2)} EUR (${(rec.vatRate * 100).toFixed(0)}%)`,
    },
    {
      title: "Gültig bis",
      dataIndex: "validUntil",
      render: (val: string) =>
        val ? new Date(val).toLocaleDateString("de-DE") : "—",
    },
    {
      title: "Status",
      dataIndex: "status",
      render: (val: string) => (
        <Tag color={offerStatusColors[val] ?? "default"}>{val}</Tag>
      ),
    },
    {
      title: "Nachricht",
      dataIndex: "message",
      render: (val?: string) => val || <Text type="secondary">—</Text>,
      ellipsis: true,
    },
    ...(isCustomer
      ? [
          {
            title: "Aktion",
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
                    Annehmen
                  </Button>
                  <Button
                    danger
                    size="small"
                    icon={<CloseCircleOutlined />}
                    onClick={() => handleOfferAction(rec.id, "reject")}
                  >
                    Ablehnen
                  </Button>
                </Space>
              ) : null,
          },
        ]
      : []),
  ];

  return (
    <Show
      title={`Umzugsanfrage ${String(record.id ?? "").slice(0, 8)}`}
      headerButtons={({ defaultButtons }) => (
        <>
          {defaultButtons}
          {role === "provider" && demandStatus === "PUBLISHED" && (
            <Button
              type="primary"
              onClick={() => navigate(`/demands/${id}/offer`)}
            >
              Angebot abgeben
            </Button>
          )}
        </>
      )}
    >
      <Row gutter={24}>
        <Col span={16}>
          <Descriptions bordered column={2} size="small">
            <Descriptions.Item label="Status">
              <Tag color={statusColors[demandStatus] ?? "default"}>
                {demandStatus}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Umzugsart">
              {serviceTypeLabels[String(record.serviceType)] ?? String(record.serviceType)}
            </Descriptions.Item>
            <Descriptions.Item label="Angebote">
              <Tag icon={<ClockCircleOutlined />}>
                {String(record.offerCount ?? 0)} Angebote
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Erstellt am">
              {record.createdAt
                ? new Date(String(record.createdAt)).toLocaleDateString("de-DE")
                : "—"}
            </Descriptions.Item>
            <Descriptions.Item label="Gültig bis">
              {record.expiresAt
                ? new Date(String(record.expiresAt)).toLocaleDateString("de-DE")
                : "—"}
            </Descriptions.Item>
            <Descriptions.Item label="Sprache">
              {String(record.preferredLocale ?? "de").toUpperCase()}
            </Descriptions.Item>
          </Descriptions>

          {String(record.additionalNotes ?? "") && (
            <Card size="small" title="Anmerkungen" style={{ marginTop: 16 }}>
              <Text>{String(record.additionalNotes)}</Text>
            </Card>
          )}
        </Col>

        <Col span={8}>
          <Card size="small" title="Schnellinfo">
            <Space direction="vertical" style={{ width: "100%" }}>
              <div>
                <Text type="secondary">Anfrage-ID</Text>
                <br />
                <Text copyable>{String(record.id)}</Text>
              </div>
              <div>
                <Text type="secondary">Kunde</Text>
                <br />
                <Text>{String(record.customerUserId ?? "").slice(0, 8)}...</Text>
              </div>
              {record.transportationId != null && (
                <div>
                  <Text type="secondary">Transport-ID</Text>
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
        Angebote ({offers.length})
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
        <Empty description="Noch keine Angebote vorhanden" />
      )}
    </Show>
  );
};

export default DemandShow;
