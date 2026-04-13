/**
 * Seed the SAMA database with sample frameworks, controls, and circulars.
 *
 * Usage:
 *   npx tsx scripts/seed-sample.ts
 *   npx tsx scripts/seed-sample.ts --force
 */

import Database from "better-sqlite3";
import { existsSync, mkdirSync, unlinkSync } from "node:fs";
import { dirname } from "node:path";
import { SCHEMA_SQL } from "../src/db.js";

const DB_PATH = process.env["SAMA_DB_PATH"] ?? "data/sama.db";
const force = process.argv.includes("--force");

const dir = dirname(DB_PATH);
if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
if (force && existsSync(DB_PATH)) {
  unlinkSync(DB_PATH);
  console.log(`Deleted ${DB_PATH}`);
}

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");
db.exec(SCHEMA_SQL);
console.log(`Database initialised at ${DB_PATH}`);

// --- Frameworks ---------------------------------------------------------------

interface FrameworkRow {
  id: string;
  name: string;
  version: string;
  domain: string;
  description: string;
  control_count: number;
  effective_date: string;
  pdf_url: string;
}

const frameworks: FrameworkRow[] = [
  {
    id: "sama-csf",
    name: "SAMA Cybersecurity Framework",
    version: "2.0 (2022)",
    domain: "Cybersecurity",
    description:
      "The SAMA Cybersecurity Framework (CSF) establishes a minimum set of cybersecurity controls " +
      "that all financial institutions supervised by SAMA must implement. The framework covers five " +
      "domains: Cyber Security Leadership and Governance, Cyber Security Risk Management and Compliance, " +
      "Cyber Security Operations and Technology, Third-Party Cybersecurity, and Cyber Security Resilience. " +
      "Originally issued in 2017 and revised in 2022 to address emerging threats and align with " +
      "international standards including NIST CSF and ISO 27001.",
    control_count: 105,
    effective_date: "2022-06-01",
    pdf_url:
      "https://www.sama.gov.sa/en-US/RulesInstructions/BankingRules/CybersecurityFramework.pdf",
  },
  {
    id: "sama-bcm",
    name: "SAMA Business Continuity Management Framework",
    version: "1.0 (2020)",
    domain: "Business Continuity",
    description:
      "The SAMA Business Continuity Management (BCM) Framework sets requirements for financial institutions " +
      "to maintain essential operations during and after disruptive events. It aligns with ISO 22301 and " +
      "covers BCM governance, business impact analysis, recovery strategies, crisis management, and " +
      "testing requirements. All SAMA-licensed entities must comply.",
    control_count: 42,
    effective_date: "2020-01-01",
    pdf_url:
      "https://www.sama.gov.sa/en-US/RulesInstructions/BankingRules/BCMFramework.pdf",
  },
  {
    id: "sama-tprm",
    name: "SAMA Third-Party Risk Management Framework",
    version: "1.0 (2023)",
    domain: "Third-Party Risk",
    description:
      "The SAMA Third-Party Risk Management (TPRM) Framework governs how financial institutions must " +
      "manage risks arising from outsourcing and third-party service providers. It covers vendor due " +
      "diligence, contractual requirements, ongoing monitoring, concentration risk, and exit planning. " +
      "Applies to all material outsourcing arrangements including cloud services.",
    control_count: 38,
    effective_date: "2023-03-01",
    pdf_url:
      "https://www.sama.gov.sa/en-US/RulesInstructions/BankingRules/TPRMFramework.pdf",
  },
];

const insertFramework = db.prepare(
  "INSERT OR IGNORE INTO frameworks (id, name, version, domain, description, control_count, effective_date, pdf_url) " +
    "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
);
for (const f of frameworks) {
  insertFramework.run(
    f.id, f.name, f.version, f.domain, f.description, f.control_count, f.effective_date, f.pdf_url,
  );
}
console.log(`Inserted ${frameworks.length} frameworks`);

// --- Controls -----------------------------------------------------------------

interface ControlRow {
  framework_id: string;
  control_ref: string;
  domain: string;
  subdomain: string;
  title: string;
  description: string;
  maturity_level: string;
  priority: string;
}

