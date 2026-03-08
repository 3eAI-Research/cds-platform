import { Form, InputNumber, Select, Checkbox, Row, Col, Typography, Divider } from "antd";
import { useTranslation } from "react-i18next";

const { Text } = Typography;

interface EstateFormProps {
  namePrefix: string[];
  label: string;
}

export const EstateForm = ({ namePrefix, label }: EstateFormProps) => {
  const { t } = useTranslation();

  return (
    <>
      <Text strong style={{ fontSize: 15, display: "block", marginBottom: 16 }}>
        {label}
      </Text>

      <Row gutter={16}>
        <Col xs={24} sm={8}>
          <Form.Item
            name={[...namePrefix, "estateType"]}
            label={t("demand.estateType")}
            rules={[{ required: true, message: t("validation.selectRequired") }]}
          >
            <Select placeholder={t("demand.estateType")}>
              <Select.Option value="APARTMENT">Wohnung / Apartment</Select.Option>
              <Select.Option value="HOUSE">Haus / House</Select.Option>
              <Select.Option value="STUDIO">Studio / 1-Zimmer</Select.Option>
              <Select.Option value="OFFICE">Büro / Office</Select.Option>
              <Select.Option value="STORAGE">Lager / Storage</Select.Option>
            </Select>
          </Form.Item>
        </Col>
        <Col xs={12} sm={8}>
          <Form.Item
            name={[...namePrefix, "squareMeters"]}
            label={t("demand.squareMeters")}
            rules={[{ required: true, message: t("validation.required") }]}
          >
            <InputNumber min={10} max={1000} style={{ width: "100%" }} placeholder="z.B. 75" addonAfter="m²" />
          </Form.Item>
        </Col>
        <Col xs={12} sm={8}>
          <Form.Item
            name={[...namePrefix, "rooms"]}
            label={t("demand.rooms")}
            rules={[{ required: true, message: t("validation.required") }]}
          >
            <InputNumber min={1} max={20} style={{ width: "100%" }} placeholder="z.B. 3" />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col xs={12} sm={8}>
          <Form.Item name={[...namePrefix, "floor"]} label={t("demand.floor")}>
            <InputNumber min={-2} max={99} style={{ width: "100%" }} placeholder="z.B. 2" />
          </Form.Item>
        </Col>
        <Col xs={12} sm={8}>
          <Form.Item name={[...namePrefix, "elevatorType"]} label={t("address.elevator")}>
            <Select placeholder={t("address.elevator")} allowClear>
              <Select.Option value="NONE">{t("address.elevatorNone")}</Select.Option>
              <Select.Option value="PERSONAL">{t("address.elevatorPersonal")}</Select.Option>
              <Select.Option value="FREIGHT">{t("address.elevatorFreight")}</Select.Option>
            </Select>
          </Form.Item>
        </Col>
      </Row>

      <Divider style={{ margin: "12px 0 16px" }} />
      <Text type="secondary" style={{ display: "block", marginBottom: 12 }}>
        {t("demand.propertyAreas")}
      </Text>

      <Row gutter={[16, 8]}>
        <Col xs={12} sm={8}>
          <Form.Item name={[...namePrefix, "hasCellar"]} valuePropName="checked" noStyle>
            <Checkbox>{t("demand.hasCellar")}</Checkbox>
          </Form.Item>
        </Col>
        <Col xs={12} sm={8}>
          <Form.Item name={[...namePrefix, "hasAttic"]} valuePropName="checked" noStyle>
            <Checkbox>{t("demand.hasAttic")}</Checkbox>
          </Form.Item>
        </Col>
        <Col xs={12} sm={8}>
          <Form.Item name={[...namePrefix, "hasGarden"]} valuePropName="checked" noStyle>
            <Checkbox>{t("demand.hasGarden")}</Checkbox>
          </Form.Item>
        </Col>
        <Col xs={12} sm={8}>
          <Form.Item name={[...namePrefix, "hasGarage"]} valuePropName="checked" noStyle>
            <Checkbox>{t("demand.hasGarage")}</Checkbox>
          </Form.Item>
        </Col>
        <Col xs={12} sm={8}>
          <Form.Item name={[...namePrefix, "hasBalcony"]} valuePropName="checked" noStyle>
            <Checkbox>{t("demand.hasBalcony")}</Checkbox>
          </Form.Item>
        </Col>
      </Row>
    </>
  );
};
