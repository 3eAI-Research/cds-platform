import { Form, Input, InputNumber, Select, Row, Col } from "antd";
import { PlzSearch } from "./plz-search";
import { useTranslation } from "react-i18next";

interface AddressFormProps {
  namePrefix: string[];
  label: string;
}

export const AddressForm = ({ namePrefix, label }: AddressFormProps) => {
  const { t } = useTranslation();
  const form = Form.useFormInstance();

  return (
    <>
      <Form.Item label={label} style={{ marginBottom: 0 }}>
        <Row gutter={16}>
          <Col span={16}>
            <Form.Item
              name={[...namePrefix, "street"]}
              rules={[{ required: true, message: t("validation.streetRequired") }]}
            >
              <Input placeholder={t("address.street")} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name={[...namePrefix, "houseNumber"]}
              rules={[{ required: true, message: t("validation.houseNumberRequired") }]}
            >
              <Input placeholder={t("address.houseNumber")} />
            </Form.Item>
          </Col>
        </Row>
      </Form.Item>

      <Row gutter={16}>
        <Col span={8}>
          <Form.Item
            name={[...namePrefix, "postCode"]}
            rules={[{ required: true, message: t("validation.postCodeRequired") }]}
          >
            <PlzSearch
              placeholder={t("address.postCode")}
              onChange={(val, place) => {
                form.setFieldValue([...namePrefix, "postCode"], val);
                if (place) {
                  form.setFieldValue([...namePrefix, "placeName"], place.placeName);
                }
              }}
            />
          </Form.Item>
        </Col>
        <Col span={16}>
          <Form.Item
            name={[...namePrefix, "placeName"]}
            rules={[{ required: true, message: t("validation.cityRequired") }]}
          >
            <Input placeholder={t("address.city")} />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={8}>
          <Form.Item name={[...namePrefix, "floor"]} label={t("address.floor")}>
            <InputNumber min={-2} max={99} placeholder="z.B. 3" style={{ width: "100%" }} />
          </Form.Item>
        </Col>
        <Col span={16}>
          <Form.Item name={[...namePrefix, "additionalInfo"]} label={t("address.additionalInfo")}>
            <Input placeholder={t("address.additionalInfoPlaceholder")} />
          </Form.Item>
        </Col>
      </Row>

      <Form.Item name={[...namePrefix, "countryCode"]} initialValue="DE" hidden>
        <Input />
      </Form.Item>

      <Form.Item
        name={[...namePrefix, "elevatorType"]}
        label={t("address.elevator")}
      >
        <Select placeholder={t("address.elevator")} allowClear>
          <Select.Option value="NONE">{t("address.elevatorNone")}</Select.Option>
          <Select.Option value="PERSONAL">{t("address.elevatorPersonal")}</Select.Option>
          <Select.Option value="FREIGHT">{t("address.elevatorFreight")}</Select.Option>
        </Select>
      </Form.Item>
    </>
  );
};
