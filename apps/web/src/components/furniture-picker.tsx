import { useCustom } from "@refinedev/core";
import { Card, Collapse, InputNumber, Space, Tag, Typography, Spin, Empty } from "antd";
import { InboxOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";

const { Text } = Typography;

interface FurnitureType {
  id: string;
  name: string;
  volume: number;
  assemblable: boolean;
  calculationType: string;
}

interface FurnitureGroup {
  id: string;
  name: string;
  furnitureTypes: FurnitureType[];
}

interface FurnitureSelection {
  furnitureTypeId: string;
  quantity: number;
}

interface FurniturePickerProps {
  value?: FurnitureSelection[];
  onChange?: (items: FurnitureSelection[]) => void;
}

export const FurniturePicker = ({ value = [], onChange }: FurniturePickerProps) => {
  const { t } = useTranslation();
  const { data, isLoading } = useCustom<FurnitureGroup[]>({
    url: "/furniture-groups",
    method: "get",
    config: {
      headers: { "Accept-Language": "de" },
    },
  });

  const groups = data?.data ?? [];

  const getQuantity = (ftId: string): number => {
    return value.find((v) => v.furnitureTypeId === ftId)?.quantity ?? 0;
  };

  const setQuantity = (ftId: string, qty: number) => {
    const existing = value.filter((v) => v.furnitureTypeId !== ftId);
    if (qty > 0) {
      existing.push({ furnitureTypeId: ftId, quantity: qty });
    }
    onChange?.(existing);
  };

  const totalVolume = groups
    .flatMap((g) => g.furnitureTypes)
    .reduce((sum, ft) => {
      const qty = getQuantity(ft.id);
      return sum + ft.volume * qty;
    }, 0);

  const totalItems = value.reduce((sum, v) => sum + v.quantity, 0);

  if (isLoading) return <Spin />;
  if (!groups.length) return <Empty description={t("furniture.noTypes")} />;

  return (
    <div>
      <Card size="small" style={{ marginBottom: 16 }}>
        <Space size="large">
          <Text strong>
            <InboxOutlined /> {totalItems} {t("furniture.items")}
          </Text>
          <Tag color="blue">{totalVolume.toFixed(1)} m³ {t("furniture.estimated")}</Tag>
        </Space>
      </Card>

      <Collapse
        accordion
        items={groups.map((group) => ({
          key: group.id,
          label: (
            <Space>
              <Text strong>{group.name}</Text>
              <Tag>
                {group.furnitureTypes.filter((ft) => getQuantity(ft.id) > 0).length} {t("furniture.selected")}
              </Tag>
            </Space>
          ),
          children: (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {group.furnitureTypes.map((ft) => (
                <div
                  key={ft.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "4px 8px",
                    background: getQuantity(ft.id) > 0 ? "#f6ffed" : undefined,
                    borderRadius: 4,
                  }}
                >
                  <Space direction="vertical" size={0}>
                    <Text>{ft.name}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {ft.volume} m³
                      {ft.assemblable && ` · ${t("furniture.assemblable")}`}
                    </Text>
                  </Space>
                  <InputNumber
                    min={0}
                    max={99}
                    size="small"
                    value={getQuantity(ft.id)}
                    onChange={(val) => setQuantity(ft.id, val ?? 0)}
                    style={{ width: 60 }}
                  />
                </div>
              ))}
            </div>
          ),
        }))}
      />
    </div>
  );
};
