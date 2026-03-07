import { useCustom } from "@refinedev/core";
import { Card, Row, Col, Statistic, Typography, Spin } from "antd";
import { DollarOutlined, FileTextOutlined, StarOutlined, CheckCircleOutlined } from "@ant-design/icons";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useTranslation } from "react-i18next";

export default function ProviderDashboard() {
  const { t } = useTranslation();
  const role = localStorage.getItem("cds-role") || "provider";

  const { data: statsData, isLoading: statsLoading } = useCustom<any>({
    url: "/analytics/provider/stats",
    method: "get",
    config: { headers: { "X-User-Role": role } },
  });

  const { data: revenueData, isLoading: revenueLoading } = useCustom<any>({
    url: "/analytics/provider/revenue",
    method: "get",
    config: {
      query: { months: 12 },
      headers: { "X-User-Role": role },
    },
  });

  const stats = statsData?.data?.data ?? statsData?.data ?? {};
  const revenue = revenueData?.data?.data ?? revenueData?.data ?? [];

  const formatEur = (cents: number) => `€${((cents || 0) / 100).toFixed(2)}`;

  if (statsLoading) return <Spin style={{ display: "block", padding: 64, textAlign: "center" }} size="large" />;

  return (
    <div style={{ padding: 24 }}>
      <Typography.Title level={3}>{t("analytics.providerDashboard", "Provider Dashboard")}</Typography.Title>

      {/* Stat cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title={t("analytics.totalOffers", "Total Offers")}
              value={stats.totalOffers ?? 0}
              prefix={<FileTextOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title={t("analytics.acceptedOffers", "Accepted Offers")}
              value={stats.acceptedOffers ?? 0}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: "#16a34a" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title={t("analytics.totalRevenue", "Total Revenue")}
              value={formatEur(stats.totalRevenue ?? 0)}
              prefix={<DollarOutlined />}
              valueStyle={{ color: "#2563eb" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title={t("analytics.averageRating", "Average Rating")}
              value={Number(stats.averageRating ?? 0).toFixed(1)}
              suffix={`/ 5 (${stats.totalReviews ?? 0} ${t("analytics.reviews", "reviews")})`}
              prefix={<StarOutlined />}
              valueStyle={{ color: "#f59e0b" }}
            />
          </Card>
        </Col>
      </Row>

      {/* Revenue chart */}
      <Card title={t("analytics.monthlyRevenue", "Monthly Revenue")} style={{ marginBottom: 24 }}>
        {revenueLoading ? (
          <Spin />
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={Array.isArray(revenue) ? revenue : []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={(v) => `€${(Number(v) / 100).toFixed(0)}`} />
              <Tooltip formatter={(value) => [`€${(Number(value) / 100).toFixed(2)}`, "Revenue"]} />
              <Bar dataKey="revenue" fill="#2563eb" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* Contracts info */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12}>
          <Card>
            <Statistic
              title={t("analytics.activeContracts", "Active Contracts")}
              value={stats.activeContracts ?? 0}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12}>
          <Card>
            <Statistic
              title={t("analytics.completedContracts", "Completed Contracts")}
              value={stats.completedContracts ?? 0}
              valueStyle={{ color: "#16a34a" }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
