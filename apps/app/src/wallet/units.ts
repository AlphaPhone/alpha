// spec/app/wallet/transfer.md, "The owner asks for a transfer of an amount written exactly in the asset's own units, to a recipient, once"
/** `atomicUnits`, an amount in an asset's smallest units written as digits, in the asset's own units: exact at every digit, never a floating number. */
export function shownUnits(atomicUnits: string, decimals: number): string {
  const digits = atomicUnits.padStart(decimals + 1, "0");
  const whole = digits.slice(0, digits.length - decimals);
  const fraction = digits.slice(digits.length - decimals).replace(/0+$/, "");
  return fraction === "" ? whole : `${whole}.${fraction}`;
}

/** `amount`, written in an asset's own units, in its smallest units; nothing where it is no plain decimal number or is finer than the asset. */
export function atomicOf(amount: string, decimals: number): string | undefined {
  const written = /^([0-9]+)(?:\.([0-9]+))?$/.exec(amount);
  const fraction = written?.[2] ?? "";
  if (written === null || fraction.length > decimals) return undefined;
  return `${written[1] ?? ""}${fraction.padEnd(decimals, "0")}`.replace(/^0+(?=[0-9])/, "");
}
