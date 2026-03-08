import { useState } from "react";
import {
  Steps,
  Button,
  Form,
  Card,
  Typography,
  Row,
  Col,
  Select,
  DatePicker,
  InputNumber,
  Checkbox,
  Input,
  Descriptions,
  Tag,
  Space,
  message,
} from "antd";
import {
  EnvironmentOutlined,
  HomeOutlined,
  InboxOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  RobotOutlined,
  FormOutlined,
  ArrowLeftOutlined,
  ArrowRightOutlined,
} from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { AddressStep } from "../../components/demand/address-step";
import { EstateForm } from "../../components/demand/estate-form";
import { FurniturePicker } from "../../components/furniture-picker";
import { ChatContainer } from "../../components/chat/chat-container";

const { Title, Text } = Typography;

type Mode = "select" | "ai" | "manual";

const STEPS = [
  { key: "addresses", icon: <EnvironmentOutlined /> },
  { key: "fromEstate", icon: <HomeOutlined /> },
  { key: "toEstate", icon: <HomeOutlined /> },
  { key: "furniture", icon: <InboxOutlined /> },
  { key: "dateServices", icon: <CalendarOutlined /> },
  { key: "summary", icon: <CheckCircleOutlined /> },
];

export const DemandCreate = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("select");
  const [currentStep, setCurrentStep] = useState(0);
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  // --- Mode selection ---
  if (mode === "select") {
    return (
      <div style={{ padding: 24, maxWidth: 700, margin: "0 auto" }}>
        <Title level={4} style={{ textAlign: "center", marginBottom: 8 }}>
          {t("demand.create")}
        </Title>
        <Text type="secondary" style={{ display: "block", textAlign: "center", marginBottom: 32 }}>
          {t("auth.subtitle")}
        </Text>

        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Card
              hoverable
              onClick={() => setMode("ai")}
              style={{ textAlign: "center", minHeight: 200 }}
              styles={{ body: { padding: "32px 24px" } }}
            >
              <div style={{
                width: 56, height: 56, borderRadius: 14,
                background: "linear-gradient(135deg, #2563eb, #0ea5e9)",
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                marginBottom: 16, boxShadow: "0 4px 16px rgba(37,99,235,0.25)",
              }}>
                <RobotOutlined style={{ fontSize: 28, color: "#fff" }} />
              </div>
              <Title level={5} style={{ margin: "0 0 8px" }}>
                {t("demand.useAiAssistant")}
              </Title>
              <Text type="secondary" style={{ fontSize: 13 }}>
                {t("agent.welcome").slice(0, 80)}...
              </Text>
            </Card>
          </Col>
          <Col xs={24} sm={12}>
            <Card
              hoverable
              onClick={() => setMode("manual")}
              style={{ textAlign: "center", minHeight: 200 }}
              styles={{ body: { padding: "32px 24px" } }}
            >
              <div style={{
                width: 56, height: 56, borderRadius: 14,
                background: "linear-gradient(135deg, #16a34a, #15803d)",
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                marginBottom: 16, boxShadow: "0 4px 16px rgba(22,163,106,0.25)",
              }}>
                <FormOutlined style={{ fontSize: 28, color: "#fff" }} />
              </div>
              <Title level={5} style={{ margin: "0 0 8px" }}>
                {t("demand.useManualForm")}
              </Title>
              <Text type="secondary" style={{ fontSize: 13 }}>
                {t("demand.addresses")}, {t("demand.apartment")}, {t("demand.roomsFurniture")}
              </Text>
            </Card>
          </Col>
        </Row>
      </div>
    );
  }

  // --- AI Chat mode ---
  if (mode === "ai") {
    return (
      <div style={{ padding: "16px 24px" }}>
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={() => setMode("select")}
          style={{ marginBottom: 12 }}
        >
          {t("common.back")}
        </Button>
        <ChatContainer />
      </div>
    );
  }

  // --- Manual form mode ---
  const stepTitles = [
    t("demand.addresses"),
    t("demand.fromEstate"),
    t("demand.toEstate"),
    t("demand.roomsFurniture"),
    t("demand.dateServices"),
    t("demand.summary"),
  ];

  const handleNext = async () => {
    try {
      // Validate current step fields
      if (currentStep === 0) {
        await form.validateFields([
          ["from", "address", "street"],
          ["from", "address", "postCode"],
          ["from", "address", "placeName"],
          ["to", "address", "street"],
          ["to", "address", "postCode"],
          ["to", "address", "placeName"],
        ]);
      } else if (currentStep === 1) {
        await form.validateFields([
          ["from", "estate", "estateType"],
          ["from", "estate", "squareMeters"],
          ["from", "estate", "rooms"],
        ]);
      } else if (currentStep === 2) {
        await form.validateFields([
          ["to", "estate", "estateType"],
          ["to", "estate", "squareMeters"],
          ["to", "estate", "rooms"],
        ]);
      }
      setCurrentStep((s) => s + 1);
    } catch {
      // Validation errors shown inline
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      const token = localStorage.getItem("cds-token") ?? "";
      const res = await fetch("/api/v1/demands", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      message.success(t("demand.created"));
      navigate("/demands");
    } catch (err) {
      if (err instanceof Error && err.message.startsWith("HTTP")) {
        message.error(t("common.error"));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const formValues = form.getFieldsValue(true);

  return (
    <div style={{ padding: "16px 24px", maxWidth: 800, margin: "0 auto" }}>
      <Button
        type="text"
        icon={<ArrowLeftOutlined />}
        onClick={() => currentStep === 0 ? setMode("select") : setCurrentStep((s) => s - 1)}
        style={{ marginBottom: 12 }}
      >
        {t("common.back")}
      </Button>

      <Steps
        current={currentStep}
        size="small"
        style={{ marginBottom: 24 }}
        items={STEPS.map((step, idx) => ({
          title: <span className="cds-step-title">{stepTitles[idx]}</span>,
          icon: step.icon,
        }))}
        responsive={false}
      />

      <Form
        form={form}
        layout="vertical"
        initialValues={{
          serviceType: "PRIVATE_MOVE",
          transportType: "LOCAL",
          numberOfPeople: 2,
          dateFlexibility: true,
        }}
      >
        {/* Step 0: Addresses */}
        <div style={{ display: currentStep === 0 ? "block" : "none" }}>
          <Space direction="vertical" size={16} style={{ width: "100%" }}>
            <AddressStep direction="from" />
            <AddressStep direction="to" />
          </Space>
        </div>

        {/* Step 1: From estate details */}
        <div style={{ display: currentStep === 1 ? "block" : "none" }}>
          <Card styles={{ body: { padding: "20px 24px" } }}>
            <EstateForm namePrefix={["from", "estate"]} label={t("demand.fromEstate")} />
          </Card>
        </div>

        {/* Step 2: To estate details */}
        <div style={{ display: currentStep === 2 ? "block" : "none" }}>
          <Card styles={{ body: { padding: "20px 24px" } }}>
            <EstateForm namePrefix={["to", "estate"]} label={t("demand.toEstate")} />
          </Card>
        </div>

        {/* Step 3: Furniture */}
        <div style={{ display: currentStep === 3 ? "block" : "none" }}>
          <Card styles={{ body: { padding: "20px 24px" } }}>
            <Text strong style={{ fontSize: 15, display: "block", marginBottom: 8 }}>
              {t("demand.furniture")}
            </Text>
            <Text type="secondary" style={{ display: "block", marginBottom: 16, fontSize: 13 }}>
              {t("demand.furnitureHint")}
            </Text>
            <Form.Item name="furnitureItems" noStyle>
              <FurniturePicker />
            </Form.Item>
          </Card>
        </div>

        {/* Step 4: Date & Services */}
        <div style={{ display: currentStep === 4 ? "block" : "none" }}>
          <Card styles={{ body: { padding: "20px 24px" } }}>
            <Text strong style={{ fontSize: 15, display: "block", marginBottom: 16 }}>
              {t("demand.dateServices")}
            </Text>

            <Row gutter={16}>
              <Col xs={24} sm={8}>
                <Form.Item
                  name="serviceType"
                  label={t("demand.serviceType")}
                  rules={[{ required: true }]}
                >
                  <Select>
                    <Select.Option value="PRIVATE_MOVE">{t("demand.serviceTypes.PRIVATE_MOVE")}</Select.Option>
                    <Select.Option value="COMMERCIAL_MOVE">{t("demand.serviceTypes.COMMERCIAL_MOVE")}</Select.Option>
                    <Select.Option value="FURNITURE_TRANSPORT">{t("demand.serviceTypes.FURNITURE_TRANSPORT")}</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={24} sm={8}>
                <Form.Item
                  name="transportType"
                  label={t("demand.transportType")}
                  rules={[{ required: true }]}
                >
                  <Select>
                    <Select.Option value="LOCAL">{t("demand.transportTypes.LOCAL")}</Select.Option>
                    <Select.Option value="LONG_DISTANCE">{t("demand.transportTypes.LONG_DISTANCE")}</Select.Option>
                    <Select.Option value="INTERNATIONAL">{t("demand.transportTypes.INTERNATIONAL")}</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={24} sm={8}>
                <Form.Item name="numberOfPeople" label={t("demand.persons")}>
                  <InputNumber min={1} max={20} style={{ width: "100%" }} />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col xs={12} sm={8}>
                <Form.Item
                  name="preferredDateStart"
                  label={t("demand.earliestDate")}
                  rules={[{ required: true, message: t("validation.dateRequired") }]}
                >
                  <DatePicker style={{ width: "100%" }} />
                </Form.Item>
              </Col>
              <Col xs={12} sm={8}>
                <Form.Item name="preferredDateEnd" label={t("demand.latestDate")}>
                  <DatePicker style={{ width: "100%" }} />
                </Form.Item>
              </Col>
              <Col xs={24} sm={8} style={{ display: "flex", alignItems: "center", paddingTop: 8 }}>
                <Form.Item name="dateFlexibility" valuePropName="checked" noStyle>
                  <Checkbox>{t("demand.flexibleDate")}</Checkbox>
                </Form.Item>
              </Col>
            </Row>

            <Text type="secondary" style={{ display: "block", margin: "16px 0 12px" }}>
              {t("demand.additionalServices")}
            </Text>
            <Row gutter={[16, 8]}>
              <Col xs={12} sm={6}>
                <Form.Item name="furnitureMontage" valuePropName="checked" noStyle>
                  <Checkbox>{t("demand.furnitureMontage")}</Checkbox>
                </Form.Item>
              </Col>
              <Col xs={12} sm={6}>
                <Form.Item name="kitchenMontage" valuePropName="checked" noStyle>
                  <Checkbox>{t("demand.kitchenMontage")}</Checkbox>
                </Form.Item>
              </Col>
              <Col xs={12} sm={6}>
                <Form.Item name="packingService" valuePropName="checked" noStyle>
                  <Checkbox>{t("demand.packingService")}</Checkbox>
                </Form.Item>
              </Col>
              <Col xs={12} sm={6}>
                <Form.Item name="halteverbot" valuePropName="checked" noStyle>
                  <Checkbox>{t("demand.halteverbot")}</Checkbox>
                </Form.Item>
              </Col>
            </Row>

            <Form.Item name="notes" label={t("demand.notes")} style={{ marginTop: 16 }}>
              <Input.TextArea rows={3} placeholder={t("demand.notesPlaceholder")} />
            </Form.Item>
          </Card>
        </div>

        {/* Step 5: Summary */}
        <div style={{ display: currentStep === 5 ? "block" : "none" }}>
          <Card styles={{ body: { padding: "20px 24px" } }}>
            <Text strong style={{ fontSize: 15, display: "block", marginBottom: 16 }}>
              {t("demand.checkSend")}
            </Text>

            <Descriptions bordered size="small" column={1} style={{ marginBottom: 16 }}>
              <Descriptions.Item label={t("demand.from")}>
                {formValues?.from?.address?.street} {formValues?.from?.address?.houseNumber},{" "}
                {formValues?.from?.address?.postCode} {formValues?.from?.address?.placeName}
              </Descriptions.Item>
              <Descriptions.Item label={t("demand.to")}>
                {formValues?.to?.address?.street} {formValues?.to?.address?.houseNumber},{" "}
                {formValues?.to?.address?.postCode} {formValues?.to?.address?.placeName}
              </Descriptions.Item>
              <Descriptions.Item label={t("demand.fromEstate")}>
                {formValues?.from?.estate?.estateType} · {formValues?.from?.estate?.squareMeters} m² · {formValues?.from?.estate?.rooms} {t("demand.rooms")}
              </Descriptions.Item>
              <Descriptions.Item label={t("demand.toEstate")}>
                {formValues?.to?.estate?.estateType} · {formValues?.to?.estate?.squareMeters} m² · {formValues?.to?.estate?.rooms} {t("demand.rooms")}
              </Descriptions.Item>
              <Descriptions.Item label={t("demand.furniture")}>
                {formValues?.furnitureItems?.length ?? 0} {t("demand.itemsSelected")}
              </Descriptions.Item>
              <Descriptions.Item label={t("demand.serviceType")}>
                <Tag color="blue">{formValues?.serviceType}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label={t("demand.persons")}>
                {formValues?.numberOfPeople}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </div>
      </Form>

      {/* Navigation buttons */}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 20 }}>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => currentStep === 0 ? setMode("select") : setCurrentStep((s) => s - 1)}
        >
          {t("common.back")}
        </Button>

        {currentStep < 5 ? (
          <Button type="primary" icon={<ArrowRightOutlined />} onClick={handleNext}>
            {t("common.next")}
          </Button>
        ) : (
          <Button
            type="primary"
            icon={<CheckCircleOutlined />}
            onClick={handleSubmit}
            loading={submitting}
            style={{
              background: "linear-gradient(135deg, #16a34a, #15803d)",
              boxShadow: "0 4px 16px rgba(22,163,106,0.25)",
            }}
          >
            {t("demand.submitDemand")}
          </Button>
        )}
      </div>
    </div>
  );
};

export default DemandCreate;
