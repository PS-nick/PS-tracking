# Overhaul Portal Security, Classification & Cleanliness Refinements

Implementation plan for refining authentication security (email-only technician login, corporate passcode protection for customer portal), precision component classification (heat exchanger medium types: water-to-oil, oil-to-oil, water-to-air), watermark viewport containment, manual fin straightening spec streamlining, guest customer portal isolation, and removing FIA homologation branding.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following architectural decisions were confirmed via interactive user clarification:
> - **Customer Portal Passcode**: Customers authenticate using their corporate email paired with a corporate access passcode (pre-configured per organization with a standard default passcode `PROTRACE2026!` and support for custom credentials).
> - **Heat Exchanger Medium Type**: When "Heat Exchanger" is selected in Stage 01 Intake or Unit Settings, a dedicated selector prompts the operator to choose between **Water to Oil**, **Oil to Oil**, or **Water to Air**.
> - **Guest Mode Experience**: Clicking "Guest Demo Bypass" transitions users directly into the **Customer Portal view**, displaying strictly an isolated sample demonstration unit (`PSTS-DEMO-SAMPLE`) using the clean customer portal layout (Process Map & Certificate only, without workshop internal tooling).
> - **FIA Homologation Removal**: All references to FIA Homologation across placards, certificates, and headers will be replaced with standard aerospace/quality QMS accreditations ("AS9100D & ISO 9001 Registered Facility").

---

## 1. Overview & Core Concept

This milestone addresses 7 specific operational requirements across authentication, security, workflow classification, and document styling:
1. **Email-Only Technician Authentication**: Streamline workshop login to eliminate preset radio buttons; technicians log in directly using their corporate email.
2. **Customer Portal Password Protection**: Secure customer fleet data by requiring both corporate email and corporate access passcode.
3. **Heat Exchanger Medium Selection**: Add an exchange medium classifier (**Water to Oil**, **Oil to Oil**, **Water to Air**) to Stage 01 Intake, unit records, and certificates.
4. **Watermark Boundary Fitting**: Refine the "CONFIDENTIAL - PROTRACE SOP" watermark size, rotation angle, and margins so it fits inside printable A4 page dimensions without clipping.
5. **Fin Straightening Spec Pruning**: Remove core matrix dimension and tube specs from Stage 08 Manual Fin Straightening, focusing strictly on craftsmanship alignment time, tool clearance, and visual dressing.
6. **Isolated Guest Customer View**: Limit guest access to the Customer Portal layout showing only a dedicated sample unit.
7. **Homologation Decoupling**: Strip FIA Homologation wording across the depot, aligning branding to standard AS9100D/ISO 9001 QMS terminology.

---

## 2. User Experience & Visual Design

### A. Authentication Flows
```
┌────────────────────────────────────────────────────────────────────────┐
│                        AUTHENTICATION GATEWAY                          │
├───────────────────────────────────┬────────────────────────────────────┤
│ Customer Portal Login             │ Workshop Technician Login          │
├───────────────────────────────────┼────────────────────────────────────┤
│ • Corporate Email Input           │ • Technician Corporate Email       │
│ • Secure Passcode / Password      │ • Single-click verify & enter      │
│ • Strict isolated team fleet      │ • Full workshop management access  │
├───────────────────────────────────┴────────────────────────────────────┤
│ Guest Mode Bypass: Loads Customer Portal showing Sample Demo Unit only │
└────────────────────────────────────────────────────────────────────────┘
```

- **Workshop Technician Tab**: Clean, focused email form: `Enter technician email (e.g. nicola.malgarotti@particlescience.com)`. Auto-resolves technician name/role or registers new staff seamlessly.
- **Customer Portal Tab**: Two-field credentials form (Corporate Email + Access Passcode) with reveal toggle and security badge.
- **Guest Demo Bypass**: One-click action sets user as Guest Customer and routes directly to the Customer Portal with a pre-populated sample heat exchanger.

### B. Stage 01 Intake: Heat Exchanger Medium Prompt
- When `Heat Exchanger` (`heat_exchanger`) is selected as the component type:
  - An inline sub-selector immediately renders with three segmented choices:
    - **Water to Oil** (`water_to_oil`)
    - **Oil to Oil** (`oil_to_oil`)
    - **Water to Air** (`water_to_air`)
  - The chosen medium persists to unit state, displays on the unit details badge, and carries through to the Master Technical Report traveler.

### C. Stage 08 Fin Straightening: Streamlined Craftsman Interface
- Remove matrix core dimensions, tube count, and internal blueprint specs from Stage 08.
- Present clean, human-centered craftsmanship controls:
  - Manual dressing bench assignment
  - Precision fin alignment time tracker
  - Photo inspection evidence attachment
  - Technician completion sign-off

