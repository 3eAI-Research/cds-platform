import { useGetIdentity, useList } from "@refinedev/core";
import { Card, Typography, Row, Col, Statistic, Button, Space } from "antd";
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
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useCustom } from "@refinedev/core";

const { Title, Text } = Typography;

export const DashboardPage = () => {
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

  // Admin: fetch pending providers count
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
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={4} style={{ margin: 0 }}>
              Admin Dashboard
            </Title>
            <Text type="secondary">
              Plattform-Verwaltung
            </Text>
          </Col>
        </Row>

        <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
          <Col xs={24} sm={12} lg={6}>
            <Card hoverable onClick={() => navigate("/admin/providers")}>
              <Statistic
                title="Ausstehende Genehmigungen"
                value={pendingProviders}
                prefix={<AuditOutlined style={{ color: "#fa541c" }} />}
                valueStyle={pendingProviders > 0 ? { color: "#fa541c" } : undefined}
              />
              <Button type="link" size="small" style={{ padding: 0, marginTop: 8 }}>
                Prüfen <ArrowRightOutlined />
              </Button>
            </Card>
          </Col>

          <Col xs={24} sm={12} lg={6}>
            <Card hoverable onClick={() => navigate("/providers")}>
              <Statistic
                title="Firmen"
                value="—"
                prefix={<TeamOutlined style={{ color: "#52c41a" }} />}
              />
              <Button type="link" size="small" style={{ padding: 0, marginTop: 8 }}>
                Alle anzeigen <ArrowRightOutlined />
              </Button>
            </Card>
          </Col>

          <Col xs={24} sm={12} lg={6}>
            <Card hoverable onClick={() => navigate("/demands")}>
              <Statistic
                title="Anfragen"
                value={demandTotal}
                prefix={<FileTextOutlined style={{ color: "#1890ff" }} />}
              />
              <Button type="link" size="small" style={{ padding: 0, marginTop: 8 }}>
                Alle anzeigen <ArrowRightOutlined />
              </Button>
            </Card>
          </Col>

          <Col xs={24} sm={12} lg={6}>
            <Card hoverable onClick={() => navigate("/contracts")}>
              <Statistic
                title="Verträge"
                value={contractTotal}
                prefix={<FileProtectOutlined style={{ color: "#722ed1" }} />}
              />
              <Button type="link" size="small" style={{ padding: 0, marginTop: 8 }}>
                Alle anzeigen <ArrowRightOutlined />
              </Button>
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Space direction="vertical" style={{ width: "100%" }}>
                <Text strong>Schnellaktionen</Text>
                <Button
                  block
                  icon={<AuditOutlined />}
                  onClick={() => navigate("/admin/providers")}
                >
                  Firmen prüfen
                </Button>
                <Button
                  block
                  icon={<WalletOutlined />}
                  onClick={() => navigate("/payments")}
                >
                  Zahlungen
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
      <Row justify="space-between" align="middle">
        <Col>
          <Title level={4} style={{ margin: 0 }}>
            Willkommen, {identity?.name ?? "Benutzer"}
          </Title>
          <Text type="secondary">
            {isProvider
              ? "Umzugsunternehmen-Dashboard"
              : "Kunden-Dashboard"}
          </Text>
        </Col>
        <Col>
          {!isProvider && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              size="large"
              onClick={() => navigate("/demands/create")}
            >
              Neue Umzugsanfrage
            </Button>
          )}
          {isProvider && (
            <Button
              type="primary"
              icon={<ShoppingOutlined />}
              size="large"
              onClick={() => navigate("/demands")}
            >
              Marktplatz
            </Button>
          )}
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable onClick={() => navigate("/demands")}>
            <Statistic
              title={isProvider ? "Marktplatz-Anfragen" : "Meine Anfragen"}
              value={demandTotal}
              prefix={
                isProvider ? (
                  <ShoppingOutlined style={{ color: "#52c41a" }} />
                ) : (
                  <FileTextOutlined style={{ color: "#1890ff" }} />
                )
              }
            />
            <Button type="link" size="small" style={{ padding: 0, marginTop: 8 }}>
              Alle anzeigen <ArrowRightOutlined />
            </Button>
          </Card>
        </Col>

        {isProvider && (
          <Col xs={24} sm={12} lg={6}>
            <Card hoverable onClick={() => navigate("/offers")}>
              <Statistic
                title="Meine Angebote"
                value="—"
                prefix={<DollarOutlined style={{ color: "#fa8c16" }} />}
              />
              <Button type="link" size="small" style={{ padding: 0, marginTop: 8 }}>
                Angebote ansehen <ArrowRightOutlined />
              </Button>
            </Card>
          </Col>
        )}

        <Col xs={24} sm={12} lg={6}>
          <Card hoverable onClick={() => navigate("/contracts")}>
            <Statistic
              title="Verträge"
              value={contractTotal}
              prefix={<FileProtectOutlined style={{ color: "#722ed1" }} />}
            />
            <Button type="link" size="small" style={{ padding: 0, marginTop: 8 }}>
              Verträge ansehen <ArrowRightOutlined />
            </Button>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Space direction="vertical">
              <Text strong>Schnellaktionen</Text>
              {!isProvider ? (
                <>
                  <Button
                    block
                    icon={<PlusOutlined />}
                    onClick={() => navigate("/demands/create")}
                  >
                    Neue Anfrage
                  </Button>
                  <Button
                    block
                    icon={<FileProtectOutlined />}
                    onClick={() => navigate("/contracts")}
                  >
                    Verträge prüfen
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    block
                    icon={<ShoppingOutlined />}
                    onClick={() => navigate("/demands")}
                  >
                    Aufträge suchen
                  </Button>
                  <Button
                    block
                    icon={<DollarOutlined />}
                    onClick={() => navigate("/offers")}
                  >
                    Meine Angebote
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
