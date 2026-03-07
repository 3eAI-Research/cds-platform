import { useGetIdentity, useList } from "@refinedev/core";
import { useTranslation } from "react-i18next";
import { Card, Typography, Row, Col, Button, Space } from "antd";
import {
  FileTextOutlined,
  ShoppingOutlined,
  FileProtectOutlined,
  DollarOutlined,
  PlusOutlined,
  ArrowRightOutlined,
  AuditOutlined,
  TeamOutlined,
  WalletOutlined,
  RobotOutlined,
  BarChartOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useCustom } from "@refinedev/core";

const { Title, Text } = Typography;

const StatCard: React.FC<{
  title: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
  variant: string;
  onClick?: () => void;
  linkText?: string;
}> = ({ title, value, icon, color, variant, onClick, linkText }) => (
  <Card
    hoverable
    onClick={onClick}
    className={`cds-stat-card cds-stat-card--${variant}`}
    styles={{ body: { padding: "20px 24px" } }}
  >
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
      <div>
        <Text style={{ fontSize: 13, fontWeight: 500, color: "#64748b", display: "block", marginBottom: 8 }}>
          {title}
        </Text>
        <Text style={{ fontSize: 28, fontWeight: 700, color: "#0f172a", lineHeight: 1 }}>
          {value}
        </Text>
      </div>
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          background: `${color}10`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 20,
          color,
        }}
      >
        {icon}
      </div>
    </div>
    {linkText && (
      <Button type="link" size="small" style={{ padding: 0, marginTop: 12, color, fontWeight: 500 }}>
        {linkText} <ArrowRightOutlined />
      </Button>
    )}
  </Card>
);

