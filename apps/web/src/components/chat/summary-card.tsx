import {
  Card,
  Button,
  Row,
  Col,
  Tag,
  Space,
  Typography,
  Divider,
} from "antd";
import {
  CheckCircleOutlined,
  HomeOutlined,
  CalendarOutlined,
  EnvironmentOutlined,
} from "@ant-design/icons";
import { useTranslation } from "react-i18next";

const { Text } = Typography;

interface SummaryCardProps {
  extractedData: Record<string, unknown>;
  onConfirm: () => void;
  onGenerateReport: () => void;
  onCancel: () => void;
  creditBalance: number;
  loading?: boolean;
}

export const SummaryCard: React.FC<SummaryCardProps> = ({
  extractedData,
  onConfirm,
  onGenerateReport,
  onCancel,
  creditBalance,
  loading = false,
}) => {
  const { t } = useTranslation();

  const from = extractedData.from as Record<string, unknown> | undefined;
  const to = extractedData.to as Record<string, unknown> | undefined;
  const fromAddress = from?.address as Record<string, string> | undefined;
  const toAddress = to?.address as Record<string, string> | undefined;
  const estate = (from?.estate ?? extractedData.estate) as
    | Record<string, unknown>
    | undefined;
  const furnitureItems = (extractedData.furnitureItems ??
    extractedData.furniture ??
    []) as Array<Record<string, unknown>>;
  const services = (extractedData.services ?? {}) as Record<string, boolean>;
  const dates = extractedData.dates as Record<string, string> | undefined;
  const preferredDateStart =
    dates?.start ?? (extractedData.preferredDateStart as string | undefined);
  const preferredDateEnd =
    dates?.end ?? (extractedData.preferredDateEnd as string | undefined);

  return (
    <Card
      title={
        <Space>
          <CheckCircleOutlined style={{ color: "#16a34a" }} />
          {t("agent.summary")}
        </Space>
      }
      style={{ marginBottom: 12 }}
    >
      {/* Addresses */}
      <Row gutter={24}>
        <Col xs={24} sm={12}>
          <Space direction="vertical" size={2}>
            <Text strong>
              <EnvironmentOutlined /> {t("demand.from")}
            </Text>
            {fromAddress ? (
              <Text>
                {fromAddress.street} {fromAddress.houseNumber}
                <br />
                {fromAddress.postCode} {fromAddress.placeName ?? fromAddress.city}
              </Text>
            ) : (
              <Text type="secondary">--</Text>
            )}
          </Space>
        </Col>
        <Col xs={24} sm={12}>
          <Space direction="vertical" size={2}>
            <Text strong>
              <EnvironmentOutlined /> {t("demand.to")}
            </Text>
            {toAddress ? (
              <Text>
                {toAddress.street} {toAddress.houseNumber}
                <br />
                {toAddress.postCode} {toAddress.placeName ?? toAddress.city}
              </Text>
            ) : (
              <Text type="secondary">--</Text>
            )}
          </Space>
        </Col>
      </Row>

      <Divider style={{ margin: "12px 0" }} />

      {/* Estate info */}
      {estate && (
        <>
          <Space direction="vertical" size={2} style={{ marginBottom: 8 }}>
            <Text strong>
              <HomeOutlined /> {t("demand.apartment")}
            </Text>
            <Text>
              {estate.estateType as string ?? estate.estateTypeId as string ?? "--"} &middot;{" "}
              {estate.totalSquareMeters as number ?? "?"} m&sup2; &middot;{" "}
              {estate.numberOfRooms as number ?? "?"} {t("demand.rooms")}
            </Text>
          </Space>
          <Divider style={{ margin: "12px 0" }} />
        </>
      )}

      {/* Furniture */}
      {furnitureItems.length > 0 && (
        <>
          <Text strong>{t("demand.furniture")}</Text>
          <div style={{ marginTop: 4, marginBottom: 8 }}>
            {furnitureItems.map((item, idx) => (
              <Tag key={idx} style={{ marginBottom: 4 }}>
                {(item.name as string) ?? (item.furnitureTypeId as string) ?? `Item ${idx + 1}`}
                {item.quantity ? ` x${item.quantity}` : ""}
              </Tag>
            ))}
          </div>
          <Divider style={{ margin: "12px 0" }} />
        </>
      )}

      {/* Dates */}
      {(preferredDateStart || preferredDateEnd) && (
        <>
          <Space direction="vertical" size={2} style={{ marginBottom: 8 }}>
            <Text strong>
              <CalendarOutlined /> {t("demand.dateRange")}
            </Text>
            <Text>
              {preferredDateStart ?? "--"} &mdash; {preferredDateEnd ?? "--"}
            </Text>
          </Space>
          <Divider style={{ margin: "12px 0" }} />
        </>
      )}

      {/* Services */}
      {Object.keys(services).length > 0 && (
        <>
          <Text strong>{t("demand.additionalServices")}</Text>
          <div style={{ marginTop: 4, marginBottom: 8 }}>
            <Space direction="vertical" size={0}>
              {Object.entries(services).map(([key, val]) =>
                val ? (
                  <Text key={key}>
                    <CheckCircleOutlined
                      style={{ color: "#16a34a", marginRight: 4 }}
                    />
                    {key}
                  </Text>
                ) : null
              )}
            </Space>
          </div>
          <Divider style={{ margin: "12px 0" }} />
        </>
      )}

      {/* Action buttons */}
      <Space wrap>
        <Button type="primary" onClick={onConfirm} loading={loading}>
          {t("agent.confirmDemand")}
        </Button>
        <Button
          onClick={onGenerateReport}
          loading={loading}
          disabled={creditBalance < 1}
          title={
            creditBalance < 1 ? t("agent.buyCredits") : undefined
          }
        >
          {t("agent.generateReport")} ({t("agent.reportCost")})
        </Button>
        <Button type="text" onClick={onCancel} disabled={loading}>
          {t("agent.cancel")}
        </Button>
      </Space>
    </Card>
  );
};
