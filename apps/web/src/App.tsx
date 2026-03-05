import { Refine, Authenticated } from "@refinedev/core";
import {
  useNotificationProvider,
  ThemedLayoutV2,
  ErrorComponent,
  RefineThemes,
} from "@refinedev/antd";
import routerProvider, {
  NavigateToResource,
  UnsavedChangesNotifier,
  DocumentTitleHandler,
} from "@refinedev/react-router-v6";
import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom";
import { ConfigProvider, App as AntdApp, Spin } from "antd";
import {
  FileTextOutlined,
  FileProtectOutlined,
  ShopOutlined,
  DollarOutlined,
  WalletOutlined,
} from "@ant-design/icons";
import { lazy, Suspense } from "react";
import "@refinedev/antd/dist/reset.css";

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

const PageLoader = () => (
  <div style={{ display: "flex", justifyContent: "center", padding: 64 }}>
    <Spin size="large" />
  </div>
);

function App() {
  return (
    <ErrorBoundary>
    <BrowserRouter>
      <ConfigProvider theme={RefineThemes.Blue}>
        <AntdApp>
          <Refine
            dataProvider={dataProvider}
            authProvider={authProvider}
            routerProvider={routerProvider}
            notificationProvider={useNotificationProvider}
            i18nProvider={i18nProvider}
            resources={[
              {
                name: "demands",
                list: "/demands",
                show: "/demands/:id",
                create: "/demands/create",
                meta: { label: "Umzugsanfragen", icon: <FileTextOutlined /> },
              },
              {
                name: "contracts",
                list: "/contracts",
                show: "/contracts/:id",
                meta: {
                  label: "Verträge",
                  icon: <FileProtectOutlined />,
                },
              },
              {
                name: "offers",
                list: "/offers",
                meta: { label: "Angebote", icon: <DollarOutlined /> },
              },
              {
                name: "providers",
                list: "/providers",
                show: "/providers/:id",
                create: "/providers/create",
                meta: { label: "Unternehmen", icon: <ShopOutlined /> },
              },
              {
                name: "payments",
                list: "/payments",
                meta: { label: "Zahlungen", icon: <WalletOutlined /> },
              },
            ]}
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
                  <Route path="*" element={<ErrorComponent />} />
                </Route>

                <Route
                  element={
                    <Authenticated key="auth-pages" fallback={<Outlet />}>
                      <NavigateToResource resource="demands" />
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
