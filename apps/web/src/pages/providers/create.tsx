import { useCreate } from "@refinedev/core";
import { Create } from "@refinedev/antd";
import {
  Form,
  Input,
  Card,
  Row,
  Col,
  Select,
  Typography,
  message,
  Button,
  Space,
} from "antd";
import { useNavigate } from "react-router-dom";
import { AddressForm } from "../../components/address-form";

const { Text } = Typography;

const PLZ_PREFIXES = [
  "01", "02", "03", "04", "06", "07", "08", "09",
  "10", "12", "13", "14", "15", "16", "17", "18", "19",
  "20", "21", "22", "23", "24", "25", "26", "27", "28", "29",
  "30", "31", "32", "33", "34", "35", "36", "37", "38", "39",
  "40", "41", "42", "44", "45", "46", "47", "48", "49",
  "50", "51", "52", "53", "54", "55", "56", "57", "58", "59",
  "60", "61", "63", "64", "65", "66", "67", "68", "69",
  "70", "71", "72", "73", "74", "75", "76", "77", "78", "79",
  "80", "81", "82", "83", "84", "85", "86", "87", "88", "89",
  "90", "91", "92", "93", "94", "95", "96", "97", "98", "99",
];

export const ProviderCreate = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { mutate: create, isLoading: creating } = useCreate();

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      const payload = {
        name: values.name,
        email: values.email,
        phoneNumber: values.phoneNumber,
        taxNumber: values.taxNumber,
        supportedPostCodePrefixes: values.supportedPostCodePrefixes ?? [],
        address: values.address,
      };

      create(
        { resource: "providers", values: payload },
        {
          onSuccess: () => {
            message.success("Firma erfolgreich registriert!");
            navigate("/providers");
          },
          onError: (error) => {
            message.error(`Fehler: ${error.message}`);
          },
        }
      );
    } catch {
      // validation errors shown by form
    }
  };

  return (
    <Create
      title="Firma registrieren"
      footerButtons={() => null}
    >
      <Form form={form} layout="vertical">
        <Row gutter={24}>
          <Col span={12}>
            <Card title="Firmendaten" size="small" style={{ marginBottom: 16 }}>
              <Form.Item
                name="name"
                label="Firmenname"
                rules={[{ required: true, message: "Firmenname erforderlich" }]}
              >
                <Input placeholder="z.B. Müller Umzüge GmbH" />
              </Form.Item>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="email"
                    label="E-Mail"
                    rules={[
                      { required: true, message: "E-Mail erforderlich" },
                      { type: "email", message: "Ungültige E-Mail" },
                    ]}
                  >
                    <Input placeholder="info@firma.de" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="phoneNumber"
                    label="Telefon"
                    rules={[{ required: true, message: "Telefon erforderlich" }]}
                  >
                    <Input placeholder="+49 30 12345678" />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item
                name="taxNumber"
                label="Steuernummer"
                rules={[{ required: true, message: "Steuernummer erforderlich" }]}
              >
                <Input placeholder="z.B. DE123456789" />
              </Form.Item>
            </Card>

            <Card title="Servicegebiete (PLZ-Präfixe)" size="small">
              <Text type="secondary" style={{ display: "block", marginBottom: 8 }}>
                Wählen Sie die PLZ-Gebiete, in denen Sie Umzüge anbieten.
              </Text>
              <Form.Item
                name="supportedPostCodePrefixes"
                rules={[{ required: true, message: "Mindestens ein PLZ-Gebiet" }]}
              >
                <Select
                  mode="multiple"
                  placeholder="PLZ-Präfixe auswählen"
                  optionFilterProp="label"
                  options={PLZ_PREFIXES.map((p) => ({ value: p, label: p }))}
                  maxTagCount={10}
                />
              </Form.Item>
            </Card>
          </Col>

          <Col span={12}>
            <Card title="Firmenadresse" size="small">
              <AddressForm namePrefix={["address"]} label="Geschäftsadresse" />
            </Card>
          </Col>
        </Row>

        <div style={{ marginTop: 24, display: "flex", justifyContent: "flex-end" }}>
          <Space>
            <Button onClick={() => navigate("/providers")}>Abbrechen</Button>
            <Button type="primary" loading={creating} onClick={handleSubmit}>
              Firma registrieren
            </Button>
          </Space>
        </div>
      </Form>
    </Create>
  );
};

export default ProviderCreate;