export const DashboardPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: identity } = useGetIdentity<{
    name: string;
    role: string;
  }>();

  const role = identity?.role ?? "customer";
  const isProvider = role === "provider_owner";
  const isAdmin = role === "admin";

  const { data: demandsData } = useList({
    resource: "demands",
    pagination: { pageSize: 1 },
  });

  const { data: contractsData } = useList({
    resource: "contracts",
    pagination: { pageSize: 1 },
  });

  const { data: pendingData } = useCustom({
    url: "/providers",
    method: "get",
    config: {
      query: { status: "PENDING", pageSize: 1 },
      headers: { "X-User-Role": "admin" },
    },
    queryOptions: { enabled: isAdmin },
  });

  const demandTotal = demandsData?.total ?? 0;
  const contractTotal = contractsData?.total ?? 0;
  const pendingProviders = (pendingData?.data as any)?.total ?? 0;

  // --- Admin Dashboard ---
  if (isAdmin) {
    return (
      <div style={{ padding: 24 }}>
        <div className="cds-page-header">
          <Title level={4} style={{ margin: 0 }}>
            {t("dashboard.adminTitle")}
          </Title>
          <Text type="secondary">{t("dashboard.adminSubtitle")}</Text>
        </div>

        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={6}>
            <StatCard
              title={t("dashboard.pendingApprovals")}
              value={pendingProviders}
              icon={<AuditOutlined />}
              color={pendingProviders > 0 ? "#dc2626" : "#f59e0b"}
              variant={pendingProviders > 0 ? "red" : "orange"}
              onClick={() => navigate("/admin/providers")}
              linkText={t("dashboard.review")}
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <StatCard
              title={t("dashboard.companies")}
              value="--"
              icon={<TeamOutlined />}
              color="#16a34a"
              variant="green"
              onClick={() => navigate("/providers")}
              linkText={t("dashboard.viewAll")}
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <StatCard
              title={t("dashboard.requests")}
              value={demandTotal}
              icon={<FileTextOutlined />}
              color="#2563eb"
              variant="blue"
              onClick={() => navigate("/demands")}
              linkText={t("dashboard.viewAll")}
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <StatCard
              title={t("dashboard.contracts")}
              value={contractTotal}
              icon={<FileProtectOutlined />}
              color="#7c3aed"
              variant="purple"
              onClick={() => navigate("/contracts")}
              linkText={t("dashboard.viewAll")}
            />
          </Col>
        </Row>

        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col xs={24} sm={12} lg={8}>
            <Card styles={{ body: { padding: "20px 24px" } }}>
              <Text strong style={{ fontSize: 14, display: "block", marginBottom: 16 }}>
                {t("dashboard.quickActions")}
              </Text>
              <Space direction="vertical" style={{ width: "100%" }} size={8}>
                <Button block icon={<AuditOutlined />} onClick={() => navigate("/admin/providers")}>
                  {t("dashboard.reviewCompanies")}
                </Button>
                <Button block icon={<WalletOutlined />} onClick={() => navigate("/payments")}>
                  {t("dashboard.payments")}
                </Button>
                <Button block icon={<BarChartOutlined />} onClick={() => navigate("/admin/analytics")}>
                  {t("analytics.adminDashboard")}
                </Button>
                <Button block icon={<RobotOutlined />} onClick={() => navigate("/admin/agent-sessions")}>
                  {t("admin.agentSessions")}
                </Button>
              </Space>
            </Card>
          </Col>
        </Row>
      </div>
    );
  }

  // --- Customer / Provider Dashboard ---
  return (
    <div style={{ padding: 24 }}>
      <Row justify="space-between" align="middle" gutter={[0, 12]} className="cds-page-header">
        <Col xs={24} sm={16}>
          <Title level={4} style={{ margin: 0 }}>
            {t("dashboard.welcome")}, {identity?.name ?? "User"}
          </Title>
          <Text type="secondary">
            {isProvider ? t("dashboard.providerSubtitle") : t("dashboard.customerSubtitle")}
          </Text>
        </Col>
        <Col xs={24} sm={8} style={{ textAlign: "right" }}>
          {!isProvider && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              size="large"
              className="cds-mobile-full-btn"
              style={{
                height: 44,
                borderRadius: 10,
                fontWeight: 600,
                boxShadow: "0 4px 16px rgba(37,99,235,0.25)",
              }}
              onClick={() => navigate("/demands/create")}
            >
              {t("dashboard.newMovingRequest")}
            </Button>
          )}
          {isProvider && (
            <Button
              type="primary"
              icon={<ShoppingOutlined />}
              size="large"
              className="cds-mobile-full-btn"
              style={{
                height: 44,
                borderRadius: 10,
                fontWeight: 600,
                background: "linear-gradient(135deg, #16a34a, #15803d)",
                boxShadow: "0 4px 16px rgba(22,163,106,0.25)",
              }}
              onClick={() => navigate("/demands")}
            >
              {t("dashboard.marketplaceBtn")}
            </Button>
          )}
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title={isProvider ? t("dashboard.marketplace") : t("dashboard.myDemands")}
            value={demandTotal}
            icon={isProvider ? <ShoppingOutlined /> : <FileTextOutlined />}
            color={isProvider ? "#16a34a" : "#2563eb"}
            variant={isProvider ? "green" : "blue"}
            onClick={() => navigate("/demands")}
            linkText={t("dashboard.viewAll")}
          />
        </Col>

        {isProvider && (
          <Col xs={24} sm={12} lg={6}>
            <StatCard
              title={t("dashboard.myOffers")}
              value="--"
              icon={<DollarOutlined />}
              color="#f59e0b"
              variant="orange"
              onClick={() => navigate("/offers")}
              linkText={t("dashboard.viewOffersBtn")}
            />
          </Col>
        )}

        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title={t("dashboard.contracts")}
            value={contractTotal}
            icon={<FileProtectOutlined />}
            color="#7c3aed"
            variant="purple"
            onClick={() => navigate("/contracts")}
            linkText={t("dashboard.viewContractsBtn")}
          />
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card styles={{ body: { padding: "20px 24px" } }}>
            <Text strong style={{ fontSize: 14, display: "block", marginBottom: 16 }}>
              {t("dashboard.quickActions")}
            </Text>
            <Space direction="vertical" style={{ width: "100%" }} size={8}>
              {!isProvider ? (
                <>
                  <Button block icon={<PlusOutlined />} onClick={() => navigate("/demands/create")}>
                    {t("dashboard.newDemand")}
                  </Button>
                  <Button block icon={<FileProtectOutlined />} onClick={() => navigate("/contracts")}>
                    {t("dashboard.viewContracts")}
                  </Button>
                </>
              ) : (
                <>
                  <Button block icon={<ShoppingOutlined />} onClick={() => navigate("/demands")}>
                    {t("dashboard.findJobs")}
                  </Button>
                  <Button block icon={<DollarOutlined />} onClick={() => navigate("/offers")}>
                    {t("dashboard.viewOffers")}
                  </Button>
                </>
              )}
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default DashboardPage;
