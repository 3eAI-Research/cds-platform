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
    { title: "Adressen", description: "Von & Nach" },
    { title: "Wohnung", description: "Räume & Möbel" },
    { title: "Details", description: "Datum & Services" },
    { title: "Zusammenfassung", description: "Prüfen & Senden" },
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
          message.success("Umzugsanfrage erstellt!");
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
      title="Neue Umzugsanfrage"
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
              <Card title="Von (Auszugsadresse)" size="small">
                <AddressForm namePrefix={["from", "address"]} label="Auszugsadresse" />
              </Card>
            </Col>
            <Col span={12}>
              <Card title="Nach (Einzugsadresse)" size="small">
                <AddressForm namePrefix={["to", "address"]} label="Einzugsadresse" />
              </Card>
            </Col>
          </Row>
        </div>

        {/* Step 1: Estate + Furniture */}
        <div style={{ display: current === 1 ? "block" : "none" }}>
          <Card title="Wohnungsdetails (Auszug)" size="small" style={{ marginBottom: 16 }}>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item
                  name={["from", "estate", "estateTypeId"]}
                  label="Wohnungstyp"
                  rules={[{ required: true, message: "Bitte auswählen" }]}
                >
                  <Select placeholder="Typ auswählen">
                    {estateTypes.map((t) => (
                      <Select.Option key={t.id} value={t.id}>{t.name}</Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name={["from", "estate", "totalSquareMeters"]}
                  label="Wohnfläche (m²)"
                  rules={[{ required: true, message: "Erforderlich" }]}
                >
                  <InputNumber min={1} max={9999} style={{ width: "100%" }} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name={["from", "estate", "numberOfRooms"]}
                  label="Anzahl Zimmer"
                  rules={[{ required: true, message: "Erforderlich" }]}
                >
                  <InputNumber min={1} max={20} style={{ width: "100%" }} />
                </Form.Item>
              </Col>
            </Row>
          </Card>

          <Card title="Möbelinventar" size="small">
            <Text type="secondary" style={{ display: "block", marginBottom: 12 }}>
              Wählen Sie die Möbel aus, die transportiert werden sollen.
            </Text>
            <Form.Item name="furnitureItems" noStyle>
              <FurniturePicker />
            </Form.Item>
          </Card>
        </div>

        {/* Step 2: Date + Services */}
        <div style={{ display: current === 2 ? "block" : "none" }}>
          <Card title="Umzugsdatum & Services" size="small">
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item
                  name="preferredDateStart"
                  label="Frühestes Datum"
                  rules={[{ required: true, message: "Datum erforderlich" }]}
                >
                  <DatePicker style={{ width: "100%" }} format="DD.MM.YYYY" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name="preferredDateEnd"
                  label="Spätestes Datum"
                  rules={[{ required: true, message: "Datum erforderlich" }]}
                >
                  <DatePicker style={{ width: "100%" }} format="DD.MM.YYYY" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name="numberOfPeople"
                  label="Anzahl Personen"
                  rules={[{ required: true }]}
                >
                  <InputNumber min={1} max={20} style={{ width: "100%" }} />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item name="dateFlexibility" valuePropName="checked">
              <Checkbox>Datum ist flexibel</Checkbox>
            </Form.Item>

            <Divider>Zusätzliche Services</Divider>

            <Row gutter={16}>
              <Col span={6}>
                <Form.Item name={["from", "estate", "furnitureMontage"]} valuePropName="checked">
                  <Checkbox>Möbelmontage</Checkbox>
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name={["from", "estate", "kitchenMontage"]} valuePropName="checked">
                  <Checkbox>Küchenmontage</Checkbox>
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name={["from", "estate", "packingService"]} valuePropName="checked">
                  <Checkbox>Verpackungsservice</Checkbox>
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name={["from", "estate", "halteverbotRequired"]} valuePropName="checked">
                  <Checkbox>Halteverbot</Checkbox>
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="serviceType" label="Umzugsart">
                  <Select>
                    <Select.Option value="PRIVATE_MOVE">Privatumzug</Select.Option>
                    <Select.Option value="COMMERCIAL_MOVE">Firmenumzug</Select.Option>
                    <Select.Option value="FURNITURE_TRANSPORT">Möbeltransport</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="transportType" label="Transportart">
                  <Select>
                    <Select.Option value="LOCAL">Nahverkehr</Select.Option>
                    <Select.Option value="LONG_DISTANCE">Fernverkehr</Select.Option>
                    <Select.Option value="INTERNATIONAL">International</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Form.Item name="additionalNotes" label="Anmerkungen">
              <TextArea rows={3} placeholder="Besonderheiten, Wünsche, Hinweise..." maxLength={2000} showCount />
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
          Zurück
        </Button>
        <Space>
          {current < steps.length - 1 && (
            <Button type="primary" onClick={next}>
              Weiter
            </Button>
          )}
          {current === steps.length - 1 && (
            <Button type="primary" loading={creating} onClick={handleSubmit}>
              Anfrage absenden
            </Button>
          )}
        </Space>
      </div>
    </Create>
  );
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SummaryStep = ({ form }: { form: any }) => {
  const values = form.getFieldsValue(true);
  const fromAddr = values.from?.address;
  const toAddr = values.to?.address;
  const estate = values.from?.estate;
  const furniture = values.furnitureItems ?? [];

  return (
    <Card title="Zusammenfassung" size="small">
      <Row gutter={32}>
        <Col span={12}>
          <Title level={5}>Von</Title>
          <Text>
            {fromAddr?.street} {fromAddr?.houseNumber}
            <br />
            {fromAddr?.postCode} {fromAddr?.placeName}
            {fromAddr?.floor != null && <><br />Stockwerk: {fromAddr.floor}</>}
          </Text>
        </Col>
        <Col span={12}>
          <Title level={5}>Nach</Title>
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
          <Title level={5}>Wohnung</Title>
          <Text>
            {estate?.totalSquareMeters} m² · {estate?.numberOfRooms} Zimmer
          </Text>
        </Col>
        <Col span={12}>
          <Title level={5}>Möbel</Title>
          <Text>{furniture.length} Positionen ausgewählt</Text>
        </Col>
      </Row>

      <Divider />

      <Row gutter={32}>
        <Col span={12}>
          <Title level={5}>Datum</Title>
          <Text>
            {values.preferredDateStart?.format?.("DD.MM.YYYY") || "—"} bis{" "}
            {values.preferredDateEnd?.format?.("DD.MM.YYYY") || "—"}
          </Text>
        </Col>
        <Col span={12}>
          <Title level={5}>Services</Title>
          <Space direction="vertical" size={0}>
            {estate?.furnitureMontage && <Text>Möbelmontage</Text>}
            {estate?.kitchenMontage && <Text>Küchenmontage</Text>}
            {estate?.packingService && <Text>Verpackungsservice</Text>}
            {estate?.halteverbotRequired && <Text>Halteverbot</Text>}
            {!estate?.furnitureMontage && !estate?.kitchenMontage && !estate?.packingService && !estate?.halteverbotRequired && (
              <Text type="secondary">Keine zusätzlichen Services</Text>
            )}
          </Space>
        </Col>
      </Row>

      {values.additionalNotes && (
        <>
          <Divider />
          <Title level={5}>Anmerkungen</Title>
          <Text>{values.additionalNotes}</Text>
        </>
      )}
    </Card>
  );
};

export default DemandCreate;
