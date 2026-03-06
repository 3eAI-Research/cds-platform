import { useGetIdentity, useLogout } from "@refinedev/core";
import { Button, Space, Tag, Typography, Select } from "antd";
import { LogoutOutlined, SwapOutlined, GlobalOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { NotificationBell } from "./notification-bell";
import { SUPPORTED_LANGUAGES } from "../i18n";

const { Text } = Typography;

const roleColors: Record<string, string> = {
  admin: "red",
  provider_owner: "green",
  customer: "blue",
};

const getRoleLabels = (t: (key: string) => string): Record<string, string> => ({
  admin: t("auth.admin"),
  provider_owner: t("auth.provider"),
  customer: t("auth.customer"),
});

export const AppHeader = () => {
  const { data: identity } = useGetIdentity<{
    name: string;
    role: string;
    email: string;
  }>();
  const { mutate: logout } = useLogout();
  const { t, i18n } = useTranslation();

  const role = identity?.role ?? "customer";

  const handleLangChange = (lang: string) => {
    i18n.changeLanguage(lang);
    localStorage.setItem("cds-lang", lang);
  };

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "flex-end",
        alignItems: "center",
        padding: "0 16px",
        height: "100%",
      }}
    >
      <Space>
        <Select
          size="small"
          value={i18n.language}
          onChange={handleLangChange}
          style={{ width: 140 }}
          suffixIcon={<GlobalOutlined />}
          optionFilterProp="label"
          showSearch
          options={SUPPORTED_LANGUAGES.map((lang) => ({
            value: lang.code,
            label: `${lang.flag} ${lang.label}`,
          }))}
        />
        <NotificationBell />
        <Tag color={roleColors[role] ?? "blue"}>
          {getRoleLabels(t)[role] ?? role}
        </Tag>
        <Text>{identity?.name}</Text>
        <Button
          size="small"
          icon={<SwapOutlined />}
          onClick={() => logout()}
        >
          {t("auth.switchRole")}
        </Button>
        <Button
          size="small"
          icon={<LogoutOutlined />}
          onClick={() => logout()}
        />
      </Space>
    </div>
  );
};
