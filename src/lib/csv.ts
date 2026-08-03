import Papa from "papaparse";
import type { BulkRow } from "./admin.functions";

export const CSV_COLUMNS = [
  "Employee ID",
  "First Name",
  "Last Name",
  "Email",
  "Phone",
  "Department",
  "Job Title",
  "Manager",
  "Employment Status",
  "Date Joined",
  "User Role",
] as const;

export type ParsedRow = BulkRow & { _row: number; _errors: string[] };

export function downloadSampleCsv() {
  const sample = [
    CSV_COLUMNS.join(","),
    "EMP-001,Ada,Lovelace,ada@example.com,+2348012345678,Engineering,Software Engineer,manager@example.com,active,2026-01-15,employee",
    "EMP-002,Grace,Hopper,grace@example.com,+2348098765432,Engineering,Engineering Manager,,active,2026-02-01,manager",
  ].join("\n");
  const blob = new Blob([sample], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "peohub-employee-import-template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const STATUSES = ["active", "on_leave", "terminated"];
const ROLES = ["hr_admin", "admin", "manager", "employee"];

export function parseEmployeeCsv(file: File): Promise<ParsedRow[]> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim().toLowerCase(),
      complete: (result) => {
        const seen = new Set<string>();
        const rows = result.data.map((raw, i) => {
          const get = (k: string) => (raw[k] ?? "").toString().trim();
          const email = get("email").toLowerCase();
          const roleRaw = get("user role").toLowerCase().replace(/\s+/g, "_");
          const role = roleRaw === "admin" ? "hr_admin" : roleRaw;
          const status = get("employment status").toLowerCase().replace(/\s+/g, "_");

          const errors: string[] = [];
          if (!get("first name")) errors.push("First name is required");
          if (!get("last name")) errors.push("Last name is required");
          if (!email) errors.push("Email is required");
          else if (!EMAIL_RE.test(email)) errors.push("Invalid email address");
          else if (seen.has(email)) errors.push("Duplicate email in this file");
          if (status && !STATUSES.includes(status)) errors.push("Unknown employment status");
          if (role && !ROLES.includes(role)) errors.push("Unknown user role");
          if (email) seen.add(email);

          return {
            _row: i + 2,
            _errors: errors,
            employee_code: get("employee id") || null,
            first_name: get("first name"),
            last_name: get("last name"),
            email,
            phone: get("phone") || null,
            department: get("department") || null,
            job_title: get("job title") || null,
            manager_email: get("manager") || null,
            employment_status: status || "active",
            date_joined: get("date joined") || null,
            role: role || "employee",
          } satisfies ParsedRow;
        });
        resolve(rows);
      },
      error: (err) => reject(err),
    });
  });
}
