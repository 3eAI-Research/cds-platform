import { Form, Input, InputNumber, Select, Row, Col } from "antd";
import { PlzSearch } from "./plz-search";

interface AddressFormProps {
  namePrefix: string[];
  label: string;
}

export const AddressForm = ({ namePrefix, label }: AddressFormProps) => {
  const form = Form.useFormInstance();

  return (
    <>
      <Form.Item label={label} style={{ marginBottom: 0 }}>
        <Row gutter={16}>
          <Col span={16}>
            <Form.Item
              name={[...namePrefix, "street"]}
              rules={[{ required: true, message: "Straße erforderlich" }]}
            >
              <Input placeholder="Straße" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name={[...namePrefix, "houseNumber"]}
              rules={[{ required: true, message: "Hausnr." }]}
            >
              <Input placeholder="Hausnr." />
            </Form.Item>
          </Col>
        </Row>
      </Form.Item>

      <Row gutter={16}>
        <Col span={8}>
          <Form.Item
            name={[...namePrefix, "postCode"]}
            rules={[{ required: true, message: "PLZ erforderlich" }]}
          >
            <PlzSearch
              placeholder="PLZ"
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
            rules={[{ required: true, message: "Ort erforderlich" }]}
          >
            <Input placeholder="Ort" />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={8}>
          <Form.Item name={[...namePrefix, "floor"]} label="Stockwerk">
            <InputNumber min={-2} max={99} placeholder="z.B. 3" style={{ width: "100%" }} />
          </Form.Item>
        </Col>
        <Col span={16}>
          <Form.Item name={[...namePrefix, "additionalInfo"]} label="Zusatzinfo">
            <Input placeholder="z.B. Hinterhaus, Aufzug vorhanden" />
          </Form.Item>
        </Col>
      </Row>

      <Form.Item name={[...namePrefix, "countryCode"]} initialValue="DE" hidden>
        <Input />
      </Form.Item>

      <Form.Item
        name={[...namePrefix, "elevatorType"]}
        label="Aufzug"
      >
        <Select placeholder="Aufzug auswählen" allowClear>
          <Select.Option value="NONE">Kein Aufzug</Select.Option>
          <Select.Option value="PERSONAL">Personenaufzug</Select.Option>
          <Select.Option value="FREIGHT">Lastenaufzug</Select.Option>
        </Select>
      </Form.Item>
    </>
  );
};
