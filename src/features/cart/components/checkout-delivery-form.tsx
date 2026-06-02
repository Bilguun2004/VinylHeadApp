import { ChevronDown } from 'lucide-react-native';
import { useMemo, useState, type ReactNode } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import type { DeliveryFormValues } from '../api/use-create-order-mutation';
import {
  DELIVERY_CITIES,
  districtsForCity,
} from '../lib/mongolia-locations';

type CheckoutDeliveryFormProps = {
  values: DeliveryFormValues;
  onChange: (next: DeliveryFormValues) => void;
  disabled?: boolean;
};

type UnderlineFieldProps = {
  label: string;
  children: ReactNode;
};

function UnderlineField({ label, children }: UnderlineFieldProps) {
  return (
    <View className="mb-5">
      <Text className="mb-2 text-xs text-vinyl-muted">{label}</Text>
      {children}
    </View>
  );
}

type PickerFieldProps = {
  label: string;
  value: string;
  options: readonly string[];
  onSelect: (value: string) => void;
  disabled?: boolean;
};

function LocationPickerField({
  label,
  value,
  options,
  onSelect,
  disabled,
}: PickerFieldProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Text className="mb-2 text-xs text-vinyl-muted">{label}</Text>
      <Pressable
        onPress={() => !disabled && setOpen(true)}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={label}
        className="mb-5 flex-row items-center justify-between border-b border-vinyl-divider pb-3"
      >
        <Text className="flex-1 text-sm text-vinyl-black" numberOfLines={1}>
          {value}
        </Text>
        <ChevronDown size={18} color="#6B6B6B" />
      </Pressable>

      <Modal visible={open} transparent animationType="fade">
        <View className="flex-1 justify-end bg-black/40">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Хаах"
            onPress={() => setOpen(false)}
            className="flex-1"
          />
          <View className="max-h-[50%] rounded-t-2xl bg-white px-4 pb-8 pt-4">
            <Text className="mb-3 text-center text-base font-semibold text-vinyl-black">
              {label}
            </Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {options.map((option) => (
                <Pressable
                  key={option}
                  onPress={() => {
                    onSelect(option);
                    setOpen(false);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={option}
                  className="border-b border-vinyl-divider py-3"
                >
                  <Text
                    className={`text-center text-sm ${
                      option === value
                        ? 'font-semibold text-vinyl-black'
                        : 'text-vinyl-muted'
                    }`}
                  >
                    {option}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const underlineInputClass =
  'border-b border-vinyl-divider pb-3 text-sm text-vinyl-black';

export function CheckoutDeliveryForm({
  values,
  onChange,
  disabled = false,
}: CheckoutDeliveryFormProps) {
  const districts = useMemo(
    () => districtsForCity(values.city),
    [values.city],
  );

  const patch = (partial: Partial<DeliveryFormValues>) => {
    onChange({ ...values, ...partial });
  };

  return (
    <View className="rounded-2xl bg-white px-4 pb-2 pt-4">
      <UnderlineField label="Овог, нэр">
        <TextInput
          value={values.fullName}
          onChangeText={(fullName) => patch({ fullName })}
          placeholder="Таны нэр"
          placeholderTextColor="#A1A1A1"
          editable={!disabled}
          className={underlineInputClass}
          accessibilityLabel="Овог нэр"
        />
      </UnderlineField>

      <UnderlineField label="Утасны дугаар">
        <TextInput
          value={values.phone}
          onChangeText={(phone) => patch({ phone })}
          placeholder="9911-XXXX"
          placeholderTextColor="#A1A1A1"
          keyboardType="phone-pad"
          editable={!disabled}
          className={underlineInputClass}
          accessibilityLabel="Утасны дугаар"
        />
      </UnderlineField>

      <View className="flex-row gap-4">
        <View className="flex-1">
          <LocationPickerField
            label="Хот / Аймаг"
            value={values.city}
            options={DELIVERY_CITIES}
            disabled={disabled}
            onSelect={(city) => {
              const nextDistricts = districtsForCity(city);
              patch({
                city,
                district: nextDistricts[0] ?? values.district,
              });
            }}
          />
        </View>
        <View className="flex-1">
          <LocationPickerField
            label="Дүүрэг / Сум"
            value={values.district}
            options={districts}
            disabled={disabled}
            onSelect={(district) => patch({ district })}
          />
        </View>
      </View>

      <UnderlineField label="Дэлгэрэнгүй хаяг">
        <TextInput
          value={values.address}
          onChangeText={(address) => patch({ address })}
          placeholder="Байр, орц, тоот..."
          placeholderTextColor="#A1A1A1"
          multiline
          editable={!disabled}
          className={`${underlineInputClass} min-h-[72px]`}
          accessibilityLabel="Дэлгэрэнгүй хаяг"
          textAlignVertical="top"
        />
      </UnderlineField>
    </View>
  );
}
