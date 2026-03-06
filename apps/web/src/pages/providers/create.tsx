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
import { useTranslation } from "react-i18next";
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

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];

interface DocumentUpload {
  type: string;
  fileList: UploadFile[];
}

const getDocumentTypes = (t: (key: string) => string) => [
  { value: "BUSINESS_LICENSE", label: t("provider.documents.types.BUSINESS_LICENSE"), icon: <FileProtectOutlined /> },
  { value: "INSURANCE", label: t("provider.documents.types.INSURANCE"), icon: <SafetyCertificateOutlined /> },
  { value: "COMMERCIAL_REGISTER", label: t("provider.documents.types.COMMERCIAL_REGISTER"), icon: <BankOutlined /> },
  { value: "OTHER", label: t("provider.documents.types.OTHER"), icon: <FileOutlined /> },
];

export const ProviderCreate = () => {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [documents, setDocuments] = useState<DocumentUpload[]>([
    { type: "BUSINESS_LICENSE", fileList: [] },
  ]);

  const DOCUMENT_TYPES = getDocumentTypes(t);

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
          ? t("provider.registeredWithDocs")
          : t("provider.registered")
      );
      navigate("/providers");
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : t("common.unknownError");
      message.error(`Fehler: ${errorMsg}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Create title={t("provider.register")} footerButtons={() => null}>
      <Form form={form} layout="vertical">
        <Row gutter={24}>
          <Col span={12}>
            <Card title={t("provider.companyData")} size="small" style={{ marginBottom: 16 }}>
              <Form.Item
                name="name"
                label={t("provider.name")}
                rules={[{ required: true, message: t("provider.companyNameRequired") }]}
              >
                <Input placeholder="z.B. Müller Umzüge GmbH" />
              </Form.Item>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="email"
                    label={t("provider.email")}
                    rules={[
                      { required: true, message: t("provider.emailRequired") },
                      { type: "email", message: t("validation.emailInvalid") },
                    ]}
                  >
                    <Input placeholder="info@firma.de" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="phoneNumber"
                    label={t("provider.phone")}
                    rules={[{ required: true, message: t("provider.phoneRequired") }]}
                  >
                    <Input placeholder="+49 30 12345678" />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item
                name="taxNumber"
                label={t("provider.taxNumber")}
                rules={[{ required: true, message: t("provider.taxNumberRequired") }]}
              >
                <Input placeholder="z.B. DE123456789" />
              </Form.Item>
            </Card>

            <Card title={t("provider.serviceAreas")} size="small">
              <Text type="secondary" style={{ display: "block", marginBottom: 8 }}>
                {t("provider.serviceAreasHint")}
              </Text>
              <Form.Item
                name="supportedPostCodePrefixes"
                rules={[{ required: true, message: t("provider.minOneArea") }]}
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
            <Card title={t("provider.address")} size="small" style={{ marginBottom: 16 }}>
              <AddressForm namePrefix={["address"]} label={t("provider.businessAddress")} />
            </Card>

            <Card
              title={t("provider.documents.title")}
              size="small"
              extra={
                <Button size="small" onClick={addDocumentSlot}>
                  {t("provider.documents.addDocument")}
                </Button>
              }
            >
              <Text type="secondary" style={{ display: "block", marginBottom: 12 }}>
                {t("provider.documents.hint")}
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
                        {t("provider.documents.remove")}
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
                        message.error(t("provider.documents.invalidType"));
                        return Upload.LIST_IGNORE;
                      }
                      if (file.size > MAX_FILE_SIZE) {
                        message.error(t("provider.documents.tooLarge"));
                        return Upload.LIST_IGNORE;
                      }
                      return false; // prevent auto upload
                    }}
                    maxCount={1}
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                  >
                    <Button icon={<UploadOutlined />}>{t("provider.documents.selectFile")}</Button>
                  </Upload>
                </Card>
              ))}
            </Card>
          </Col>
        </Row>

        <div style={{ marginTop: 24, display: "flex", justifyContent: "flex-end" }}>
          <Space>
            <Button onClick={() => navigate("/providers")}>{t("common.cancel")}</Button>
            <Button type="primary" loading={submitting} onClick={handleSubmit}>
              {t("provider.register")}
            </Button>
          </Space>
        </div>
      </Form>
    </Create>
  );
};

export default ProviderCreate;
