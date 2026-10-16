# UTC Travel CRM - System Documentation

## 1. Business Workflow

The system is built on a seamless, real-time integrated workflow spanning multiple modules:

1. **Website Visitor** → Initiates interaction via the public-facing UI.
2. **Website Enquiry** → General, Package-specific, Destination, or customized forms are submitted.
3. **CRM Enquiry** → Uniquely stored with tracking metadata (`source`, `destination`, etc.).
4. **Lead Generation** → Automated linked Lead creation bridging marketing into sales.
5. **Lead Assignment & Follow-up** → Employees are assigned leads; tasks and requirement tracking initiate.
6. **Customer Record** → Dedicated profiles created automatically from serious enquiries/leads.
7. **Quotation Management** → Custom pricing generated based on packages/bespoke requirements.
8. **Quotation Accepted** → Secured transition point; unlocks booking features.
9. **Booking & Advance Payment** → Commercial lock-in linked strictly to one primary customer and package.
10. **Operations & Tour Assignment** → Logistics mapping (Tour details, coordinators).
11. **Ticketing & Reservations** → Sub-records created (Flight, Train, Bus, Hotel) tied directly to Operations.
12. **Document Management** → Secure file uploads against the customer/booking boundary.
13. **Tour Ongoing & Completion** → Chronological tracking triggering accounting closures.
14. **Accounting & Reporting** → Live CEO/Sales/Operations Dashboards populated with real PostgreSQL counts and totals.

## 2. Module Relationships

The database architecture securely links primary entities across the following paths:

- **Customer ↔ Enquiry ↔ Lead**: 1:N relations bridging initial contact through qualification.
- **Lead ↔ Quotation**: 1:N relations allowing iterative pricing variations until an `ACCEPTED` state is reached.
- **Quotation ↔ Booking**: 1:1 relation mapping financial agreements into execution pipelines.
- **Booking ↔ Payment ↔ Accounting**: The `Booking` anchors multiple `CustomerPayment` records, mirroring 1:1 against `FinancialTransaction` entries.
- **Booking ↔ Operations**: 1:1 mapping generating a `Tour` entity when bookings are converted.
- **Employee ↔ Operations / FollowUps**: Sales (`Lead` assignments, `FollowUp` logs) distinct from operational execution (`coordinatorId` mapping).
- **Audit Logs**: Ubiquitous `1:N` polymorphic references tracking mutations on virtually any active model.

## 3. Status Rules & Transitions

The backend expressly safeguards status workflows:

- **Enquiry**: `NEW` → `CONTACTED` → `REQUIREMENT_COLLECTION` → `QUOTATION_PREPARATION` → `CONVERTED`
- **Lead**: Matches sales pipeline states (e.g., `NEW`, `ENGAGED`, `WON`, `LOST`).
- **Quotation**: 
  - Valid transitions: `DRAFT` → `SENT` → `APPROVED` / `REJECTED`
  - *Hard Rule*: Only `APPROVED` quotations can be converted into Bookings.
- **Payment**: Calculated cumulatively against `Quotation.finalAmount` mapping sequentially through `ADVANCE`, `PARTIAL`, `FULL`.
- **Operations (Tour)**: 
  - Statuses: `Upcoming` / `Preparation` → `Ongoing` → `Completed`.
  - *Hard Rule*: `Cancelled` tours preserve financial history and trigger refund protocols.

## 4. Security & RBAC

UTC CRM operates on a strict zero-trust API architecture:

- **Authentication**: JWT-based stateless transmission required for all `/api/admin` routes.
- **RBAC Matrix**: 
  - Roles (CEO, Admin, Sales, HR, Accounting) map to hierarchical module permissions dynamically loaded in the AuthContext.
- **Permission Checks**: Backend middleware strictly intercepts requests. For instance, `hasModuleAccess('Accounting')` is verified structurally before hitting accounting controllers.
- **Record-Level Access**: Sales Agents are limited by `employeeId` scope for Follow-ups/Leads natively through query construction unless elevated to Manager/Admin.
- **Document Security**: Uploads map against UUID parameters checking contextual authorization boundaries; no files are indiscriminately public.

## 5. Error Handling

- **Validation Errors**: Zod schemas enforce type compliance, rejecting malformed API payloads cleanly (HTTP 400).
- **Duplicate Prevention**: Database unique constraints (e.g., `booking.quotationId`) mixed with pre-flight Prisma searches intercept multiple clicks or rogue concurrent conversions.
- **Transaction Rollback**: Critical financial/operational conversions (e.g., `Quotation` -> `Booking`) utilize multi-step verification. If a child record fails to generate, standard Prisma behaviour prevents partial states.
- **Unauthorized Access**: Intercepted securely, yielding consistent `403 Access Denied` payloads avoiding information leakage.

## 6. End-to-End Testing Procedure

The final hardening verified the system through the following manual/automated checks:

1. Executed a clean CRM cycle from public `/contact` form → Enquiries view.
2. Verified Employee Analytics correctly aggregated exact `FollowUp` counts (no deduplication bugs).
3. Attempted multiple invalid conversions (e.g., Booking a `REJECTED` quote); successfully halted by the backend API.
4. Processed sequential payments (Advance → Full), verifying the CEO Dashboard revenue scaled identically to the Accounting Ledgers.
5. Uploaded protected files to the Operations tab, ensuring file metadata accurately referenced the generated `Booking`.
6. Verified frontend and backend TypeScript builds (`tsc --noEmit`) compiled securely with zero strict violations.
7. Simulated role-spoofing across dashboards, confirming robust HTTP 403 blocks directly from the API service layer.
