import { useState } from "react";
import { useCustom } from "@refinedev/core";
import { AutoComplete, Typography } from "antd";
import { EnvironmentOutlined } from "@ant-design/icons";

const { Text } = Typography;

interface PostCode {
  postCode: string;
  placeName: string;
  adminName1?: string;
  latitude: number;
  longitude: number;
}

interface PlzSearchProps {
  value?: string;
  onChange?: (value: string, place?: PostCode) => void;
  placeholder?: string;
}

export const PlzSearch = ({ value, onChange, placeholder }: PlzSearchProps) => {
  const [search, setSearch] = useState(value || "");

  const { data, isLoading } = useCustom<PostCode[]>({
    url: `/api/v1/post-codes/${search}`,
    method: "get",
    queryOptions: {
      enabled: search.length >= 2 && /^\d{2,5}$/.test(search),
    },
  });

  const options = (data?.data ?? []).map((pc) => ({
    value: pc.postCode,
    label: (
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span>
          <EnvironmentOutlined /> {pc.postCode} {pc.placeName}
        </span>
        <Text type="secondary">{pc.adminName1}</Text>
      </div>
    ),
    pc,
  }));

  return (
    <AutoComplete
      value={value || search}
      options={options}
      onSearch={(val) => {
        setSearch(val);
        onChange?.(val);
      }}
      onSelect={(val, option) => {
        onChange?.(val, (option as { pc: PostCode }).pc);
      }}
      placeholder={placeholder || "PLZ eingeben..."}
      style={{ width: "100%" }}
      status={isLoading ? undefined : undefined}
    />
  );
};
