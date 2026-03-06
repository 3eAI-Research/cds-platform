import { useList } from "@refinedev/core";
import { List } from "@refinedev/antd";
import { Table, Tag, Typography, Rate, Button } from "antd";
import { PlusOutlined, PhoneOutlined, MailOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

const { Text } = Typography;

const statusColors: Record<string, string> = {
  ACTIVE: "success",
  PENDING: "processing",
  SUSPENDED: "warning",
  DEACTIVATED: "default",
};

interface ProviderRecord {
  id: string;
  name: string;
  email: string;
  phoneNumber: string;
  status: string;
  averageRating?: number | null;
  reviewCount: number;
  completedJobCount: number;
  supportedPostCodePrefixes: string[];
  createdAt: string;
}

export const ProviderList = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const role = localStorage.getItem("cds-role") || "customer";
  const isProvider = role === "provider";

  const { data, isLoading } = useList({
    resource: "providers",
    pagination: { pageSize: 20 },
  });

  return (
    <List
      title={t("provider.title")}
      headerButtons={
        isProvider
          ? [
              <Button
                key="register"
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => navigate("/providers/create")}
              >
                {t("provider.register")}
              </Button>,
            ]
          : []
      }
    >
      <Table<ProviderRecord>
        dataSource={data?.data as ProviderRecord[]}
        loading={isLoading}
        rowKey="id"
        pagination={{ pageSize: 20 }}
        onRow={(record) => ({
          onClick: () => navigate(`/providers/${record.id}`),
          style: { cursor: "pointer" },
        })}
      >
        <Table.Column<ProviderRecord>
          title={t("provider.name")}
          dataIndex="name"
          render={(name: string) => <Text strong>{name}</Text>}
          sorter={(a, b) => a.name.localeCompare(b.name)}
        />
        <Table.Column<ProviderRecord>
          title={t("common.status")}
          dataIndex="status"
          width={100}
          render={(s: string) => (
            <Tag color={statusColors[s] ?? "default"}>{s}</Tag>
          )}
        />
        <Table.Column<ProviderRecord>
          title={t("provider.rating")}
          dataIndex="averageRating"
          width={180}
          render={(rating: number | null, record) => (
            <>
              {rating != null ? (
                <>
                  <Rate disabled value={rating} allowHalf style={{ fontSize: 14 }} />
                  <Text type="secondary" style={{ marginLeft: 4 }}>
                    ({record.reviewCount})
                  </Text>
                </>
              ) : (
                <Text type="secondary">{t("provider.noRatings")}</Text>
              )}
            </>
          )}
          sorter={(a, b) => (a.averageRating ?? 0) - (b.averageRating ?? 0)}
        />
        <Table.Column<ProviderRecord>
          title={t("provider.completedJobs")}
          dataIndex="completedJobCount"
          width={90}
          sorter={(a, b) => a.completedJobCount - b.completedJobCount}
        />
        <Table.Column<ProviderRecord>
          title={t("provider.contact")}
          key="contact"
          width={200}
          render={(_, record) => (
            <>
              <Text style={{ fontSize: 12 }}>
                <MailOutlined /> {record.email}
              </Text>
              <br />
              <Text style={{ fontSize: 12 }}>
                <PhoneOutlined /> {record.phoneNumber}
              </Text>
            </>
          )}
        />
        <Table.Column<ProviderRecord>
          title={t("provider.plzAreas")}
          dataIndex="supportedPostCodePrefixes"
          width={120}
          render={(prefixes: string[]) => (
            <>
              {(prefixes ?? []).slice(0, 3).map((p) => (
                <Tag key={p}>{p}</Tag>
              ))}
              {(prefixes ?? []).length > 3 && (
                <Tag>+{prefixes.length - 3}</Tag>
              )}
            </>
          )}
        />
      </Table>
    </List>
  );
};

export default ProviderList;
