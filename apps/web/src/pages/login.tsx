import { useLogin } from "@refinedev/core";
import { Button, Card, Space, Typography, Select } from "antd";
import { UserOutlined, ShopOutlined, SettingOutlined, GlobalOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { SUPPORTED_LANGUAGES } from "../i18n";

const { Title, Text } = Typography;

export const LoginPage = () => {
  const { mutate: login } = useLogin();
  const { t, i18n } = useTranslation();

  const handleLangChange = (lang: string) => {
    i18n.changeLanguage(lang);
    localStorage.setItem("cds-lang", lang);
  };

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #2563eb 100%)",
      }}
    >
      <Card
        style={{
          width: 440,
          textAlign: "center",
          borderRadius: 16,
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
          border: "none",
        }}
      >
        <div style={{ marginBottom: 8 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: "linear-gradient(135deg, #2563eb, #0ea5e9)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 12,
            }}
          >
            <span style={{ fontSize: 28, color: "white", fontWeight: 800 }}>C</span>
          </div>
        </div>
        <Title level={3} style={{ margin: 0, letterSpacing: -0.5 }}>
          CDS Platform
        </Title>
        <Text type="secondary" style={{ display: "block", marginBottom: 28, fontSize: 14 }}>
          {t("auth.subtitle")}
        </Text>

        <Text style={{ display: "block", marginBottom: 16, fontWeight: 500 }}>
          {t("auth.selectRole")}
        </Text>

        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
          <Button
            type="primary"
            icon={<UserOutlined />}
            size="large"
            block
            style={{
              height: 48,
              borderRadius: 10,
              fontWeight: 600,
              background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
            }}
            onClick={() => login({ role: "customer" })}
          >
            {t("auth.customer")}
          </Button>
          <Button
            icon={<ShopOutlined />}
            size="large"
            block
            style={{
              height: 48,
              borderRadius: 10,
              fontWeight: 600,
              borderColor: "#16a34a",
              color: "#16a34a",
            }}
            onClick={() => login({ role: "provider" })}
          >
            {t("auth.provider")}
          </Button>
          <Button
            icon={<SettingOutlined />}
            size="large"
            block
            style={{
              height: 48,
              borderRadius: 10,
              fontWeight: 600,
              borderColor: "#dc2626",
              color: "#dc2626",
            }}
            onClick={() => login({ role: "admin" })}
          >
            {t("auth.admin")}
          </Button>
        </Space>

        <div style={{ marginTop: 24, paddingTop: 16, borderTop: "1px solid #f0f0f0" }}>
          <Select
            size="small"
            value={i18n.language}
            onChange={handleLangChange}
            style={{ width: 160 }}
            suffixIcon={<GlobalOutlined />}
            optionFilterProp="label"
            showSearch
            options={SUPPORTED_LANGUAGES.map((lang) => ({
              value: lang.code,
              label: `${lang.flag} ${lang.label}`,
            }))}
          />
        </div>
      </Card>
    </div>
  );
};

export default LoginPage;
