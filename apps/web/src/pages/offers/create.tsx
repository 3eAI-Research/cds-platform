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
import { useTranslation } from "react-i18next";
import axios from "axios";
import { useState } from "react";

const { Text } = Typography;
const { TextArea } = Input;

const COMMISSION_RATE = 0.04; // 4%
const VAT_RATE = 0.19; // 19%

export const OfferCreate = () => {
  const { t } = useTranslation();
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

      message.success(t("offer.submitted"));
      navigate(`/demands/${demandId}`);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : t("common.unknownError");
      message.error(`Fehler: ${errorMsg}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) return <Spin size="large" />;

  return (
    <Create
      title={`${t("offer.offerFor")} ${String(demand?.id ?? "").slice(0, 8)}`}
      footerButtons={() => null}
      breadcrumb={false}
    >
      <Row gutter={24}>
        <Col span={14}>
          <Form form={form} layout="vertical">
            <Card title={t("offer.pricing")} size="small" style={{ marginBottom: 16 }}>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="priceEur"
                    label={t("offer.price")}
                    rules={[
                      { required: true, message: t("offer.priceRequired") },
                      {
                        type: "number",
                        min: 1,
                        message: t("validation.minPrice"),
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
                    label={t("offer.validUntil")}
                    rules={[{ required: true, message: t("validation.dateRequired") }]}
                  >
                    <DatePicker
                      style={{ width: "100%" }}
                      format="DD.MM.YYYY"
                    />
                  </Form.Item>
                </Col>
              </Row>
            </Card>

            <Card title={t("offer.message")} size="small" style={{ marginBottom: 16 }}>
              <Form.Item name="message">
                <TextArea
                  rows={4}
                  maxLength={2000}
                  showCount
                  placeholder={t("offer.messagePlaceholder")}
                />
              </Form.Item>
            </Card>

            <Card title={t("offer.priceBreakdown")} size="small" style={{ marginBottom: 16 }}>
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
                {submitting ? t("offer.submitting") : t("offer.submitOffer")}
              </button>
            </div>
          </Form>
        </Col>

        <Col span={10}>
          <Card title={t("offer.calculation")} size="small">
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Statistic
                  title={t("offer.yourPrice")}
                  value={priceEur}
                  precision={2}
                  suffix="EUR"
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title={`${t("offer.commission")} (${(COMMISSION_RATE * 100).toFixed(0)}%)`}
                  value={commission}
                  precision={2}
                  suffix="EUR"
                  valueStyle={{ color: "#cf1322" }}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title={t("offer.netAmount")}
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
                  title={t("offer.customerPrice")}
                  value={totalWithVat}
                  precision={2}
                  suffix="EUR"
                  valueStyle={{ fontWeight: 700, fontSize: 24 }}
                />
              </Col>
            </Row>
          </Card>

          {demand && (
            <Card title={t("offer.requestInfo")} size="small" style={{ marginTop: 16 }}>
              <Text type="secondary">{t("common.status")}: </Text>
              <Text>{String(demand.status)}</Text>
              <br />
              <Text type="secondary">{t("common.type")}: </Text>
              <Text>{String(demand.serviceType)}</Text>
              <br />
              <Text type="secondary">{t("demand.offers")}: </Text>
              <Text>{String(demand.offerCount ?? 0)}</Text>
              <br />
              <Text type="secondary">{t("common.created")}: </Text>
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
