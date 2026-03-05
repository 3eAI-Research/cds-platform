import { useGetIdentity, useList } from "@refinedev/core";
import { Card, Typography, Row, Col, Statistic, Button, Space } from "antd";
import {
  FileTextOutlined,
  ShoppingOutlined,
  FileProtectOutlined,
  DollarOutlined,
  PlusOutlined,
  ArrowRightOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";

const { Title, Text } = Typography;

export const DashboardPage = () => {
  const navigate = useNavigate();
  const { data: identity } = useGetIdentity<{
    name: string;
    role: string;
  }>();

  const isProvider = identity?.role === "provider_owner";

  const { data: demandsData } = useList({
    resource: "demands",
    pagination: { pageSize: 1 },
  });

  const { data: contractsData } = useList({
    resource: "contracts",
    pagination: { pageSize: 1 },
  });

  const demandTotal = demandsData?.total ?? 0;
  const contractTotal = contractsData?.total ?? 0;

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
          <Card
            hoverable
            onClick={() => navigate("/demands")}
          >
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
            <Button
              type="link"
              size="small"
              style={{ padding: 0, marginTop: 8 }}
            >
              Alle anzeigen <ArrowRightOutlined />
            </Button>
          </Card>
        </Col>

        {isProvider && (
          <Col xs={24} sm={12} lg={6}>
            <Card
              hoverable
              onClick={() => navigate("/offers")}
            >
              <Statistic
                title="Meine Angebote"
                value="—"
                prefix={<DollarOutlined style={{ color: "#fa8c16" }} />}
              />
              <Button
                type="link"
                size="small"
                style={{ padding: 0, marginTop: 8 }}
              >
                Angebote ansehen <ArrowRightOutlined />
              </Button>
            </Card>
          </Col>
        )}

        <Col xs={24} sm={12} lg={6}>
          <Card
            hoverable
            onClick={() => navigate("/contracts")}
          >
            <Statistic
              title="Verträge"
              value={contractTotal}
              prefix={<FileProtectOutlined style={{ color: "#722ed1" }} />}
            />
            <Button
              type="link"
              size="small"
              style={{ padding: 0, marginTop: 8 }}
            >
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
