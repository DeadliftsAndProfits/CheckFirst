import type { SearchType } from "@/types/core";

export interface FieldDef {
  name: string;
  label: string;
  placeholder?: string;
  type?: "text" | "email" | "tel";
  required?: boolean;
  /** Render at half width on desktop (paired fields). */
  half?: boolean;
  hint?: string;
}

export interface TabDef {
  id: SearchType;
  label: string;
  icon: string;
  /** Always-visible fields. */
  primary: FieldDef[];
  /** Progressive-disclosure fields (Person only, per §7). */
  optional?: FieldDef[];
  optionalLabel?: string;
  optionalHint?: string;
  blurb: string;
}

const AU_STATE = { name: "state", label: "State", placeholder: "QLD", half: true };
const SUBURB = { name: "suburb", label: "Suburb / city", placeholder: "Brisbane", half: true };
const POSTCODE = { name: "postcode", label: "Postcode", placeholder: "4000", half: true };

export const TABS: TabDef[] = [
  {
    id: "person",
    label: "Person",
    icon: "user",
    blurb: "More information helps distinguish between people with similar names.",
    primary: [
      { name: "firstName", label: "First name", placeholder: "John", required: true, half: true },
      { name: "lastName", label: "Last name", placeholder: "Smith", required: true, half: true },
    ],
    optionalLabel: "Add optional matching details",
    optionalHint: "More information can help distinguish between people with similar names.",
    optional: [
      { name: "middleName", label: "Middle name", placeholder: "Michael", half: true },
      { name: "ageRange", label: "Approximate age", placeholder: "30–40", half: true },
      { name: "phone", label: "Phone", placeholder: "0412 345 678", type: "tel", half: true },
      { name: "email", label: "Email", placeholder: "john@example.com", type: "email", half: true },
      SUBURB,
      AU_STATE,
      POSTCODE,
      { name: "address", label: "Street address", placeholder: "12 Example St", half: true },
      { name: "employer", label: "Employer", placeholder: "ABC Plumbing", half: true },
      { name: "occupation", label: "Occupation", placeholder: "Plumber", half: true },
      { name: "businessName", label: "Business name", placeholder: "ABC Plumbing", half: true },
      { name: "abn", label: "ABN", placeholder: "51 824 753 556", half: true },
      { name: "username", label: "Username / handle", placeholder: "@johnsmith", half: true },
    ],
  },
  {
    id: "business",
    label: "Business",
    icon: "briefcase",
    blurb: "Search by any detail you have — a name, ABN, phone, email or website.",
    primary: [
      { name: "businessName", label: "Business / company name", placeholder: "ABC Plumbing Pty Ltd" },
      { name: "abn", label: "ABN", placeholder: "51 824 753 556", half: true },
      { name: "acn", label: "ACN", placeholder: "004 085 616", half: true },
      { name: "website", label: "Website", placeholder: "abcplumbing.com.au", half: true },
      { name: "phone", label: "Phone", placeholder: "07 1234 5678", type: "tel", half: true },
      SUBURB,
      AU_STATE,
    ],
  },
  {
    id: "phone",
    label: "Phone",
    icon: "phone",
    blurb: "Australian and international formats are accepted and normalised.",
    primary: [{ name: "phone", label: "Phone number", placeholder: "0412 345 678 or +61 412 345 678", type: "tel", required: true }],
  },
  {
    id: "email",
    label: "Email",
    icon: "mail",
    blurb: "We check public references and breach status — never passwords or private data.",
    primary: [{ name: "email", label: "Email address", placeholder: "john@example.com", type: "email", required: true }],
  },
  {
    id: "website",
    label: "Website",
    icon: "globe",
    blurb: "Enter a domain or URL. We check DNS, certificates, registration and more.",
    primary: [{ name: "website", label: "Website or domain", placeholder: "abcplumbing.com.au", required: true }],
  },
];

export function tabById(id: SearchType): TabDef {
  return TABS.find((t) => t.id === id)!;
}
