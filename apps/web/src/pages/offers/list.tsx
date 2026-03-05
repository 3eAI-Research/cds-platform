import { useCustom } from "@refinedev/core";
import { List } from "@refinedev/antd";
import { Table, Tag, Typography, Space, Button } from "antd";
import { EuroOutlined, EyeOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";

const { Text } = Typography;

interface Offer {
  id: string;
  demandId: string;
  status: string;
  totalPriceAmount: number;
  providerNetAmount: number;
  commissionAmount: number;
  validUntil: string;
  message?: string;
  createdAt: string;
}

const statusColors: Record<string, string> = {
  SUBMITTED: "processing",
  ACCEPTED: "success",
  REJECTED: "error",
  WITHDRAWN: "default",
  EXPIRED: "warning",
};

export const OfferList = () => {
  const navigate = useNavigate();
  const role = localStorage.getItem("cds-role") || "customer";

  const { data, isLoading } = useCustom<{ items: Offer[]; total: number }>({
    url: "/api/v1/offers",
    method: "get",
    config: {
      query: { pageSize: 50 },
      headers: { "X-User-Role": role },
    },
  });

  const offers = data?.data?.items ?? [];

  const columns = [
    {
      title: "Anfrage",
      dataIndex: "demandId",
      render: (val: string) => (
        <Button type="link" size="small" onClick={() => navigate(`/demands/${val}`)}>
          {val.slice(0, 8)}...
        </Button>
      ),
    },
    {
      title: "Preis",
      dataIndex: "totalPriceAmount",
      render: (cents: number) => (
        <Text strong>
          <EuroOutlined /> {(cents / 100).toFixed(2)} EUR
        </Text>
      ),
      sorter: (a: Offer, b: Offer) => a.totalPriceAmount - b.totalPriceAmount,
    },
    {
      title: "Netto",
      dataIndex: "providerNetAmount",
      render: (cents: number) => (
        <Text type="success">{(cents / 100).toFixed(2)} EUR</Text>
      ),
    },
    {
      title: "Provision",
      dataIndex: "commissionAmount",
      render: (cents: number) => (
        <Text type="danger">{(cents / 100).toFixed(2)} EUR</Text>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      render: (val: string) => (
        <Tag color={statusColors[val] ?? "default"}>{val}</Tag>
      ),
      filters: Object.keys(statusColors).map((s) => ({ text: s, value: s })),
      onFilter: (value: unknown, record: Offer) => record.status === value,
    },
    {
      title: "Gültig bis",
      dataIndex: "validUntil",
      render: (val: string) =>
        val ? new Date(val).toLocaleDateString("de-DE") : "—",
    },
    {
      title: "Erstellt",
      dataIndex: "createdAt",
      render: (val: string) => new Date(val).toLocaleDateString("de-DE"),
    },
    {
      title: "",
      key: "actions",
      render: (_: unknown, rec: Offer) => (
        <Space>
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/demands/${rec.demandId}`)}
          >
            Anfrage
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <List title="Meine Angebote">
      <Table
        dataSource={offers}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        pagination={{ pageSize: 20 }}
        size="small"
      />
    </List>
  );
};

export default OfferList;
