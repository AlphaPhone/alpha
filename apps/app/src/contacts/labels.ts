// spec/app/contacts/index.md, "Story: Look at one contact"; spec/app/contacts/index.md, "Story: Add or change a contact"
/** Alpha's word for each Android phone number type. */
const phoneTypes: Readonly<Record<string, string>> = {
  home: "Home", mobile: "Mobile", work: "Work", fax_work: "Work fax", fax_home: "Home fax", pager: "Pager", other: "Other",
  callback: "Callback", car: "Car", company_main: "Company main line", isdn: "ISDN", main: "Main", other_fax: "Other fax",
  radio: "Radio", telex: "Telex", tty_tdd: "TTY/TDD", work_mobile: "Work mobile", work_pager: "Work pager",
  assistant: "Assistant", mms: "MMS",
};

/** Alpha's word for each Android email address type. */
const emailTypes: Readonly<Record<string, string>> = { home: "Home", work: "Work", other: "Other", mobile: "Mobile" };

const custom = "custom:";

function typeLabel(table: Readonly<Record<string, string>>, type: string): string | undefined {
  if (type.startsWith(custom)) return type.slice(custom.length).trim() || undefined;
  return Object.hasOwn(table, type) ? table[type] : undefined;
}

/** A label inside a sentence: an acronym or the owner's own label stays as written. */
const inSentence = (label: string, type: string) =>
  type.startsWith(custom) || /^[A-Z]{2}/.test(label) ? label : label.charAt(0).toLowerCase() + label.slice(1);

/** What a number is on a contact's card, such as "Mobile" or "Work fax". */
export const phoneLabel = (type: string) => typeLabel(phoneTypes, type) ?? "Phone";

/** What an address is on a contact's card, such as "Home" or "Work". */
export const emailLabel = (type: string) => typeLabel(emailTypes, type) ?? "Email";

/** The form's name for a number's field: "Phone" for the first, plain one, and otherwise its type, such as "Work phone". */
export function phoneFieldLabel(type: string, first: boolean): string {
  const label = typeLabel(phoneTypes, type);
  return first && type === "mobile" ? "Phone" : label ? `${label} phone` : "Phone";
}

/** The form's name for an address's field: "Email" for the first, plain one, and otherwise its type, such as "Work email". */
export function emailFieldLabel(type: string, first: boolean): string {
  const label = typeLabel(emailTypes, type);
  return first && type === "home" ? "Email" : label ? `${label} email` : "Email";
}

/** The name of the control that removes a number, such as "Remove work fax number". */
export function phoneRemoveLabel(type: string): string {
  const label = typeLabel(phoneTypes, type);
  return label ? `Remove ${inSentence(label, type)} number` : "Remove phone number";
}

/** The name of the control that removes an address, such as "Remove work email". */
export function emailRemoveLabel(type: string): string {
  const label = typeLabel(emailTypes, type);
  return label ? `Remove ${inSentence(label, type)} email` : "Remove email";
}
