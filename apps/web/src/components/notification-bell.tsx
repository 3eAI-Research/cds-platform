import { useCustom } from "@refinedev/core";
import { Badge, Button, Dropdown, List, Typography, Space, Empty } from "antd";
import { BellOutlined, CheckOutlined } from "@ant-design/icons";
import axios from "axios";
import { useState } from "react";

const { Text } = Typography;

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  readAt?: string;
  createdAt: string;
}

export const NotificationBell = () => {
  const role = localStorage.getItem("cds-role") || "customer";
  const [open, setOpen] = useState(false);

  const { data, refetch } = useCustom<{ items: Notification[]; total: number }>({
    url: "/notifications",
    method: "get",
    config: {
      query: { pageSize: 10 },
      headers: { "X-User-Role": role },
    },
  });

  const notifications = data?.data?.items ?? [];
  const unreadCount = notifications.filter((n) => !n.readAt).length;

  const markAsRead = async (notificationId: string) => {
    try {
      await axios.patch(`/api/v1/notifications/${notificationId}/read`, null, {
        headers: { "X-User-Role": role },
      });
      refetch();
    } catch {
      // silent
    }
  };

  const markAllRead = async () => {
    try {
      await axios.patch("/api/v1/notifications/read-all", null, {
        headers: { "X-User-Role": role },
      });
      refetch();
    } catch {
      // silent
    }
  };

  const dropdownContent = (
    <div
      style={{
        width: 360,
        maxHeight: 400,
        overflow: "auto",
        background: "white",
        borderRadius: 8,
        boxShadow: "0 6px 16px rgba(0,0,0,0.12)",
      }}
    >
      <div
        style={{
          padding: "12px 16px",
          borderBottom: "1px solid #f0f0f0",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Text strong>Benachrichtigungen</Text>
        {unreadCount > 0 && (
          <Button type="link" size="small" onClick={markAllRead}>
            <CheckOutlined /> Alle gelesen
          </Button>
        )}
      </div>

      {notifications.length > 0 ? (
        <List
          dataSource={notifications}
          renderItem={(item) => (
            <List.Item
              style={{
                padding: "8px 16px",
                background: item.readAt ? undefined : "#f6ffed",
                cursor: item.readAt ? "default" : "pointer",
              }}
              onClick={() => !item.readAt && markAsRead(item.id)}
            >
              <List.Item.Meta
                title={
                  <Space>
                    <Text style={{ fontSize: 13 }}>{item.title}</Text>
                    {!item.readAt && (
                      <Badge status="processing" />
                    )}
                  </Space>
                }
                description={
                  <>
                    <Text
                      type="secondary"
                      style={{ fontSize: 12 }}
                      ellipsis
                    >
                      {item.message}
                    </Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      {new Date(item.createdAt).toLocaleString("de-DE")}
                    </Text>
                  </>
                }
              />
            </List.Item>
          )}
        />
      ) : (
        <Empty
          description="Keine Benachrichtigungen"
          style={{ padding: 24 }}
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      )}
    </div>
  );

  return (
    <Dropdown
      dropdownRender={() => dropdownContent}
      trigger={["click"]}
      open={open}
      onOpenChange={setOpen}
      placement="bottomRight"
    >
      <Badge count={unreadCount} size="small" offset={[-2, 2]}>
        <Button type="text" icon={<BellOutlined style={{ fontSize: 18 }} />} />
      </Badge>
    </Dropdown>
  );
};
