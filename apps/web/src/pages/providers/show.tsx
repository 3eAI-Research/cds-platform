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
  Rate,
  Statistic,
  Table,
  Space,
  Empty,
} from "antd";
import {
  PhoneOutlined,
  MailOutlined,
  EnvironmentOutlined,
  StarOutlined,
  TrophyOutlined,
} from "@ant-design/icons";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

const { Title, Text } = Typography;

const statusColors: Record<string, string> = {
  ACTIVE: "success",
  PENDING: "processing",
  SUSPENDED: "warning",
  DEACTIVATED: "default",
};

interface Review {
  id: string;
  rating: number;
  comment?: string;
  createdAt: string;
}

export const ProviderShow = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const role = localStorage.getItem("cds-role") || "customer";

  const { data, isLoading } = useCustom({
    url: `/providers/${id}`,
    method: "get",
    config: { headers: { "X-User-Role": role } },
    queryOptions: { enabled: !!id },
  });

  // Fetch reviews for this provider
  const { data: reviewsData } = useCustom<{ items: Review[] }>({
    url: "/reviews",
    method: "get",
    config: {
      query: { revieweeUserId: id, direction: "CUSTOMER_TO_PROVIDER", pageSize: 10 },
      headers: { "X-User-Role": role },
    },
    queryOptions: { enabled: !!id },
  });

  const provider = data?.data as Record<string, unknown> | undefined;
  const reviews = reviewsData?.data?.items ?? [];

  if (isLoading) return <Spin size="large" />;
  if (!provider) return <Empty description={t("provider.notFound")} />;

  const status = String(provider.status ?? "");
  const prefixes = (provider.supportedPostCodePrefixes as string[]) ?? [];

  return (
    <Show title={String(provider.name ?? "Unternehmen")}>
      <Row gutter={24}>
        <Col span={16}>
          <Descriptions bordered column={2} size="small">
            <Descriptions.Item label={t("common.status")}>
              <Tag color={statusColors[status] ?? "default"}>{status}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label={t("provider.name")}>
              <Text strong>{String(provider.name)}</Text>
            </Descriptions.Item>
            <Descriptions.Item label={t("provider.email")}>
              <MailOutlined /> {String(provider.email)}
            </Descriptions.Item>
            <Descriptions.Item label={t("provider.phone")}>
              <PhoneOutlined /> {String(provider.phoneNumber)}
            </Descriptions.Item>
            <Descriptions.Item label={t("provider.registeredAt")}>
              {provider.createdAt
                ? new Date(String(provider.createdAt)).toLocaleDateString("de-DE")
                : "—"}
            </Descriptions.Item>
            <Descriptions.Item label={t("provider.plzAreas")}>
              <Space wrap>
                {prefixes.map((p) => (
                  <Tag key={p} icon={<EnvironmentOutlined />}>
                    {p}
                  </Tag>
                ))}
                {prefixes.length === 0 && (
                  <Text type="secondary">{t("provider.noPrefixes")}</Text>
                )}
              </Space>
            </Descriptions.Item>
          </Descriptions>
        </Col>

        <Col span={8}>
          <Card size="small">
            <Row gutter={[16, 16]}>
              <Col span={24}>
                <div style={{ textAlign: "center" }}>
                  <Rate
                    disabled
                    value={Number(provider.averageRating) || 0}
                    allowHalf
                    style={{ fontSize: 24 }}
                  />
                  <br />
                  <Text type="secondary">
                    {Number(provider.averageRating)?.toFixed(1) || "—"} / 5
                  </Text>
                </div>
              </Col>
              <Col span={12}>
                <Statistic
                  title={t("provider.reviews")}
                  value={Number(provider.reviewCount) || 0}
                  prefix={<StarOutlined />}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title={t("provider.completedJobs")}
                  value={Number(provider.completedJobCount) || 0}
                  prefix={<TrophyOutlined />}
                />
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>

      <Title level={5} style={{ marginTop: 24 }}>
        {t("provider.reviews")} ({reviews.length})
      </Title>

      {reviews.length > 0 ? (
        <Table<Review>
          dataSource={reviews}
          rowKey="id"
          pagination={false}
          size="small"
        >
          <Table.Column<Review>
            title={t("provider.rating")}
            dataIndex="rating"
            width={160}
            render={(val: number) => <Rate disabled value={val} style={{ fontSize: 14 }} />}
          />
          <Table.Column<Review>
            title={t("review.comment")}
            dataIndex="comment"
            render={(val?: string) => val || <Text type="secondary">—</Text>}
          />
          <Table.Column<Review>
            title={t("common.created")}
            dataIndex="createdAt"
            width={100}
            render={(d: string) => new Date(d).toLocaleDateString("de-DE")}
          />
        </Table>
      ) : (
        <Empty description={t("review.noReviews")} />
      )}
    </Show>
  );
};

export default ProviderShow;
