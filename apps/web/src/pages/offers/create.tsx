import { useCustom } from "@refinedev/core";
import { Create } from "@refinedev/antd";
import {
  Form,
  InputNumber,
  Input,
  DatePicker,
  Card,
  Row,
  Col,
  Typography,
  Spin,
  message,
  Statistic,
} from "antd";
import { EuroOutlined } from "@ant-design/icons";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { useState } from "react";

const { Text } = Typography;
const { TextArea } = Input;

const COMMISSION_RATE = 0.04; // 4%
const VAT_RATE = 0.19; // 19%

export const OfferCreate = () => {
  const { demandId } = useParams();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  const role = localStorage.getItem("cds-role") || "customer";

  // Fetch demand info
  const { data: demandData, isLoading } = useCustom({
    url: `/demands/${demandId}`,
    method: "get",
    config: { headers: { "X-User-Role": role } },
    queryOptions: { enabled: !!demandId },
  });

  const demand = demandData?.data as Record<string, unknown> | undefined;

  const priceEur = Form.useWatch("priceEur", form) ?? 0;
  const commission = priceEur * COMMISSION_RATE;
  const netAmount = priceEur - commission;
  const vat = priceEur * VAT_RATE;
  const totalWithVat = priceEur + vat;

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      const payload = {
        demandId,
        providerCompanyId: "00000000-0000-0000-0000-000000000099", // stub provider company
        totalPriceAmount: Math.round(values.priceEur * 100), // EUR to cents
        validUntil: values.validUntil?.toISOString(),
        message: values.message || undefined,
        priceBreakdown: values.priceBreakdown
          ? { details: values.priceBreakdown }
          : undefined,
      };

      await axios.post("/api/v1/offers", payload, {
        headers: { "X-User-Role": "provider" },
      });

      message.success("Angebot erfolgreich eingereicht!");
      navigate(`/demands/${demandId}`);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Unbekannter Fehler";
      message.error(`Fehler: ${errorMsg}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) return <Spin size="large" />;

  return (
    <Create
      title={`Angebot für Anfrage ${String(demand?.id ?? "").slice(0, 8)}`}
      footerButtons={() => null}
      breadcrumb={false}
    >
      <Row gutter={24}>
        <Col span={14}>
          <Form form={form} layout="vertical">
            <Card title="Preisgestaltung" size="small" style={{ marginBottom: 16 }}>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="priceEur"
                    label="Gesamtpreis (EUR, netto)"
                    rules={[
                      { required: true, message: "Preis erforderlich" },
                      {
                        type: "number",
                        min: 1,
                        message: "Mindestens 1 EUR",
                      },
                    ]}
                  >
                    <InputNumber
                      min={1}
                      max={999999}
                      precision={2}
                      prefix={<EuroOutlined />}
                      style={{ width: "100%" }}
                      placeholder="z.B. 850.00"
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="validUntil"
                    label="Gültig bis"
                    rules={[{ required: true, message: "Datum erforderlich" }]}
                  >
                    <DatePicker
                      style={{ width: "100%" }}
                      format="DD.MM.YYYY"
                    />
                  </Form.Item>
                </Col>
              </Row>
            </Card>

            <Card title="Nachricht an Kunden" size="small" style={{ marginBottom: 16 }}>
              <Form.Item name="message">
                <TextArea
                  rows={4}
                  maxLength={2000}
                  showCount
                  placeholder="Beschreiben Sie Ihr Angebot, Leistungen, Konditionen..."
                />
              </Form.Item>
            </Card>

            <Card title="Preisaufschlüsselung (optional)" size="small" style={{ marginBottom: 16 }}>
              <Form.Item name="priceBreakdown">
                <TextArea
                  rows={3}
                  placeholder="z.B. Transport: 500€, Verpackung: 150€, Montage: 200€"
                />
              </Form.Item>
            </Card>

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                style={{
                  padding: "8px 24px",
                  background: "#1677ff",
                  color: "white",
                  border: "none",
                  borderRadius: 6,
                  cursor: submitting ? "not-allowed" : "pointer",
                  fontSize: 14,
                }}
              >
                {submitting ? "Wird eingereicht..." : "Angebot einreichen"}
              </button>
            </div>
          </Form>
        </Col>

        <Col span={10}>
          <Card title="Kalkulation" size="small">
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Statistic
                  title="Ihr Preis"
                  value={priceEur}
                  precision={2}
                  suffix="EUR"
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title={`Provision (${(COMMISSION_RATE * 100).toFixed(0)}%)`}
                  value={commission}
                  precision={2}
                  suffix="EUR"
                  valueStyle={{ color: "#cf1322" }}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="Netto (nach Provision)"
                  value={netAmount}
                  precision={2}
                  suffix="EUR"
                  valueStyle={{ color: "#3f8600" }}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title={`MwSt. (${(VAT_RATE * 100).toFixed(0)}%)`}
                  value={vat}
                  precision={2}
                  suffix="EUR"
                />
              </Col>
              <Col span={24}>
                <Statistic
                  title="Kundenpreis (inkl. MwSt.)"
                  value={totalWithVat}
                  precision={2}
                  suffix="EUR"
                  valueStyle={{ fontWeight: 700, fontSize: 24 }}
                />
              </Col>
            </Row>
          </Card>

          {demand && (
            <Card title="Anfrage-Info" size="small" style={{ marginTop: 16 }}>
              <Text type="secondary">Status: </Text>
              <Text>{String(demand.status)}</Text>
              <br />
              <Text type="secondary">Art: </Text>
              <Text>{String(demand.serviceType)}</Text>
              <br />
              <Text type="secondary">Angebote: </Text>
              <Text>{String(demand.offerCount ?? 0)}</Text>
              <br />
              <Text type="secondary">Erstellt: </Text>
              <Text>
                {demand.createdAt
                  ? new Date(String(demand.createdAt)).toLocaleDateString("de-DE")
                  : "—"}
              </Text>
            </Card>
          )}
        </Col>
      </Row>
    </Create>
  );
};

export default OfferCreate;