const controls: ControlRow[] = [
  // Domain 1: Cyber Security Leadership and Governance
  {
    framework_id: "sama-csf",
    control_ref: "SAMA-CSF-1.1.1",
    domain: "Cyber Security Leadership and Governance",
    subdomain: "Cyber Security Strategy",
    title: "Cyber Security Strategy",
    description:
      "The financial institution must develop, approve at board level, and maintain a cyber security strategy " +
      "that is aligned with its business strategy and risk appetite. The strategy must define cyber security " +
      "objectives, priorities, and a roadmap for achieving the target security posture. The strategy must be " +
      "reviewed at least annually and updated to reflect changes in the threat landscape, business environment, " +
      "or regulatory requirements. The board must formally approve the strategy and its updates.",
    maturity_level: "Level 1",
    priority: "High",
  },
  {
    framework_id: "sama-csf",
    control_ref: "SAMA-CSF-1.1.2",
    domain: "Cyber Security Leadership and Governance",
    subdomain: "Cyber Security Strategy",
    title: "Cyber Security Roles and Responsibilities",
    description:
      "The financial institution must define and document cyber security roles and responsibilities for all " +
      "relevant personnel, including board members, senior management, the Chief Information Security Officer " +
      "(CISO), IT staff, and business unit owners. A dedicated CISO role must be established with direct access " +
      "to senior management and the board. Segregation of duties must be enforced between IT operations, " +
      "information security, and internal audit functions.",
    maturity_level: "Level 1",
    priority: "High",
  },
  {
    framework_id: "sama-csf",
    control_ref: "SAMA-CSF-1.2.1",
    domain: "Cyber Security Leadership and Governance",
    subdomain: "Cyber Security Policy",
    title: "Cyber Security Policy Framework",
    description:
      "The financial institution must establish, maintain, and communicate a cyber security policy framework " +
      "approved by senior management or the board. The framework must include policies covering information " +
      "classification, access control, cryptography, network security, incident response, change management, " +
      "and acceptable use. Policies must be reviewed at least annually and communicated to all employees.",
    maturity_level: "Level 1",
    priority: "High",
  },

  // Domain 2: Cyber Security Risk Management and Compliance
  {
    framework_id: "sama-csf",
    control_ref: "SAMA-CSF-2.1.1",
    domain: "Cyber Security Risk Management and Compliance",
    subdomain: "Cyber Security Risk Assessment",
    title: "Cyber Security Risk Assessment",
    description:
      "The financial institution must conduct cyber security risk assessments at least annually and whenever " +
      "significant changes occur to the business environment, technology infrastructure, or threat landscape. " +
      "Risk assessments must identify information assets, assess threats and vulnerabilities, determine " +
      "likelihood and impact, and prioritize remediation actions. Risk assessment results must be reported " +
      "to senior management and the board.",
    maturity_level: "Level 1",
    priority: "High",
  },
  {
    framework_id: "sama-csf",
    control_ref: "SAMA-CSF-2.2.1",
    domain: "Cyber Security Risk Management and Compliance",
    subdomain: "Cyber Security Awareness and Training",
    title: "Cyber Security Awareness Programme",
    description:
      "The financial institution must implement a formal cyber security awareness programme covering all employees, " +
      "contractors, and third parties with access to information systems. The programme must include annual " +
      "training on phishing, social engineering, password security, and acceptable use policies. Targeted training " +
      "must be provided for privileged users and developers. Training completion must be tracked and compliance " +
      "reported to management.",
    maturity_level: "Level 1",
    priority: "Medium",
  },

  // Domain 3: Cyber Security Operations and Technology
  {
    framework_id: "sama-csf",
    control_ref: "SAMA-CSF-3.1.1",
    domain: "Cyber Security Operations and Technology",
    subdomain: "Identity and Access Management",
    title: "Identity and Access Management",
    description:
      "The financial institution must implement identity and access management controls based on the principle " +
      "of least privilege. All user accounts must be uniquely identified. Privileged access must require " +
      "multi-factor authentication (MFA). Access rights must be reviewed at least quarterly for privileged " +
      "accounts and annually for standard accounts. Dormant accounts must be disabled after 30 days of " +
      "inactivity. Service accounts must be inventoried and their usage reviewed.",
    maturity_level: "Level 1",
    priority: "High",
  },
  {
    framework_id: "sama-csf",
    control_ref: "SAMA-CSF-3.1.2",
    domain: "Cyber Security Operations and Technology",
    subdomain: "Identity and Access Management",
    title: "Privileged Access Management",
    description:
      "Privileged accounts, including system administrators, database administrators, and network engineers, " +
      "must be controlled through a Privileged Access Management (PAM) solution. Privileged sessions must be " +
      "recorded and logs retained for at least one year. Just-in-time access provisioning must be implemented " +
      "where technically feasible. Shared privileged accounts are prohibited. Emergency access procedures " +
      "must be documented and require post-use review.",
    maturity_level: "Level 2",
    priority: "High",
  },
  {
    framework_id: "sama-csf",
    control_ref: "SAMA-CSF-3.2.1",
    domain: "Cyber Security Operations and Technology",
    subdomain: "Endpoint Security",
    title: "Endpoint Protection",
    description:
      "All endpoints, including workstations, servers, and mobile devices, must be protected with up-to-date " +
      "anti-malware software with real-time protection enabled. Endpoint detection and response (EDR) solutions " +
      "must be deployed on critical systems. Device encryption must be enforced on all portable devices handling " +
      "sensitive data. USB storage device usage must be restricted or prohibited on sensitive systems. " +
      "Regular vulnerability scans must be conducted and critical patches applied within 30 days.",
    maturity_level: "Level 1",
    priority: "High",
  },
  {
    framework_id: "sama-csf",
    control_ref: "SAMA-CSF-3.3.1",
    domain: "Cyber Security Operations and Technology",
    subdomain: "Network Security",
    title: "Network Security Architecture",
    description:
      "The financial institution must implement a layered network security architecture with defined security " +
      "zones. The internet-facing DMZ, internal network, and core banking systems must be segregated using " +
      "firewalls with documented rule sets reviewed at least annually. All external connections must traverse " +
      "managed security controls. Wireless networks must be segregated from the corporate network. Network " +
      "traffic must be monitored for anomalies and security events.",
    maturity_level: "Level 1",
    priority: "High",
  },
  {
    framework_id: "sama-csf",
    control_ref: "SAMA-CSF-3.4.1",
    domain: "Cyber Security Operations and Technology",
    subdomain: "Data Protection",
    title: "Data Classification and Protection",
    description:
      "The financial institution must classify all data assets according to sensitivity (e.g., Public, Internal, " +
      "Confidential, Restricted). Data handling requirements must be defined for each classification level. " +
      "Customer data, financial data, and authentication credentials must be encrypted in transit (minimum TLS 1.2) " +
      "and at rest using AES-256 or equivalent. Data loss prevention (DLP) controls must be implemented for " +
      "sensitive data egress. Data retention and disposal procedures must be documented and enforced.",
    maturity_level: "Level 1",
    priority: "High",
  },
  {
    framework_id: "sama-csf",
    control_ref: "SAMA-CSF-3.5.1",
    domain: "Cyber Security Operations and Technology",
    subdomain: "Vulnerability Management",
    title: "Vulnerability Assessment and Penetration Testing",
    description:
      "The financial institution must conduct vulnerability assessments of all internet-facing systems at " +
      "least quarterly and internal systems at least annually. Critical and high-severity vulnerabilities must " +
      "be remediated within 30 and 60 days respectively. Penetration testing by qualified independent testers " +
      "must be conducted at least annually for critical systems and after significant changes. Findings must " +
      "be tracked to closure and reported to senior management.",
    maturity_level: "Level 1",
    priority: "High",
  },
  {
    framework_id: "sama-csf",
    control_ref: "SAMA-CSF-3.6.1",
    domain: "Cyber Security Operations and Technology",
    subdomain: "Cyber Security Monitoring",
    title: "Security Information and Event Management",
    description:
      "The financial institution must operate a Security Information and Event Management (SIEM) system or " +
      "equivalent capability that centralises logs from critical systems including servers, network devices, " +
      "security appliances, and applications. Log retention must meet a minimum of 12 months online and " +
      "36 months archived. Security events must be correlated and alerts triaged within defined SLAs. " +
      "24x7 security monitoring capability must be maintained for critical systems.",
    maturity_level: "Level 2",
    priority: "High",
  },
  {
    framework_id: "sama-csf",
    control_ref: "SAMA-CSF-3.7.1",
    domain: "Cyber Security Operations and Technology",
    subdomain: "Incident Management",
    title: "Cyber Security Incident Response",
    description:
      "The financial institution must maintain a documented cyber security incident response plan covering " +
      "identification, containment, eradication, recovery, and post-incident review phases. The plan must " +
      "define escalation paths, communication procedures, and SAMA notification requirements. Incidents must " +
      "be classified by severity and response SLAs defined. Tabletop exercises must be conducted at least " +
      "annually. Significant incidents must be notified to SAMA within 72 hours of detection.",
    maturity_level: "Level 1",
    priority: "High",
  },

  // Domain 4: Third-Party Cybersecurity
  {
    framework_id: "sama-csf",
    control_ref: "SAMA-CSF-4.1.1",
    domain: "Third-Party Cybersecurity",
    subdomain: "Third-Party Risk Management",
    title: "Third-Party Cyber Security Assessment",
    description:
      "The financial institution must conduct cyber security due diligence assessments of all material " +
      "third-party service providers before onboarding and at least annually thereafter. Assessments must " +
      "evaluate the third party's security controls, incident history, and compliance with applicable " +
      "regulations. Contracts must include security requirements, audit rights, incident notification " +
      "obligations, and the right to terminate on security grounds. Offshore data processing requires " +
      "SAMA prior approval.",
    maturity_level: "Level 1",
    priority: "High",
  },
  {
    framework_id: "sama-csf",
    control_ref: "SAMA-CSF-4.2.1",
    domain: "Third-Party Cybersecurity",
    subdomain: "Cloud Security",
    title: "Cloud Security Requirements",
    description:
      "Financial institutions adopting cloud services must ensure the cloud service provider (CSP) meets " +
      "SAMA requirements including data residency in Saudi Arabia for regulated data, right to audit, " +
      "encryption of data in transit and at rest, and incident notification within 24 hours. The institution " +
      "retains full responsibility for data security regardless of the cloud model. Multi-cloud or hybrid " +
      "arrangements must have documented security architecture. SAMA approval is required before migrating " +
      "critical banking systems to the cloud.",
    maturity_level: "Level 2",
    priority: "High",
  },

  // Domain 5: Cyber Security Resilience
  {
    framework_id: "sama-csf",
    control_ref: "SAMA-CSF-5.1.1",
    domain: "Cyber Security Resilience",
    subdomain: "Business Continuity",
    title: "Cyber Resilience and Recovery",
    description:
      "The financial institution must maintain cyber resilience capabilities including offline and immutable " +
      "backup copies of critical data, tested recovery procedures, and defined recovery time objectives (RTO) " +
      "and recovery point objectives (RPO) for critical systems. Backup integrity must be tested at least " +
      "quarterly. Disaster recovery drills must be conducted at least annually. Recovery capabilities must " +
      "be sufficient to restore critical operations within the RTO agreed with SAMA.",
    maturity_level: "Level 1",
    priority: "High",
  },

  // BCM Framework controls
  {
    framework_id: "sama-bcm",
    control_ref: "SAMA-BCM-2.1",
    domain: "Business Continuity Management",
    subdomain: "BCM Governance",
    title: "BCM Governance and Policy",
    description:
      "The financial institution must establish a Business Continuity Management (BCM) governance structure " +
      "with board-level oversight and executive sponsorship. A BCM policy approved by the board must define " +
      "the scope, objectives, and minimum standards for business continuity. A designated BCM owner must " +
      "coordinate BCM activities across the organisation. BCM must be integrated into strategic planning " +
      "and change management processes.",
    maturity_level: "Level 1",
    priority: "High",
  },
  {
    framework_id: "sama-bcm",
    control_ref: "SAMA-BCM-3.1",
    domain: "Business Continuity Management",
    subdomain: "Business Impact Analysis",
    title: "Business Impact Analysis",
    description:
      "The financial institution must conduct a Business Impact Analysis (BIA) covering all critical business " +
      "functions, processes, and supporting resources. The BIA must determine maximum tolerable downtime (MTD), " +
      "recovery time objectives (RTO), and recovery point objectives (RPO) for each critical function. " +
      "The BIA must be reviewed at least annually and updated after significant changes. Results must inform " +
      "recovery strategy selection and resource allocation.",
    maturity_level: "Level 1",
    priority: "High",
  },

  // TPRM Framework controls
  {
    framework_id: "sama-tprm",
    control_ref: "SAMA-TPRM-2.1",
    domain: "Third-Party Risk Management",
    subdomain: "Vendor Risk Assessment",
    title: "Vendor Risk Classification and Due Diligence",
    description:
      "The financial institution must maintain a comprehensive inventory of all third-party service providers " +
      "and classify each by risk tier based on the criticality of the service, data access, and systemic " +
      "importance. Due diligence requirements must be proportionate to risk tier: Tier 1 (critical) requires " +
      "on-site assessment or third-party audit report; Tier 2 requires questionnaire and document review. " +
      "Due diligence must be repeated annually for Tier 1 and every two years for Tier 2 providers.",
    maturity_level: "Level 1",
    priority: "High",
  },
];

