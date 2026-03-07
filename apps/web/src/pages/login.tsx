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
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Decorative circles */}
      <div style={{
        position: "absolute", width: 400, height: 400, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(37,99,235,0.15) 0%, transparent 70%)",
        top: -100, right: -100,
      }} />
      <div style={{
        position: "absolute", width: 300, height: 300, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(14,165,233,0.1) 0%, transparent 70%)",
        bottom: -50, left: -50,
      }} />

      <Card
        style={{
          width: 420,
          textAlign: "center",
          borderRadius: 20,
          boxShadow: "0 24px 80px rgba(0,0,0,0.35)",
          border: "none",
          background: "rgba(255,255,255,0.97)",
          backdropFilter: "blur(20px)",
          animation: "fadeInUp 0.6s ease-out",
        }}
        styles={{ body: { padding: "40px 32px 32px" } }}
      >
        {/* Logo */}
        <div style={{ marginBottom: 16 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              background: "linear-gradient(135deg, #2563eb 0%, #0ea5e9 100%)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 12,
              boxShadow: "0 8px 24px rgba(37,99,235,0.3)",
            }}
          >
            <span style={{ fontSize: 32, color: "white", fontWeight: 800, fontFamily: "Inter" }}>C</span>
          </div>
        </div>

        <Title level={3} style={{ margin: 0, letterSpacing: -0.5, fontWeight: 800 }}>
          CDS Platform
        </Title>
        <Text type="secondary" style={{ display: "block", marginBottom: 32, fontSize: 14 }}>
          {t("auth.subtitle")}
        </Text>

        <Text style={{ display: "block", marginBottom: 16, fontWeight: 600, fontSize: 13, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5 }}>
          {t("auth.selectRole")}
        </Text>

        <Space direction="vertical" size={12} style={{ width: "100%" }}>
          <Button
            type="primary"
            icon={<UserOutlined />}
            size="large"
            block
            style={{
              height: 52,
              borderRadius: 12,
              fontWeight: 600,
              fontSize: 15,
              background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
              boxShadow: "0 4px 16px rgba(37,99,235,0.3)",
            }}
            onClick={() => login({ role: "customer" })}
          >
            {t("auth.welcomeCustomer")}
          </Button>
          <Button
            icon={<ShopOutlined />}
            size="large"
            block
            style={{
              height: 52,
              borderRadius: 12,
              fontWeight: 600,
              fontSize: 15,
              borderColor: "#16a34a",
              color: "#16a34a",
              background: "rgba(22,163,106,0.04)",
            }}
            onClick={() => login({ role: "provider" })}
          >
            {t("auth.welcomeProvider")}
          </Button>
          <Button
            icon={<SettingOutlined />}
            size="large"
            block
            style={{
              height: 52,
              borderRadius: 12,
              fontWeight: 600,
              fontSize: 15,
              borderColor: "#94a3b8",
              color: "#64748b",
            }}
            onClick={() => login({ role: "admin" })}
          >
            {t("auth.welcomeAdmin")}
          </Button>
        </Space>

        <div style={{ marginTop: 28, paddingTop: 20, borderTop: "1px solid #f0f0f0" }}>
          <Select
            size="small"
            value={i18n.language}
            onChange={handleLangChange}
            style={{ width: 180 }}
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

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default LoginPage;
