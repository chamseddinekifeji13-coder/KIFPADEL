import { type Dictionary } from "@/i18n/get-dictionary";

export function t(
  dictionary: Dictionary,
  namespace: keyof Dictionary,
  key: string,
): string {
  return dictionary[namespace][key] ?? key;
}
