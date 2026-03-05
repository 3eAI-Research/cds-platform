import { Form, Rate, Input, Button, Card, Typography, message, Space, Tag } from "antd";
import { StarOutlined } from "@ant-design/icons";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { useState } from "react";

const { Title, Text } = Typography;
const { TextArea } = Input;

const ASPECTS = [
  { key: "PUNCTUALITY", label: "Pünktlichkeit" },
  { key: "CAREFULNESS", label: "Sorgfalt" },
  { key: "COMMUNICATION", label: "Kommunikation" },
  { key: "VALUE_FOR_MONEY", label: "Preis-Leistung" },
  { key: "PROFESSIONALISM", label: "Professionalität" },
];

export const ContractReview = () => {
  const { id: contractId } = useParams();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const role = localStorage.getItem("cds-role") || "customer";

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

      message.success("Bewertung erfolgreich abgegeben!");
      navigate(`/contracts/${contractId}`);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Unbekannter Fehler";
      message.error(`Fehler: ${errorMsg}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: "24px 0" }}>
      <Title level={3}>
        <StarOutlined /> Bewertung abgeben
      </Title>
      <Text type="secondary">
        Vertrag: {String(contractId ?? "").slice(0, 8)}...
      </Text>
      <Tag style={{ marginLeft: 8 }}>
        {direction === "CUSTOMER_TO_PROVIDER"
          ? "Kunde bewertet Anbieter"
          : "Anbieter bewertet Kunden"}
      </Tag>

      <Form form={form} layout="vertical" style={{ marginTop: 24 }}>
        <Card title="Gesamtbewertung" size="small" style={{ marginBottom: 16 }}>
          <Form.Item
            name="rating"
            rules={[{ required: true, message: "Bewertung erforderlich" }]}
          >
            <Rate
              style={{ fontSize: 32 }}
              tooltips={[
                "Mangelhaft",
                "Ausreichend",
                "Befriedigend",
                "Gut",
                "Sehr gut",
              ]}
            />
          </Form.Item>
        </Card>

        <Card
          title="Detailbewertung (optional)"
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

        <Card title="Kommentar (optional)" size="small" style={{ marginBottom: 16 }}>
          <Form.Item name="comment">
            <TextArea
              rows={4}
              maxLength={2000}
              showCount
              placeholder="Beschreiben Sie Ihre Erfahrung..."
            />
          </Form.Item>
        </Card>

        <Space>
          <Button
            type="primary"
            loading={submitting}
            onClick={handleSubmit}
          >
            Bewertung abgeben
          </Button>
          <Button onClick={() => navigate(`/contracts/${contractId}`)}>
            Abbrechen
          </Button>
        </Space>
      </Form>
    </div>
  );
};

export default ContractReview;