### D. Bounded Watermark Geometry
- Calibrate diagonal watermark geometry across Page 1, Page 2, and Page 3 in `CertificateModal`:
  - Constrain text to `max-w-[70%]` of the sheet width
  - Angle set to `-35deg` with balanced padding (`py-1.5 px-4`) and responsive font scale (`text-2xl sm:text-3xl`)
  - Ensure zero horizontal or vertical clipping in both screen preview and print iframe

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Passcode Verification Architecture**
  - *Chosen Approach*: Associate a default corporate passcode (`PROTRACE2026!`) with constructor accounts in `customerAllocation.ts`, with client-side verification and fallback for authorized email domains.
  - *Why*: Provides immediate security preventing accidental open access while allowing custom passcode configuration without requiring full backend credential infrastructure.

- **Decision 2: Heat Exchanger Medium Data Model**
  - *Chosen Approach*: Add `heatExchangerMedium?: 'water_to_oil' | 'oil_to_oil' | 'water_to_air'` to `ServiceUnit` and `IntakeData`.
  - *Why*: Cleanly distinguishes thermal exchange mechanisms without altering existing component type enums.

- **Decision 3: Guest Mode Routing**
  - *Chosen Approach*: Configure "Guest Demo Bypass" to authenticate as a guest customer allocated to a dedicated sample unit `PSTS-DEMO-SAMPLE-01`.
  - *Why*: Ensures guest evaluators experience the exact customer-facing process map and certificate without exposing workshop technician tools or client fleet data.

---

## 4. Technical Architecture & Implementation Steps

```
┌──────────────────────┐      ┌────────────────────────┐      ┌──────────────────────┐
│  WelcomeScreen.tsx   │ ───► │      AuthContext       │ ───► │  CustomerPortalView  │
│  (Email Tech Login,  │      │ (Passcode validation,  │      │  (Sample unit only   │
│   Passcode Customer) │      │  Guest demo customer)  │      │   for guest users)   │
└──────────────────────┘      └────────────────────────┘      └──────────────────────┘
           │                                                              ▲
           ▼                                                              │
┌──────────────────────┐      ┌────────────────────────┐                  │
│ IntakeReceptionStep  │ ───► │  FinStraighteningStep  │                  │
│ (Medium Prompt:      │      │ (Matrix specs removed, │                  │
│  Water/Oil/Air)      │      │  craftsman log only)   │                  │
└──────────────────────┘      └────────────────────────┘                  │
           │                                                              │
           ▼                                                              │
┌──────────────────────────────────────────────────────┐                  │
│ CertificateModal.tsx & pdfGenerator.ts               │ ─────────────────┘
│ (Bounded Watermark, No FIA labels, Dark Mode Preview)│
└──────────────────────────────────────────────────────┘
```

### Planned Code Changes:
1. **`src/types/process.ts` & `src/utils/customerAllocation.ts`**:
   - Add `heatExchangerMedium?: 'water_to_oil' | 'oil_to_oil' | 'water_to_air'` to `ServiceUnit` and `IntakeData`.
   - Add `passcode?: string` to `CustomerDirectoryEntry` and update `DEFAULT_CUSTOMER_ACCOUNTS` with standard corporate access codes.
2. **`src/context/AuthContext.tsx`**:
   - Update `signInAsCustomer` to validate email and passcode.
   - Update `signInAsTechnician` to accept an email string and resolve or generate the technician profile.
   - Add guest customer sign-in handler that binds to the sample demo unit.
3. **`src/components/WelcomeScreen.tsx`**:
   - Convert Workshop Technician tab to email-only input.
   - Add password input field to Customer Portal tab.
   - Update "Guest Demo Bypass" to open the Customer Portal with the dedicated sample unit.
   - Remove "FIA Homologated" badges and copy.
4. **`src/components/CustomerPortalView.tsx`**:
   - Add password input to the in-portal customer login screen.
   - In guest mode, display the dedicated sample unit with complete process map and certificate preview.
5. **`src/components/steps/IntakeReceptionStep.tsx`**:
   - When component type is `heat_exchanger`, render the exchange medium prompt (Water to Oil, Oil to Oil, Water to Air).
6. **`src/components/steps/FinStraighteningStep.tsx`**:
   - Remove matrix dimensions, tube counts, and blueprint spec blocks. Keep hand dressing timer, bench assignment, and visual photos.
7. **`src/components/CertificateModal.tsx` & `src/utils/pdfGenerator.ts`**:
   - Adjust watermark CSS scale, rotation, and padding to fit neatly inside page boundaries.
   - Display Heat Exchanger medium type on traveler and certificate when present.
   - Remove all occurrences of "FIA Homologation" / "FIA Homologated" across certificates and headers.