const insertControl = db.prepare(
  "INSERT OR IGNORE INTO controls " +
    "(framework_id, control_ref, domain, subdomain, title, description, maturity_level, priority) " +
    "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
);
for (const c of controls) {
  insertControl.run(
    c.framework_id, c.control_ref, c.domain, c.subdomain, c.title,
    c.description, c.maturity_level, c.priority,
  );
}
console.log(`Inserted ${controls.length} controls`);

// --- Circulars ----------------------------------------------------------------

interface CircularRow {
  reference: string;
  title: string;
  date: string;
  category: string;
  summary: string;
  full_text: string;
  pdf_url: string;
  status: string;
}

const circulars: CircularRow[] = [
  {
    reference: "SAMA-CIR-2021-IT-001",
    title: "Circular on Cloud Computing in the Financial Sector",
    date: "2021-07-15",
    category: "IT Governance",
    summary:
      "Establishes requirements for Saudi financial institutions adopting cloud computing services, " +
      "including data residency, risk assessment, prior SAMA notification, and vendor due diligence obligations.",
    full_text:
      "SAMA Circular on Cloud Computing in the Financial Sector (2021). " +
      "Scope: All SAMA-licensed financial institutions including banks, insurance companies, finance companies, " +
      "and payment service providers. " +
      "Key Requirements: " +
      "(1) Data Residency — Regulated data including customer personal data, financial transaction data, and " +
      "account data must be stored and processed within the Kingdom of Saudi Arabia. Cross-border data transfers " +
      "require SAMA prior approval. " +
      "(2) Prior Notification — Financial institutions must notify SAMA at least 90 days before migrating critical " +
      "banking systems to the cloud. SAMA approval is required for core banking system migrations. " +
      "(3) Vendor Due Diligence — Cloud service providers must be assessed against SAMA cybersecurity requirements " +
      "before onboarding. Providers must agree to audit rights and incident notification obligations. " +
      "(4) Contractual Requirements — Cloud service agreements must include: data return and deletion on termination; " +
      "incident notification within 24 hours; sub-processor disclosure; right to audit; SLA commitments aligned " +
      "with SAMA BCM requirements. " +
      "(5) Risk Assessment — A formal risk assessment must be conducted before cloud adoption and reviewed annually. " +
      "Concentration risk arising from multi-cloud dependency must be monitored. " +
      "(6) Exit Strategy — Financial institutions must maintain documented cloud exit strategies tested at least annually.",
    pdf_url:
      "https://www.sama.gov.sa/en-US/RulesInstructions/BankingRules/CloudComputingCircular2021.pdf",
    status: "active",
  },
  {
    reference: "SAMA-CIR-2020-PAY-001",
    title: "Circular on Open Banking Framework",
    date: "2020-11-30",
    category: "Digital Payments",
    summary:
      "Introduces the Open Banking Framework for Saudi Arabia, establishing requirements for banks and " +
      "third-party providers (TPPs) regarding API security, customer consent, and data sharing protocols " +
      "under the Saudi Open Banking Programme.",
    full_text:
      "SAMA Circular on Open Banking Framework (2020). " +
      "Purpose: Establish a secure and standardised framework for open banking in Saudi Arabia, enabling " +
      "licensed third-party providers (TPPs) to access customer financial data with explicit consent. " +
      "Scope: All SAMA-licensed banks operating in Saudi Arabia. " +
      "API Security Requirements: " +
      "(1) All open banking APIs must implement OAuth 2.0 with PKCE for authorisation. " +
      "(2) API communications must use TLS 1.2 minimum; TLS 1.3 strongly recommended. " +
      "(3) API keys and client credentials must be managed through a dedicated secure credential store. " +
      "(4) Rate limiting must be implemented to prevent abuse. " +
      "(5) All API access must be logged with sufficient detail for forensic investigation. " +
      "Customer Consent: Financial institutions must implement robust consent management ensuring customers " +
      "can grant, review, and revoke data access at any time. Consent must be explicit, granular, and " +
      "time-limited. Consent records must be retained for seven years. " +
      "TPP Requirements: Third-party providers must be licensed by SAMA, maintain ISO 27001 certification " +
      "or equivalent, and undergo annual security assessments. " +
      "Incident Reporting: Security incidents affecting open banking APIs must be reported to SAMA within 4 hours.",
    pdf_url:
      "https://www.sama.gov.sa/en-US/RulesInstructions/BankingRules/OpenBankingFramework2020.pdf",
    status: "active",
  },
  {
    reference: "SAMA-CIR-2023-IT-002",
    title: "Circular on IT Governance in the Financial Sector",
    date: "2023-04-01",
    category: "IT Governance",
    summary:
      "Updates IT governance requirements for SAMA-licensed institutions, covering board-level IT oversight, " +
      "CIO/CISO accountability, IT risk management integration, and technology resilience standards.",
    full_text:
      "SAMA Circular on IT Governance in the Financial Sector (2023). " +
      "This circular supersedes and replaces the 2017 IT Governance Circular. " +
      "Board and Senior Management Responsibilities: " +
      "(1) The board must include at least one member with relevant technology or cybersecurity expertise, " +
      "or engage an independent technology advisor. " +
      "(2) The board must approve the IT strategy, IT risk appetite, and significant technology investments. " +
      "(3) A board-level Technology Committee (or equivalent) must meet at least quarterly to review IT risks, " +
      "major projects, and cybersecurity posture. " +
      "CIO/CISO Accountability: " +
      "The Chief Information Officer (CIO) is accountable for IT operations and service delivery. " +
      "The Chief Information Security Officer (CISO) is accountable for cybersecurity and must report " +
      "independently to the board. The CIO and CISO roles must be held by separate individuals. " +
      "IT Risk Management: IT risk must be formally integrated into the enterprise risk management framework. " +
      "IT risk assessments must be conducted at least annually and results reported to the board. " +
      "Technology Resilience: Financial institutions must maintain documented technology recovery capabilities " +
      "tested at least annually against recovery objectives defined in the BCM framework.",
    pdf_url:
      "https://www.sama.gov.sa/en-US/RulesInstructions/BankingRules/ITGovernanceCircular2023.pdf",
    status: "active",
  },
  {
    reference: "SAMA-CIR-2022-OUT-001",
    title: "Circular on Outsourcing Requirements for Financial Institutions",
    date: "2022-09-15",
    category: "Outsourcing",
    summary:
      "Establishes a risk-based framework for outsourcing arrangements at SAMA-licensed institutions, " +
      "including prohibited outsourcing, prior SAMA approval requirements, contractual obligations, " +
      "and ongoing oversight of service providers.",
    full_text:
      "SAMA Circular on Outsourcing Requirements for Financial Institutions (2022). " +
      "Prohibited Outsourcing: Financial institutions may not outsource core management functions, internal audit, " +
      "compliance, or activities that would prevent SAMA from effectively supervising the institution. " +
      "Prior SAMA Approval Required: Material outsourcing arrangements require SAMA prior approval including: " +
      "core banking system operations; data centre operations for regulated data; payment processing; and any " +
      "activity involving access to customer personal data by entities outside Saudi Arabia. " +
      "Risk Assessment: Before entering any outsourcing arrangement, institutions must conduct a risk assessment " +
      "evaluating operational, strategic, reputational, compliance, and concentration risks. " +
      "Contractual Requirements: Outsourcing agreements must include: clear definition of services; performance SLAs; " +
      "data security and confidentiality obligations; audit rights; SAMA access rights; business continuity " +
      "requirements; data return and deletion on termination; sub-contracting restrictions; incident notification " +
      "within 4 hours of significant events. " +
      "Ongoing Oversight: Institutions must maintain a register of all outsourcing arrangements, conduct annual " +
      "performance reviews, and report significant incidents or breaches to SAMA within 24 hours.",
    pdf_url:
      "https://www.sama.gov.sa/en-US/RulesInstructions/BankingRules/OutsourcingCircular2022.pdf",
    status: "active",
  },
  {
    reference: "SAMA-CIR-2023-INS-001",
    title: "Circular on Cyber Insurance Requirements for Financial Institutions",
    date: "2023-10-01",
    category: "Insurance",
    summary:
      "Introduces minimum cyber insurance requirements for SAMA-licensed financial institutions, " +
      "specifying coverage types, minimum indemnity limits, insurer qualification criteria, " +
      "and annual reporting obligations to SAMA.",
    full_text:
      "SAMA Circular on Cyber Insurance Requirements for Financial Institutions (2023). " +
      "Applicability: All SAMA-licensed banks, insurance companies, and finance companies with total assets " +
      "above SAR 1 billion must maintain qualifying cyber insurance coverage. " +
      "Minimum Coverage Requirements: " +
      "(1) First-party coverage: Business interruption losses from cyber incidents; data recovery costs; " +
      "cyber extortion response costs; crisis management and forensics costs. " +
      "(2) Third-party coverage: Customer notification and credit monitoring costs; regulatory defence costs; " +
      "liability arising from data breaches affecting customers. " +
      "Minimum Indemnity Limits: Banks with assets above SAR 50 billion: SAR 100 million minimum. " +
      "Banks with assets SAR 5–50 billion: SAR 50 million minimum. Other institutions: SAR 25 million minimum. " +
      "Insurer Requirements: Cyber insurance must be obtained from an insurer licensed by SAMA with a minimum " +
      "financial strength rating of A- (AM Best) or equivalent. " +
      "Reporting: Institutions must submit annual confirmation of cyber insurance coverage to SAMA by 31 January " +
      "each year. Material changes to coverage must be notified to SAMA within 30 days. " +
      "Claims: All cyber insurance claims must be reported to SAMA concurrent with filing.",
    pdf_url:
      "https://www.sama.gov.sa/en-US/RulesInstructions/InsuranceRules/CyberInsuranceCircular2023.pdf",
    status: "active",
  },
];

const insertCircular = db.prepare(
  "INSERT OR IGNORE INTO circulars (reference, title, date, category, summary, full_text, pdf_url, status) " +
    "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
);
for (const c of circulars) {
  insertCircular.run(
    c.reference, c.title, c.date, c.category, c.summary, c.full_text, c.pdf_url, c.status,
  );
}
console.log(`Inserted ${circulars.length} circulars`);

// --- Summary ------------------------------------------------------------------

const fc = (db.prepare("SELECT COUNT(*) AS n FROM frameworks").get() as { n: number }).n;
const cc = (db.prepare("SELECT COUNT(*) AS n FROM controls").get() as { n: number }).n;
const circ = (db.prepare("SELECT COUNT(*) AS n FROM circulars").get() as { n: number }).n;

console.log(`
Database summary:
  Frameworks : ${fc}
  Controls   : ${cc}
  Circulars  : ${circ}

Seed complete.`);
