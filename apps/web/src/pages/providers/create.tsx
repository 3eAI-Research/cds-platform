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
  Upload,
} from "antd";
import {
  UploadOutlined,
  FileProtectOutlined,
  SafetyCertificateOutlined,
  BankOutlined,
  FileOutlined,
} from "@ant-design/icons";
import type { UploadFile } from "antd";
import { useNavigate } from "react-router-dom";
import { AddressForm } from "../../components/address-form";
import axios from "axios";
import { useState } from "react";

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

const DOCUMENT_TYPES = [
  { value: "BUSINESS_LICENSE", label: "Gewerbeschein", icon: <FileProtectOutlined /> },
  { value: "INSURANCE", label: "Versicherungsnachweis", icon: <SafetyCertificateOutlined /> },
  { value: "COMMERCIAL_REGISTER", label: "Handelsregisterauszug", icon: <BankOutlined /> },
  { value: "OTHER", label: "Sonstiges Dokument", icon: <FileOutlined /> },
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];

interface DocumentUpload {
  type: string;
  fileList: UploadFile[];
}

export const ProviderCreate = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [documents, setDocuments] = useState<DocumentUpload[]>([
    { type: "BUSINESS_LICENSE", fileList: [] },
  ]);

  const addDocumentSlot = () => {
    setDocuments((prev) => [...prev, { type: "OTHER", fileList: [] }]);
  };

  const removeDocumentSlot = (index: number) => {
    setDocuments((prev) => prev.filter((_, i) => i !== index));
  };

  const updateDocumentType = (index: number, type: string) => {
    setDocuments((prev) =>
      prev.map((d, i) => (i === index ? { ...d, type } : d))
    );
  };

  const updateDocumentFiles = (index: number, fileList: UploadFile[]) => {
    setDocuments((prev) =>
      prev.map((d, i) => (i === index ? { ...d, fileList } : d))
    );
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      const role = localStorage.getItem("cds-role") || "provider";

      // 1. Create provider company
      const payload = {
        name: values.name,
        email: values.email,
        phoneNumber: values.phoneNumber,
        taxNumber: values.taxNumber,
        supportedPostCodePrefixes: values.supportedPostCodePrefixes ?? [],
        address: values.address,
      };

      const { data: providerRes } = await axios.post("/api/v1/providers", payload, {
        headers: { "X-User-Role": role },
      });

      const providerId = providerRes.data?.id ?? providerRes.id;

      // 2. Upload documents (if any)
      const docsToUpload = documents.filter((d) => d.fileList.length > 0);

      for (const doc of docsToUpload) {
        for (const file of doc.fileList) {
          if (!file.originFileObj) continue;
          const formData = new FormData();
          formData.append("file", file.originFileObj);
          formData.append("type", doc.type);

          await axios.post(
            `/api/v1/providers/${providerId}/documents`,
            formData,
            {
              headers: {
                "X-User-Role": role,
                "Content-Type": "multipart/form-data",
              },
            }
          );
        }
      }

      message.success(
        docsToUpload.length > 0
          ? "Firma registriert und Dokumente hochgeladen!"
          : "Firma erfolgreich registriert!"
      );
      navigate("/providers");
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Unbekannter Fehler";
      message.error(`Fehler: ${errorMsg}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Create title="Firma registrieren" footerButtons={() => null}>
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
            <Card title="Firmenadresse" size="small" style={{ marginBottom: 16 }}>
              <AddressForm namePrefix={["address"]} label="Geschäftsadresse" />
            </Card>

            <Card
              title="Dokumente hochladen"
              size="small"
              extra={
                <Button size="small" onClick={addDocumentSlot}>
                  + Dokument
                </Button>
              }
            >
              <Text type="secondary" style={{ display: "block", marginBottom: 12 }}>
                Laden Sie Ihre Gewerbeanmeldung, Versicherungsnachweise und weitere
                offizielle Dokumente hoch. Max. 10 MB pro Datei (PDF, JPG, PNG).
              </Text>

              {documents.map((doc, index) => (
                <Card
                  key={index}
                  size="small"
                  style={{ marginBottom: 8 }}
                  extra={
                    index > 0 ? (
                      <Button
                        type="text"
                        size="small"
                        danger
                        onClick={() => removeDocumentSlot(index)}
                      >
                        Entfernen
                      </Button>
                    ) : null
                  }
                >
                  <Select
                    value={doc.type}
                    onChange={(val) => updateDocumentType(index, val)}
                    style={{ width: "100%", marginBottom: 8 }}
                    options={DOCUMENT_TYPES.map((dt) => ({
                      value: dt.value,
                      label: (
                        <span>
                          {dt.icon} {dt.label}
                        </span>
                      ),
                    }))}
                  />
                  <Upload
                    fileList={doc.fileList}
                    onChange={({ fileList }) => updateDocumentFiles(index, fileList)}
                    beforeUpload={(file) => {
                      if (!ALLOWED_TYPES.includes(file.type)) {
                        message.error("Nur PDF, JPG, PNG oder WebP erlaubt");
                        return Upload.LIST_IGNORE;
                      }
                      if (file.size > MAX_FILE_SIZE) {
                        message.error("Datei zu groß (max. 10 MB)");
                        return Upload.LIST_IGNORE;
                      }
                      return false; // prevent auto upload
                    }}
                    maxCount={1}
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                  >
                    <Button icon={<UploadOutlined />}>Datei auswählen</Button>
                  </Upload>
                </Card>
              ))}
            </Card>
          </Col>
        </Row>

        <div style={{ marginTop: 24, display: "flex", justifyContent: "flex-end" }}>
          <Space>
            <Button onClick={() => navigate("/providers")}>Abbrechen</Button>
            <Button type="primary" loading={submitting} onClick={handleSubmit}>
              Firma registrieren
            </Button>
          </Space>
        </div>
      </Form>
    </Create>
  );
};

export default ProviderCreate;
