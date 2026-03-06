import { useGetIdentity, useLogout } from "@refinedev/core";
import { Button, Space, Tag, Typography, Segmented } from "antd";
import { LogoutOutlined, SwapOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { NotificationBell } from "./notification-bell";

const { Text } = Typography;

const roleColors: Record<string, string> = {
  admin: "red",
  provider_owner: "green",
  customer: "blue",
};

const roleLabels: Record<string, string> = {
  admin: "Admin",
  provider_owner: "Provider",
  customer: "Customer",
};

export const AppHeader = () => {
  const { data: identity } = useGetIdentity<{
    name: string;
    role: string;
    email: string;
  }>();
  const { mutate: logout } = useLogout();
  const { i18n } = useTranslation();

  const role = identity?.role ?? "customer";

  const handleLangChange = (lang: string | number) => {
    const langStr = String(lang);
    i18n.changeLanguage(langStr);
    localStorage.setItem("cds-lang", langStr);
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
        <Segmented
          size="small"
          value={i18n.language}
          options={[
            { value: "de", label: "DE" },
            { value: "en", label: "EN" },
          ]}
          onChange={handleLangChange}
        />
        <NotificationBell />
        <Tag color={roleColors[role] ?? "blue"}>
          {roleLabels[role] ?? role}
        </Tag>
        <Text>{identity?.name}</Text>
        <Button
          size="small"
          icon={<SwapOutlined />}
          onClick={() => logout()}
        >
          Switch role
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
