import { Refine, Authenticated } from "@refinedev/core";
import {
  useNotificationProvider,
  ThemedLayoutV2,
  ErrorComponent,
} from "@refinedev/antd";
import routerProvider, {
  NavigateToResource,
  UnsavedChangesNotifier,
  DocumentTitleHandler,
} from "@refinedev/react-router-v6";
import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom";
import { ConfigProvider, App as AntdApp, Spin, theme } from "antd";
import {
  FileTextOutlined,
  FileProtectOutlined,
  ShopOutlined,
  DollarOutlined,
  AuditOutlined,
  TeamOutlined,
  UnorderedListOutlined,
  WalletOutlined,
} from "@ant-design/icons";
import { lazy, Suspense, useMemo } from "react";
import { useTranslation } from "react-i18next";
import "@refinedev/antd/dist/reset.css";
import type { ResourceProps } from "@refinedev/core";

import { dataProvider } from "./providers/data-provider";
import { authProvider } from "./providers/auth-provider";
import { i18nProvider } from "./providers/i18n-provider";
import { AppHeader } from "./components/header";
import { ErrorBoundary } from "./components/error-boundary";

// Lazy-loaded pages
const LoginPage = lazy(() => import("./pages/login"));
const DashboardPage = lazy(() => import("./pages/dashboard"));
const DemandList = lazy(() => import("./pages/demands/list"));
const DemandShow = lazy(() => import("./pages/demands/show"));
const DemandCreate = lazy(() => import("./pages/demands/create"));
const ContractList = lazy(() => import("./pages/contracts/list"));
const ContractShow = lazy(() => import("./pages/contracts/show"));
const ContractReview = lazy(() => import("./pages/contracts/review"));
const OfferCreate = lazy(() => import("./pages/offers/create"));
const OfferList = lazy(() => import("./pages/offers/list"));
const ProviderList = lazy(() => import("./pages/providers/list"));
const ProviderShow = lazy(() => import("./pages/providers/show"));
const ProviderCreate = lazy(() => import("./pages/providers/create"));
const PaymentList = lazy(() => import("./pages/payments/list"));

// Admin pages
const PendingProviders = lazy(() => import("./pages/admin/pending-providers"));
const ProviderReviewPage = lazy(() => import("./pages/admin/provider-review"));

const PageLoader = () => (
  <div style={{ display: "flex", justifyContent: "center", padding: 64 }}>
    <Spin size="large" />
  </div>
);

function useRoleResources(): ResourceProps[] {
  const { t } = useTranslation();
  const role = localStorage.getItem("cds-role") || "customer";
  const isProvider = role === "provider";
  const isAdmin = role === "admin";

  return useMemo(() => {
    // Shared resources
    const contracts: ResourceProps = {
      name: "contracts",
      list: "/contracts",
      show: "/contracts/:id",
      meta: { label: t("nav.contracts"), icon: <FileProtectOutlined /> },
    };

    if (isAdmin) {
      return [
        {
          name: "admin-providers",
          list: "/admin/providers",
          meta: { label: t("admin.pendingProviders"), icon: <AuditOutlined /> },
        },
        {
          name: "providers",
          list: "/providers",
          show: "/providers/:id",
          meta: { label: t("nav.providers"), icon: <TeamOutlined /> },
        },
        {
          name: "demands",
          list: "/demands",
          show: "/demands/:id",
          meta: { label: t("nav.demands"), icon: <UnorderedListOutlined /> },
        },
        contracts,
        {
          name: "payments",
          list: "/payments",
          meta: { label: t("nav.payments"), icon: <WalletOutlined /> },
        },
      ];
    }

    if (isProvider) {
      return [
        {
          name: "demands",
          list: "/demands",
          show: "/demands/:id",
          meta: { label: t("dashboard.marketplaceBtn"), icon: <ShopOutlined /> },
        },
        {
          name: "offers",
          list: "/offers",
          meta: { label: t("offer.myOffers"), icon: <DollarOutlined /> },
        },
        contracts,
      ];
    }

    // Customer
    return [
      {
        name: "demands",
        list: "/demands",
        show: "/demands/:id",
        create: "/demands/create",
        meta: { label: t("dashboard.myDemands"), icon: <FileTextOutlined /> },
      },
      contracts,
    ];
  }, [isProvider, isAdmin, t]);
}

