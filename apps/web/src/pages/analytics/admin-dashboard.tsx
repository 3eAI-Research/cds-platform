import { useCustom } from "@refinedev/core";
import { Card, Row, Col, Statistic, Typography, Spin } from "antd";
import { TeamOutlined, ShopOutlined, FileProtectOutlined, DollarOutlined, WifiOutlined } from "@ant-design/icons";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useTranslation } from "react-i18next";

export default function AdminDashboard() {
  const { t } = useTranslation();
  const role = "admin";

  const { data: statsData, isLoading: statsLoading } = useCustom<any>({
    url: "/analytics/admin/stats",
    method: "get",
    config: { headers: { "X-User-Role": role } },
  });

  const { data: demandsData, isLoading: demandsLoading } = useCustom<any>({
    url: "/analytics/admin/demands",
    method: "get",
    config: {
      query: { months: 12 },
      headers: { "X-User-Role": role },
    },
  });

  const stats = statsData?.data?.data ?? statsData?.data ?? {};
  const demands = demandsData?.data?.data ?? demandsData?.data ?? [];

  const formatEur = (cents: number) => `€${((cents || 0) / 100).toFixed(2)}`;

  if (statsLoading) return <Spin style={{ display: "block", padding: 64, textAlign: "center" }} size="large" />;

  return (
    <div style={{ padding: 24 }}>
      <Typography.Title level={3}>{t("analytics.adminDashboard", "Platform Analytics")}</Typography.Title>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={8}>
          <Card>
            <Statistic
              title={t("analytics.totalDemands", "Total Demands")}
              value={stats.totalDemands ?? 0}
              prefix={<ShopOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card>
            <Statistic
              title={t("analytics.activeDemands", "Active Demands")}
              value={stats.activeDemands ?? 0}
              valueStyle={{ color: "#2563eb" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card>
            <Statistic
              title={t("analytics.activeProviders", "Active Providers")}
              value={stats.activeProviders ?? 0}
              prefix={<TeamOutlined />}
              valueStyle={{ color: "#16a34a" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card>
            <Statistic
              title={t("analytics.totalContracts", "Total Contracts")}
              value={stats.totalContracts ?? 0}
              prefix={<FileProtectOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card>
            <Statistic
              title={t("analytics.totalRevenue", "Total Revenue")}
              value={formatEur(stats.totalRevenue ?? 0)}
              prefix={<DollarOutlined />}
              valueStyle={{ color: "#2563eb" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card>
            <Statistic
              title={t("analytics.onlineUsers", "Online Users")}
              value={stats.onlineUsers ?? 0}
              prefix={<WifiOutlined />}
              valueStyle={{ color: "#16a34a" }}
            />
          </Card>
        </Col>
      </Row>

      <Card title={t("analytics.demandsTrend", "Demands Trend")} style={{ marginBottom: 24 }}>
        {demandsLoading ? (
          <Spin />
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={Array.isArray(demands) ? demands : []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#2563eb" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12}>
          <Card>
            <Statistic
              title={t("analytics.totalCommission", "Commission Earned")}
              value={formatEur(stats.totalCommission ?? 0)}
              valueStyle={{ color: "#f59e0b" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12}>
          <Card>
            <Statistic
              title={t("analytics.totalProviders", "Total Providers")}
              value={stats.totalProviders ?? 0}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
