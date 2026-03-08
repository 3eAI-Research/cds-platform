import { Card, Typography, Divider } from "antd";
import { useTranslation } from "react-i18next";
import { AddressForm } from "../address-form";
import { AddressAutocomplete, type AddressResult } from "../address/address-autocomplete";
import { Form } from "antd";

const { Text } = Typography;

interface AddressStepProps {
  direction: "from" | "to";
}

export const AddressStep = ({ direction }: AddressStepProps) => {
  const { t } = useTranslation();
  const form = Form.useFormInstance();

  const label = direction === "from" ? t("demand.from") : t("demand.to");
  const namePrefix = [direction, "address"];

  const handleAutocompleteSelect = (result: AddressResult) => {
    // Parse the Nominatim result and fill form fields
    const parts = result.formatted.split(",").map((s) => s.trim());
    const streetPart = parts[0] || "";
    const streetMatch = streetPart.match(/^(.+?)\s+(\d+\S*)$/);

    if (streetMatch) {
      form.setFieldValue([...namePrefix, "street"], streetMatch[1]);
      form.setFieldValue([...namePrefix, "houseNumber"], streetMatch[2]);
    } else {
      form.setFieldValue([...namePrefix, "street"], streetPart);
    }

    if (result.postalCode) {
      form.setFieldValue([...namePrefix, "postCode"], result.postalCode);
    }
    if (result.city) {
      form.setFieldValue([...namePrefix, "placeName"], result.city);
    }
  };

  return (
    <Card styles={{ body: { padding: "20px 24px" } }}>
      <Text strong style={{ fontSize: 15, display: "block", marginBottom: 16 }}>
        {label}
      </Text>

      {/* Quick address search with map */}
      <div style={{ marginBottom: 16 }}>
        <Text type="secondary" style={{ display: "block", marginBottom: 8, fontSize: 13 }}>
          {t("address.searchPlaceholder")}
        </Text>
        <AddressAutocomplete
          onSelect={handleAutocompleteSelect}
          placeholder={t("address.searchPlaceholder")}
          showMapButton
        />
      </div>

      <Divider style={{ margin: "16px 0" }}>
        <Text type="secondary" style={{ fontSize: 12 }}>{t("demand.orText", "or")}</Text>
      </Divider>

      {/* Manual address fields */}
      <AddressForm namePrefix={namePrefix} label="" />
    </Card>
  );
};