function App() {
  const resources = useRoleResources();

  return (
    <ErrorBoundary>
    <BrowserRouter>
      <ConfigProvider theme={{
        token: {
          colorPrimary: "#2563eb",
          colorSuccess: "#16a34a",
          colorWarning: "#f59e0b",
          colorError: "#dc2626",
          colorInfo: "#0ea5e9",
          borderRadius: 8,
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          colorBgLayout: "#f0f5ff",
          colorBgContainer: "#ffffff",
        },
        components: {
          Layout: {
            siderBg: "#0f172a",
            triggerBg: "#1e293b",
          },
          Menu: {
            darkItemBg: "#0f172a",
            darkItemSelectedBg: "#2563eb",
            darkItemHoverBg: "#1e293b",
            darkItemColor: "#94a3b8",
            darkItemSelectedColor: "#ffffff",
            itemBorderRadius: 8,
          },
          Card: {
            borderRadiusLG: 12,
          },
          Button: {
            borderRadius: 8,
            controlHeight: 36,
          },
          Table: {
            borderRadius: 8,
            headerBg: "#f8fafc",
          },
          Tag: {
            borderRadiusSM: 6,
          },
        },
        algorithm: theme.defaultAlgorithm,
      }}>
        <AntdApp>
          <Refine
            dataProvider={dataProvider}
            authProvider={authProvider}
            routerProvider={routerProvider}
            notificationProvider={useNotificationProvider}
            i18nProvider={i18nProvider}
            resources={resources}
            options={{
              syncWithLocation: true,
              warnWhenUnsavedChanges: true,
              projectId: "cds-platform",
            }}
          >
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route
                  element={
                    <Authenticated
                      key="authenticated-routes"
                      redirectOnFail="/login"
                    >
                      <ThemedLayoutV2
                        Header={() => <AppHeader />}
                        Title={({ collapsed }) =>
                          collapsed ? (
                            <span style={{ fontSize: 16, fontWeight: 700 }}>
                              CDS
                            </span>
                          ) : (
                            <span style={{ fontSize: 16, fontWeight: 700 }}>
                              CDS Platform
                            </span>
                          )
                        }
                      >
                        <Outlet />
                      </ThemedLayoutV2>
                    </Authenticated>
                  }
                >
                  <Route index element={<DashboardPage />} />
                  <Route path="/demands">
                    <Route index element={<DemandList />} />
                    <Route path="create" element={<DemandCreate />} />
                    <Route path=":id" element={<DemandShow />} />
                  </Route>
                  <Route path="/demands/:demandId/offer" element={<OfferCreate />} />
                  <Route path="/offers">
                    <Route index element={<OfferList />} />
                  </Route>
                  <Route path="/contracts">
                    <Route index element={<ContractList />} />
                    <Route path=":id" element={<ContractShow />} />
                    <Route path=":id/review" element={<ContractReview />} />
                  </Route>
                  <Route path="/providers">
                    <Route index element={<ProviderList />} />
                    <Route path="create" element={<ProviderCreate />} />
                    <Route path=":id" element={<ProviderShow />} />
                  </Route>
                  <Route path="/payments">
                    <Route index element={<PaymentList />} />
                  </Route>
                  {/* Admin routes */}
                  <Route path="/admin/providers">
                    <Route index element={<PendingProviders />} />
                    <Route path=":id" element={<ProviderReviewPage />} />
                  </Route>
                  <Route path="*" element={<ErrorComponent />} />
                </Route>

                <Route
                  element={
                    <Authenticated key="auth-pages" fallback={<Outlet />}>
                      <NavigateToResource resource={
                        localStorage.getItem("cds-role") === "admin"
                          ? "admin-providers"
                          : "demands"
                      } />
                    </Authenticated>
                  }
                >
                  <Route path="/login" element={<LoginPage />} />
                </Route>
              </Routes>
            </Suspense>
            <UnsavedChangesNotifier />
            <DocumentTitleHandler />
          </Refine>
        </AntdApp>
      </ConfigProvider>
    </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
