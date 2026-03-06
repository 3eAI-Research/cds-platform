import { useCreate } from "@refinedev/core";
import { Create } from "@refinedev/antd";
import {
  Steps,
  Form,
  Button,
  Select,
  DatePicker,
  InputNumber,
  Input,
  Checkbox,
  Card,
  Space,
  Row,
  Col,
  Typography,
  Divider,
  message,
} from "antd";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCustom } from "@refinedev/core";
import { useTranslation } from "react-i18next";
import { AddressForm } from "../../components/address-form";
import { FurniturePicker } from "../../components/furniture-picker";

const { Title, Text } = Typography;
const { TextArea } = Input;

interface EstateType {
  id: string;
  name: string;
}

interface EstatePartType {
  id: string;
  name: string;
  isOuterPart: boolean;
}

export const DemandCreate = () => {
  const [current, setCurrent] = useState(0);
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { mutate: create, isLoading: creating } = useCreate();
  const { t } = useTranslation();

  // Fetch estate types
  const { data: estateTypesData } = useCustom<EstateType[]>({
    url: "/estate-types",
    method: "get",
    config: { headers: { "Accept-Language": "de" } },
  });
  const estateTypes = estateTypesData?.data ?? [];

  // Fetch room types for selected estate type
  const selectedFromEstateType = Form.useWatch(["from", "estate", "estateTypeId"], form);
  const { data: fromPartsData } = useCustom<{ partTypes: EstatePartType[] }>({
    url: `/estate-types/${selectedFromEstateType}/parts`,
    method: "get",
    config: { headers: { "Accept-Language": "de" } },
    queryOptions: { enabled: !!selectedFromEstateType },
  });

  const steps = [
    { title: t("demand.addresses"), description: t("demand.fromTo") },
    { title: t("demand.apartment"), description: t("demand.roomsFurniture") },
    { title: t("demand.details"), description: t("demand.dateServices") },
    { title: t("demand.summary"), description: t("demand.checkSend") },
  ];

  const next = async () => {
    try {
      const fieldsToValidate = getFieldsForStep(current);
      if (fieldsToValidate.length > 0) {
        await form.validateFields(fieldsToValidate);
      }
      setCurrent(current + 1);
    } catch {
      // validation errors shown by form
    }
  };

  const getFieldsForStep = (step: number): string[][] => {
    switch (step) {
      case 0:
        return [
          ["from", "address", "street"],
          ["from", "address", "houseNumber"],
          ["from", "address", "postCode"],
          ["from", "address", "placeName"],
          ["to", "address", "street"],
          ["to", "address", "houseNumber"],
          ["to", "address", "postCode"],
          ["to", "address", "placeName"],
        ];
      case 1:
        return [
          ["from", "estate", "estateTypeId"],
          ["from", "estate", "totalSquareMeters"],
          ["from", "estate", "numberOfRooms"],
        ];
      case 2:
        return [["preferredDateStart"], ["preferredDateEnd"], ["numberOfPeople"]];
      default:
        return [];
    }
  };

  const handleSubmit = () => {
    const values = form.getFieldsValue(true);

    // Build the CreateDemandDto
    const payload = {
      serviceType: values.serviceType || "PRIVATE_MOVE",
      transportType: values.transportType || "LOCAL",
      numberOfPeople: values.numberOfPeople || 2,
      preferredDateStart: values.preferredDateStart?.toISOString?.() || values.preferredDateStart,
      preferredDateEnd: values.preferredDateEnd?.toISOString?.() || values.preferredDateEnd,
      dateFlexibility: values.dateFlexibility ?? false,
      additionalNotes: values.additionalNotes,
      preferredLocale: "de",
      from: {
        address: values.from.address,
        estate: {
          ...values.from.estate,
          parts: (values.from.estate.parts ?? [{ estatePartTypeId: fromPartsData?.data?.partTypes?.[0]?.id, furnitureItems: values.furnitureItems || [] }]),
        },
      },
      to: {
        address: values.to.address,
        estate: {
          estateTypeId: values.to?.estate?.estateTypeId || values.from.estate.estateTypeId,
          totalSquareMeters: values.to?.estate?.totalSquareMeters || values.from.estate.totalSquareMeters,
          numberOfRooms: values.to?.estate?.numberOfRooms || values.from.estate.numberOfRooms,
          numberOfFloors: 1,
          parts: [{ estatePartTypeId: fromPartsData?.data?.partTypes?.[0]?.id || "", furnitureItems: [] }],
        },
      },
    };

    create(
      { resource: "demands", values: payload },
      {
        onSuccess: () => {
          message.success(t("demand.created"));
          navigate("/demands");
        },
        onError: (error) => {
          message.error(`Fehler: ${error.message}`);
        },
      }
    );
  };

  return (
    <Create
      title={t("demand.create")}
      footerButtons={() => null}
    >
      <Steps current={current} items={steps} style={{ marginBottom: 32 }} />

      <Form form={form} layout="vertical" initialValues={{
        serviceType: "PRIVATE_MOVE",
        transportType: "LOCAL",
        numberOfPeople: 2,
      }}>
        {/* Step 0: Addresses */}
        <div style={{ display: current === 0 ? "block" : "none" }}>
          <Row gutter={32}>
            <Col span={12}>
              <Card title={t("demand.from")} size="small">
                <AddressForm namePrefix={["from", "address"]} label={t("demand.from")} />
              </Card>
            </Col>
            <Col span={12}>
              <Card title={t("demand.to")} size="small">
                <AddressForm namePrefix={["to", "address"]} label={t("demand.to")} />
              </Card>
            </Col>
          </Row>
        </div>

        {/* Step 1: Estate + Furniture */}
        <div style={{ display: current === 1 ? "block" : "none" }}>
          <Card title={t("demand.apartmentDetails")} size="small" style={{ marginBottom: 16 }}>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item
                  name={["from", "estate", "estateTypeId"]}
                  label={t("demand.estateType")}
                  rules={[{ required: true, message: t("validation.selectRequired") }]}
                >
                  <Select placeholder={t("validation.selectRequired")}>
                    {estateTypes.map((et) => (
                      <Select.Option key={et.id} value={et.id}>{et.name}</Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name={["from", "estate", "totalSquareMeters"]}
                  label={t("demand.squareMeters")}
                  rules={[{ required: true, message: t("validation.required") }]}
                >
                  <InputNumber min={1} max={9999} style={{ width: "100%" }} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name={["from", "estate", "numberOfRooms"]}
                  label={t("demand.rooms")}
                  rules={[{ required: true, message: t("validation.required") }]}
                >
                  <InputNumber min={1} max={20} style={{ width: "100%" }} />
                </Form.Item>
              </Col>
            </Row>
          </Card>

          <Card title={t("demand.furniture")} size="small">
            <Text type="secondary" style={{ display: "block", marginBottom: 12 }}>
              {t("demand.furnitureHint")}
            </Text>
            <Form.Item name="furnitureItems" noStyle>
              <FurniturePicker />
            </Form.Item>
          </Card>
        </div>

        {/* Step 2: Date + Services */}
        <div style={{ display: current === 2 ? "block" : "none" }}>
          <Card title={t("demand.dateRange")} size="small">
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item
                  name="preferredDateStart"
                  label={t("demand.earliestDate")}
                  rules={[{ required: true, message: t("validation.dateRequired") }]}
                >
                  <DatePicker style={{ width: "100%" }} format="DD.MM.YYYY" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name="preferredDateEnd"
                  label={t("demand.latestDate")}
                  rules={[{ required: true, message: t("validation.dateRequired") }]}
                >
                  <DatePicker style={{ width: "100%" }} format="DD.MM.YYYY" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name="numberOfPeople"
                  label={t("demand.persons")}
                  rules={[{ required: true }]}
                >
                  <InputNumber min={1} max={20} style={{ width: "100%" }} />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item name="dateFlexibility" valuePropName="checked">
              <Checkbox>{t("demand.flexibleDate")}</Checkbox>
            </Form.Item>

            <Divider>{t("demand.additionalServices")}</Divider>

            <Row gutter={16}>
              <Col span={6}>
                <Form.Item name={["from", "estate", "furnitureMontage"]} valuePropName="checked">
                  <Checkbox>{t("demand.furnitureMontage")}</Checkbox>
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name={["from", "estate", "kitchenMontage"]} valuePropName="checked">
                  <Checkbox>{t("demand.kitchenMontage")}</Checkbox>
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name={["from", "estate", "packingService"]} valuePropName="checked">
                  <Checkbox>{t("demand.packingService")}</Checkbox>
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name={["from", "estate", "halteverbotRequired"]} valuePropName="checked">
                  <Checkbox>{t("demand.halteverbot")}</Checkbox>
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="serviceType" label={t("demand.serviceType")}>
                  <Select>
                    <Select.Option value="PRIVATE_MOVE">{t("demand.serviceTypes.PRIVATE_MOVE")}</Select.Option>
                    <Select.Option value="COMMERCIAL_MOVE">{t("demand.serviceTypes.COMMERCIAL_MOVE")}</Select.Option>
                    <Select.Option value="FURNITURE_TRANSPORT">{t("demand.serviceTypes.FURNITURE_TRANSPORT")}</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="transportType" label={t("demand.transportType")}>
                  <Select>
                    <Select.Option value="LOCAL">{t("demand.transportTypes.LOCAL")}</Select.Option>
                    <Select.Option value="LONG_DISTANCE">{t("demand.transportTypes.LONG_DISTANCE")}</Select.Option>
                    <Select.Option value="INTERNATIONAL">{t("demand.transportTypes.INTERNATIONAL")}</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Form.Item name="additionalNotes" label={t("demand.notes")}>
              <TextArea rows={3} placeholder={t("demand.notesPlaceholder")} maxLength={2000} showCount />
            </Form.Item>
          </Card>
        </div>

        {/* Step 3: Summary */}
        <div style={{ display: current === 3 ? "block" : "none" }}>
          <SummaryStep form={form} />
        </div>
      </Form>

      <div style={{ marginTop: 24, display: "flex", justifyContent: "space-between" }}>
        <Button disabled={current === 0} onClick={() => setCurrent(current - 1)}>
          {t("common.back")}
        </Button>
        <Space>
          {current < steps.length - 1 && (
            <Button type="primary" onClick={next}>
              {t("common.next")}
            </Button>
          )}
          {current === steps.length - 1 && (
            <Button type="primary" loading={creating} onClick={handleSubmit}>
              {t("demand.submitDemand")}
            </Button>
          )}
        </Space>
      </div>
    </Create>
  );
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SummaryStep = ({ form }: { form: any }) => {
  const { t } = useTranslation();
  const values = form.getFieldsValue(true);
  const fromAddr = values.from?.address;
  const toAddr = values.to?.address;
  const estate = values.from?.estate;
  const furniture = values.furnitureItems ?? [];

  return (
    <Card title={t("demand.summary")} size="small">
      <Row gutter={32}>
        <Col span={12}>
          <Title level={5}>{t("demand.from")}</Title>
          <Text>
            {fromAddr?.street} {fromAddr?.houseNumber}
            <br />
            {fromAddr?.postCode} {fromAddr?.placeName}
            {fromAddr?.floor != null && <><br />{t("demand.floor")}: {fromAddr.floor}</>}
          </Text>
        </Col>
        <Col span={12}>
          <Title level={5}>{t("demand.to")}</Title>
          <Text>
            {toAddr?.street} {toAddr?.houseNumber}
            <br />
            {toAddr?.postCode} {toAddr?.placeName}
          </Text>
        </Col>
      </Row>

      <Divider />

      <Row gutter={32}>
        <Col span={12}>
          <Title level={5}>{t("demand.apartment")}</Title>
          <Text>
            {estate?.totalSquareMeters} m² · {estate?.numberOfRooms} {t("demand.rooms")}
          </Text>
        </Col>
        <Col span={12}>
          <Title level={5}>{t("demand.furniture")}</Title>
          <Text>{furniture.length} {t("demand.itemsSelected")}</Text>
        </Col>
      </Row>

      <Divider />

      <Row gutter={32}>
        <Col span={12}>
          <Title level={5}>{t("demand.dateServices")}</Title>
          <Text>
            {values.preferredDateStart?.format?.("DD.MM.YYYY") || "—"} bis{" "}
            {values.preferredDateEnd?.format?.("DD.MM.YYYY") || "—"}
          </Text>
        </Col>
        <Col span={12}>
          <Title level={5}>{t("demand.additionalServices")}</Title>
          <Space direction="vertical" size={0}>
            {estate?.furnitureMontage && <Text>{t("demand.furnitureMontage")}</Text>}
            {estate?.kitchenMontage && <Text>{t("demand.kitchenMontage")}</Text>}
            {estate?.packingService && <Text>{t("demand.packingService")}</Text>}
            {estate?.halteverbotRequired && <Text>{t("demand.halteverbot")}</Text>}
            {!estate?.furnitureMontage && !estate?.kitchenMontage && !estate?.packingService && !estate?.halteverbotRequired && (
              <Text type="secondary">{t("demand.noAdditionalServices")}</Text>
            )}
          </Space>
        </Col>
      </Row>

      {values.additionalNotes && (
        <>
          <Divider />
          <Title level={5}>{t("demand.notes")}</Title>
          <Text>{values.additionalNotes}</Text>
        </>
      )}
    </Card>
  );
};

export default DemandCreate;
