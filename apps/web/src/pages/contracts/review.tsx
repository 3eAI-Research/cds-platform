import { Form, Rate, Input, Button, Card, Typography, message, Space, Tag } from "antd";
import { StarOutlined } from "@ant-design/icons";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import axios from "axios";
import { useState } from "react";

const { Title, Text } = Typography;
const { TextArea } = Input;

export const ContractReview = () => {
  const { id: contractId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const role = localStorage.getItem("cds-role") || "customer";

  const ASPECTS = [
    { key: "PUNCTUALITY", label: t("review.PUNCTUALITY") },
    { key: "CAREFULNESS", label: t("review.CAREFULNESS") },
    { key: "COMMUNICATION", label: t("review.COMMUNICATION") },
    { key: "VALUE_FOR_MONEY", label: t("review.VALUE_FOR_MONEY") },
    { key: "PROFESSIONALISM", label: t("review.PROFESSIONALISM") },
  ];

  const direction =
    role === "customer" ? "CUSTOMER_TO_PROVIDER" : "PROVIDER_TO_CUSTOMER";

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      const aspectRatings = ASPECTS.filter(
        (a) => values[`aspect_${a.key}`]
      ).map((a) => ({
        aspect: a.key,
        rating: values[`aspect_${a.key}`],
      }));

      const payload = {
        contractId,
        direction,
        rating: values.rating,
        comment: values.comment || undefined,
        aspectRatings: aspectRatings.length > 0 ? aspectRatings : undefined,
      };

      await axios.post("/api/v1/reviews", payload, {
        headers: { "X-User-Role": role },
      });

      message.success(t("review.submitted"));
      navigate(`/contracts/${contractId}`);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : t("common.unknownError");
      message.error(`Fehler: ${errorMsg}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: "24px 0" }}>
      <Title level={3}>
        <StarOutlined /> {t("review.title")}
      </Title>
      <Text type="secondary">
        Vertrag: {String(contractId ?? "").slice(0, 8)}...
      </Text>
      <Tag style={{ marginLeft: 8 }}>
        {direction === "CUSTOMER_TO_PROVIDER"
          ? t("review.customerToProvider")
          : t("review.providerToCustomer")}
      </Tag>

      <Form form={form} layout="vertical" style={{ marginTop: 24 }}>
        <Card title={t("review.overall")} size="small" style={{ marginBottom: 16 }}>
          <Form.Item
            name="rating"
            rules={[{ required: true, message: t("validation.ratingRequired") }]}
          >
            <Rate
              style={{ fontSize: 32 }}
              tooltips={[
                t("review.ratings.1"),
                t("review.ratings.2"),
                t("review.ratings.3"),
                t("review.ratings.4"),
                t("review.ratings.5"),
              ]}
            />
          </Form.Item>
        </Card>

        <Card
          title={t("review.aspects")}
          size="small"
          style={{ marginBottom: 16 }}
        >
          {ASPECTS.map((aspect) => (
            <Form.Item
              key={aspect.key}
              name={`aspect_${aspect.key}`}
              label={aspect.label}
              style={{ marginBottom: 8 }}
            >
              <Rate />
            </Form.Item>
          ))}
        </Card>

        <Card title={t("review.comment")} size="small" style={{ marginBottom: 16 }}>
          <Form.Item name="comment">
            <TextArea
              rows={4}
              maxLength={2000}
              showCount
              placeholder={t("review.commentPlaceholder")}
            />
          </Form.Item>
        </Card>

        <Space>
          <Button
            type="primary"
            loading={submitting}
            onClick={handleSubmit}
          >
            {t("review.submit")}
          </Button>
          <Button onClick={() => navigate(`/contracts/${contractId}`)}>
            {t("common.cancel")}
          </Button>
        </Space>
      </Form>
    </div>
  );
};

export default ContractReview;
