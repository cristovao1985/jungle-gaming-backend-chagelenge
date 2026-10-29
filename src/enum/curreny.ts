export interface CurrencyDefinition {
  code: string;
  name: string;
  symbol: string;
  decimalPlaces: number;
}

export const CURRENCIES: readonly CurrencyDefinition[] = [
  {
    code: "BRL",
    name: "Real brasileiro",
    symbol: "R$",
    decimalPlaces: 2,
  },
];

export type CurrencyCode = (typeof CURRENCIES)[number]["code"];

export function findCurrency(code: string): CurrencyDefinition | undefined {
  return CURRENCIES.find((c) => c.code === code);
}

export function isCurrencyCode(code: string): code is CurrencyCode {
  return findCurrency(code) !== undefined;
}
