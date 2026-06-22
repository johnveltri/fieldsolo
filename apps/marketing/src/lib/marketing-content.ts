export type SelectOption = { value: string; label: string };

export const tradeOptions: SelectOption[] = [
  { value: "plumbing", label: "Plumbing" }, { value: "electrical", label: "Electrical" },
  { value: "hvac", label: "HVAC" }, { value: "handyman", label: "Handyman" },
  { value: "carpentry", label: "Carpentry" }, { value: "contractor", label: "Contractor" },
  { value: "painting", label: "Painting" }, { value: "roofing", label: "Roofing" },
  { value: "flooring", label: "Flooring" }, { value: "drywall", label: "Drywall" },
  { value: "landscaping", label: "Landscaping" }, { value: "appliances", label: "Appliances" },
  { value: "auto_repair", label: "Auto repair" },
];

export const trackingToolOptions: SelectOption[] = [
  { value: "notes_paper_memory", label: "Notes, paper, or memory" },
  { value: "spreadsheet_calendar", label: "Spreadsheet or calendar" },
  { value: "invoicing_payment", label: "Invoicing or payment app" },
  { value: "field_service_app", label: "Field service app" },
  { value: "none", label: "I don’t really track jobs yet" },
  { value: "other", label: "Something else" },
];

export const jobSourceOptions: SelectOption[] = [
  { value: "referrals", label: "Referrals" }, { value: "repeat", label: "Repeat customers" },
  { value: "angi", label: "Angi" }, { value: "thumbtack", label: "Thumbtack" },
  { value: "facebook", label: "Facebook" }, { value: "contractors", label: "Contractors" },
  { value: "property_managers", label: "Property managers" }, { value: "other", label: "Other" },
];

export const faqs = [
  ["Is FieldSolo free?", "Yes. FieldSolo is a free job and profit tracker for independent tradespeople."],
  ["Who is FieldSolo for?", "FieldSolo is built for solo and independent tradespeople, including plumbers, handymen, HVAC techs, electricians, appliance repair techs, remodelers, landscapers, painters, mobile mechanics, and other field service pros. Optional features may also support larger teams in the future."],
  ["Is FieldSolo field service management software?", "No. FieldSolo does not manage dispatch, crew scheduling, CRM pipelines, routing, or office operations. It is focused on job tracking, time, materials, payments, notes, and profit visibility."],
  ["What if I already use Jobber, Housecall Pro, or another field service tool?", "You can still use FieldSolo to understand job-level profitability. Your current system may help you manage operations. FieldSolo helps you see which jobs, customers, services, and lead sources are actually profitable."],
  ["Is FieldSolo an invoicing app?", "No. Keep the invoicing process you know and love while tracking the economics behind the job with FieldSolo."],
  ["Does FieldSolo replace QuickBooks?", "No. FieldSolo is not accounting software. Options to export data and integrations with accounting software are planned for the future."],
  ["Do I need to enter every detail right away?", "No. Start with the basics and add details later."],
  ["Can I track jobs from Angi, Thumbtack, referrals, and repeat customers?", "Yes. FieldSolo is designed to track work no matter where the job came from."],
  ["Will FieldSolo help me price better?", "Yes. FieldSolo helps you understand which jobs are profitable and which work may need better pricing next time."],
  ["Will FieldSolo support larger teams?", "FieldSolo is currently focused on independent tradespeople, but optional features for larger teams and growing businesses are planned as the product evolves."],
] as const;
