import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  HomeOutlined,
  FileTextOutlined,
  FileProtectOutlined,
  ShopOutlined,
  DollarOutlined,
  AuditOutlined,
  MessageOutlined,
  BarChartOutlined,
} from "@ant-design/icons";
import type { CSSProperties, ReactNode } from "react";

interface NavItem {
  key: string;
  path: string;
  icon: ReactNode;
  label: string;
}

export function MobileBottomNav() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const role = localStorage.getItem("cds-role") || "customer";

  const items: NavItem[] = (() => {
    const home: NavItem = {
      key: "home",
      path: "/",
      icon: <HomeOutlined />,
      label: t("nav.dashboard"),
    };

    if (role === "admin") {
      return [
        home,
        { key: "admin-providers", path: "/admin/providers", icon: <AuditOutlined />, label: t("admin.pendingProviders") },
        { key: "demands", path: "/demands", icon: <FileTextOutlined />, label: t("nav.demands") },
        { key: "contracts", path: "/contracts", icon: <FileProtectOutlined />, label: t("nav.contracts") },
      ];
    }

    if (role === "provider") {
      return [
        home,
        { key: "demands", path: "/demands", icon: <ShopOutlined />, label: t("dashboard.marketplaceBtn") },
        { key: "offers", path: "/offers", icon: <DollarOutlined />, label: t("offer.myOffers") },
        { key: "messages", path: "/messages", icon: <MessageOutlined />, label: t("chat.title") },
        { key: "analytics", path: "/analytics", icon: <BarChartOutlined />, label: t("analytics.providerDashboard") },
      ];
    }

    // Customer
    return [
      home,
      { key: "demands", path: "/demands", icon: <FileTextOutlined />, label: t("dashboard.myDemands") },
      { key: "contracts", path: "/contracts", icon: <FileProtectOutlined />, label: t("nav.contracts") },
      { key: "messages", path: "/messages", icon: <MessageOutlined />, label: t("chat.title") },
    ];
  })();

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="cds-mobile-bottom-nav" style={navStyle}>
      {items.map((item) => {
        const active = isActive(item.path);
        return (
          <button
            key={item.key}
            onClick={() => navigate(item.path)}
            style={{
              ...btnStyle,
              color: active ? "#2563eb" : "#64748b",
            }}
          >
            <span style={{ fontSize: 20 }}>{item.icon}</span>
            <span style={{ fontSize: 10, marginTop: 2, lineHeight: 1 }}>
              {item.label.length > 10 ? item.label.slice(0, 9) + "…" : item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

const navStyle: CSSProperties = {
  position: "fixed",
  bottom: 0,
  left: 0,
  right: 0,
  height: 56,
  background: "#fff",
  borderTop: "1px solid #e2e8f0",
  display: "flex",
  justifyContent: "space-around",
  alignItems: "center",
  zIndex: 1000,
  paddingBottom: "env(safe-area-inset-bottom, 0px)",
};

const btnStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  border: "none",
  background: "none",
  cursor: "pointer",
  padding: "4px 8px",
  minWidth: 0,
  flex: 1,
};
