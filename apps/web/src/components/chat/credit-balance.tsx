import { useState, useEffect, useCallback } from "react";
import { Badge, Modal, Button, Card, Space, Typography, message } from "antd";
import { WalletOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";

const { Text, Title } = Typography;

const CREDIT_PACKS = [
  { key: "starter", credits: 5, priceEur: 4.99 },
  { key: "standard", credits: 20, priceEur: 14.99 },
  { key: "pro", credits: 50, priceEur: 29.99 },
] as const;

export const CreditBalance: React.FC = () => {
  const [balance, setBalance] = useState<number>(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const { t } = useTranslation();

  const fetchBalance = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/credits/balance", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("cds-token") ?? ""}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setBalance(data.balance ?? data.credits ?? 0);
      }
    } catch {
      // Silently fail — balance just shows 0
    }
  }, []);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  const handleBuy = async (packKey: string, credits: number) => {
    setPurchasing(packKey);
    try {
      const res = await fetch("/api/v1/payments/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("cds-token") ?? ""}`,
        },
        body: JSON.stringify({ packKey, credits }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.url) {
          window.location.href = data.url;
          return;
        }
        // If no redirect URL, assume credits were added directly (dev mode)
        message.success(`${credits} credits added`);
        setModalOpen(false);
        fetchBalance();
      } else {
        message.error(t("common.error"));
      }
    } catch {
      message.error(t("common.error"));
    } finally {
      setPurchasing(null);
    }
  };

  const packLabelKeys: Record<string, string> = {
    starter: "agent.starterPack",
    standard: "agent.standardPack",
    pro: "agent.proPack",
  };

  return (
    <>
      <Badge count={balance} overflowCount={999} offset={[-4, 4]} size="small">
        <Button
          size="small"
          icon={<WalletOutlined />}
          onClick={() => setModalOpen(true)}
          title={t("agent.creditBalance")}
        >
          {t("agent.credits")}
        </Button>
      </Badge>

      <Modal
        title={t("agent.buyCredits")}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        width={480}
      >
        <Text type="secondary">
          {t("agent.creditBalance")}: <strong>{balance}</strong>
        </Text>
        <div style={{ marginTop: 16 }}>
          <Space direction="vertical" style={{ width: "100%" }} size={12}>
            {CREDIT_PACKS.map((pack) => (
              <Card key={pack.key} size="small" hoverable>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <Title level={5} style={{ margin: 0 }}>
                      {t(packLabelKeys[pack.key] ?? pack.key)}
                    </Title>
                    <Text type="secondary">
                      {pack.credits} {t("agent.credits")} &mdash; {pack.priceEur.toFixed(2)} EUR
                    </Text>
                  </div>
                  <Button
                    type="primary"
                    loading={purchasing === pack.key}
                    onClick={() => handleBuy(pack.key, pack.credits)}
                  >
                    {t("agent.buyCredits")}
                  </Button>
                </div>
              </Card>
            ))}
          </Space>
        </div>
      </Modal>
    </>
  );
};
