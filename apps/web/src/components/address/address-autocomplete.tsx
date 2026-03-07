import { useState, useCallback, useRef, useEffect } from "react";
import { Input, Button, Modal, Typography, Space, List } from "antd";
import { EnvironmentOutlined, AimOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix Leaflet default marker icon
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const { Text } = Typography;

const NOMINATIM_URL = "https://nominatim.openstreetmap.org";
const DEFAULT_CENTER: [number, number] = [51.1657, 10.4515]; // Germany
const DEBOUNCE_MS = 300;

export interface AddressResult {
  formatted: string;
  lat: number;
  lng: number;
  placeId?: string;
  city?: string;
  postalCode?: string;
}

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    postcode?: string;
  };
}

interface AddressAutocompleteProps {
  placeholder?: string;
  onSelect: (address: AddressResult) => void;
  showMapButton?: boolean;
}

function MapClickHandler({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export function AddressAutocomplete({
  placeholder,
  onSelect,
  showMapButton = true,
}: AddressAutocompleteProps) {
  const { t } = useTranslation();
  const [inputValue, setInputValue] = useState("");
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [markerPos, setMarkerPos] = useState<[number, number]>(DEFAULT_CENTER);
  const [mapAddress, setMapAddress] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Nominatim autocomplete with debounce
  const searchAddress = useCallback((query: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `${NOMINATIM_URL}/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&countrycodes=de&limit=5`,
          { headers: { "Accept-Language": "de" } },
        );
        const data: NominatimResult[] = await res.json();
        setSuggestions(data);
        setShowSuggestions(data.length > 0);
      } catch {
        setSuggestions([]);
      }
    }, DEBOUNCE_MS);
  }, []);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleInputChange = (value: string) => {
    setInputValue(value);
    searchAddress(value);
  };

  const handleSelectSuggestion = (item: NominatimResult) => {
    const city = item.address?.city || item.address?.town || item.address?.village || "";
    const result: AddressResult = {
      formatted: item.display_name,
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
      placeId: String(item.place_id),
      city,
      postalCode: item.address?.postcode || "",
    };
    setInputValue(item.display_name);
    setShowSuggestions(false);
    onSelect(result);
  };

  // Reverse geocode on map click
  const handleMapClick = useCallback(async (lat: number, lng: number) => {
    setMarkerPos([lat, lng]);
    try {
      const res = await fetch(
        `${NOMINATIM_URL}/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`,
        { headers: { "Accept-Language": "de" } },
      );
      const data = await res.json();
      setMapAddress(data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    } catch {
      setMapAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    }
  }, []);

  const handleMapConfirm = () => {
    if (!mapAddress) return;
    setInputValue(mapAddress);
    onSelect({
      formatted: mapAddress,
      lat: markerPos[0],
      lng: markerPos[1],
    });
    setMapOpen(false);
  };

  return (
    <>
      <Space.Compact style={{ width: "100%" }}>
        <div style={{ flex: 1, position: "relative" }}>
          <Input
            placeholder={placeholder || t("address.searchPlaceholder", "Enter address...")}
            prefix={<EnvironmentOutlined />}
            value={inputValue}
            onChange={(e) => handleInputChange(e.target.value)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
          />
          {showSuggestions && (
            <div
              style={{
                position: "absolute",
                top: "100%",
                left: 0,
                right: 0,
                zIndex: 1000,
                background: "#fff",
                border: "1px solid #d9d9d9",
                borderTop: "none",
                borderRadius: "0 0 8px 8px",
                maxHeight: 200,
                overflow: "auto",
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              }}
            >
              <List
                size="small"
                dataSource={suggestions}
                renderItem={(item) => (
                  <List.Item
                    onClick={() => handleSelectSuggestion(item)}
                    style={{ cursor: "pointer", padding: "6px 12px", fontSize: 13 }}
                  >
                    <EnvironmentOutlined style={{ marginRight: 8, color: "#999" }} />
                    {item.display_name}
                  </List.Item>
                )}
              />
            </div>
          )}
        </div>
        {showMapButton && (
          <Button
            icon={<AimOutlined />}
            onClick={() => setMapOpen(true)}
            title={t("address.pickOnMap", "Pick on map")}
          />
        )}
      </Space.Compact>

      <Modal
        title={t("address.pickOnMap", "Pick on map")}
        open={mapOpen}
        onCancel={() => setMapOpen(false)}
        onOk={handleMapConfirm}
        okButtonProps={{ disabled: !mapAddress }}
        okText={t("address.confirmLocation", "Confirm location")}
        width={640}
        destroyOnClose
      >
        <div style={{ height: 400 }}>
          <MapContainer
            center={markerPos}
            zoom={6}
            style={{ height: "100%", width: "100%", borderRadius: 8 }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Marker position={markerPos} />
            <MapClickHandler onClick={handleMapClick} />
          </MapContainer>
        </div>
        {mapAddress && (
          <div style={{ marginTop: 12 }}>
            <Text strong>{t("address.selected", "Selected")}:</Text>{" "}
            <Text>{mapAddress}</Text>
          </div>
        )}
      </Modal>
    </>
  );
}
