import { useList, useGetIdentity } from "@refinedev/core";
import { List } from "@refinedev/antd";
import { Table, Tag, Button, Space, Typography } from "antd";
import { PlusOutlined, EuroOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";

const { Text } = Typography;

const statusColors: Record<string, string> = {
  DRAFT: "default",
  PUBLISHED: "blue",
  OFFERED: "orange",
  ACCEPTED: "green",
  COMPLETED: "purple",
  CANCELLED: "red",
};

const serviceTypeLabels: Record<string, string> = {
  PRIVATE_MOVE: "Privat",
  COMMERCIAL_MOVE: "Firma",
  FURNITURE_TRANSPORT: "Möbel",
};

interface DemandRecord {
  id: string;
  status: string;
  serviceType?: string;
  offerCount?: number;
  createdAt: string;
  expiresAt?: string;
}

export const DemandList = () => {
  const navigate = useNavigate();
  const { data: identity } = useGetIdentity<{ role: string }>();
  const isProvider = identity?.role === "provider_owner";

  const { data, isLoading } = useList({
    resource: "demands",
    pagination: { pageSize: 20 },
  });

  return (
    <List
      title={isProvider ? "Marktplatz — Umzugsanfragen" : "Meine Umzugsanfragen"}
      headerButtons={
        !isProvider
          ? [
              <Button
                key="create"
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => navigate("/demands/create")}
              >
                Neue Anfrage
              </Button>,
            ]
          : []
      }
    >
      <Table<DemandRecord>
        dataSource={data?.data as DemandRecord[]}
        loading={isLoading}
        rowKey="id"
        pagination={{ pageSize: 20 }}
        onRow={(record) => ({
          onClick: () => navigate(`/demands/${record.id}`),
          style: { cursor: "pointer" },
        })}
      >
        <Table.Column<DemandRecord>
          title="ID"
          dataIndex="id"
          width={100}
          render={(id: string) => <Text copyable={{ text: id }}>{id.slice(0, 8)}</Text>}
        />
        <Table.Column<DemandRecord>
          title="Art"
          dataIndex="serviceType"
          width={80}
          render={(val: string) => (
            <Tag>{serviceTypeLabels[val] ?? val}</Tag>
          )}
          filters={Object.entries(serviceTypeLabels).map(([k, v]) => ({ text: v, value: k }))}
          onFilter={(value, record) => record.serviceType === value}
        />
        <Table.Column<DemandRecord>
          title="Status"
          dataIndex="status"
          width={110}
          render={(status: string) => (
            <Tag color={statusColors[status] || "default"}>{status}</Tag>
          )}
          filters={Object.keys(statusColors).map((s) => ({ text: s, value: s }))}
          onFilter={(value, record) => record.status === value}
        />
        <Table.Column<DemandRecord>
          title="Angebote"
          dataIndex="offerCount"
          width={90}
          render={(count: number) => (
            <Tag color={count > 0 ? "blue" : "default"}>
              <EuroOutlined /> {count ?? 0}
            </Tag>
          )}
          sorter={(a, b) => (a.offerCount ?? 0) - (b.offerCount ?? 0)}
        />
        <Table.Column<DemandRecord>
          title="Gültig bis"
          dataIndex="expiresAt"
          width={110}
          render={(val: string) =>
            val ? new Date(val).toLocaleDateString("de-DE") : "—"
          }
        />
        <Table.Column<DemandRecord>
          title="Erstellt"
          dataIndex="createdAt"
          width={100}
          render={(d: string) => new Date(d).toLocaleDateString("de-DE")}
          defaultSortOrder="descend"
          sorter={(a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          }
        />
        {isProvider && (
          <Table.Column<DemandRecord>
            title="Aktion"
            width={140}
            render={(_, record) =>
              record.status === "PUBLISHED" ? (
                <Space>
                  <Button
                    size="small"
                    type="primary"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/demands/${record.id}/offer`);
                    }}
                  >
                    Angebot abgeben
                  </Button>
                </Space>
              ) : null
            }
          />
        )}
      </Table>
    </List>
  );
};

export default DemandList;
