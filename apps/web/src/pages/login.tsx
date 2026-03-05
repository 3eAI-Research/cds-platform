import { useLogin } from "@refinedev/core";
import { Button, Card, Space, Typography } from "antd";
import { UserOutlined, ShopOutlined } from "@ant-design/icons";

const { Title, Text } = Typography;

export const LoginPage = () => {
  const { mutate: login } = useLogin();

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "#f0f2f5",
      }}
    >
      <Card style={{ width: 420, textAlign: "center" }}>
        <Title level={3}>CDS Platform</Title>
        <Text type="secondary" style={{ display: "block", marginBottom: 24 }}>
          Umzug-Marktplatz — MVP Demo
        </Text>
        <Text style={{ display: "block", marginBottom: 16 }}>
          Rolle auswählen:
        </Text>
        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
          <Button
            type="primary"
            icon={<UserOutlined />}
            size="large"
            block
            onClick={() => login({ role: "customer" })}
          >
            Kunde (Customer)
          </Button>
          <Button
            icon={<ShopOutlined />}
            size="large"
            block
            onClick={() => login({ role: "provider" })}
          >
            Umzugsunternehmen (Provider)
          </Button>
        </Space>
      </Card>
    </div>
  );
};

export default LoginPage;
