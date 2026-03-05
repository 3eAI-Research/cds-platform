# Contract PDF Template — CDS Platform

**Version:** 1.0.0
**Date:** 2026-03-04
**Author:** Mimar (Architect)
**Status:** DRAFT — Pending Muhendis review
**Domain Model:** `docs/domain-model/contract.ts`
**Prisma Schema:** `prisma/contract.prisma` — ContractTemplate model

---

## 1. Overview

When both parties accept a contract, the system generates a timestamped PDF document. This PDF serves as a legally-informative record of the agreement (not a qualified e-signature document in MVP — that's Phase 1.5/eIDAS).

**Generation trigger:** Both `customerAcceptedAt` and `providerAcceptedAt` are set → status = `ACTIVE` → generate PDF → store in MinIO → email to both parties.

**Technology:** Handlebars HTML template → Puppeteer (headless Chrome) → PDF

---

## 2. Template Variables

All placeholders use `{{handlebars}}` syntax. The contract service populates these from the Contract entity + cross-module service calls.

### 2.1 Contract Metadata

| Variable | Source | Example |
|----------|--------|---------|
| `{{contractId}}` | contract.id | `a1b2c3d4-...` |
| `{{contractNumber}}` | Generated: `CDS-2026-00142` | Sequential, human-readable |
| `{{contractDate}}` | contract.createdAt | `04.03.2026` |
| `{{serviceDate}}` | contract.serviceDate | `15.04.2026` |
| `{{contractStatus}}` | contract.status (localized) | `Aktiv` / `Active` |

### 2.2 Customer Party

| Variable | Source | Example |
|----------|--------|---------|
| `{{customerName}}` | shared.user_references.displayName | `Max Mustermann` |
| `{{customerEmail}}` | shared.user_references.email | `max@example.de` |
| `{{customerAcceptedAt}}` | contract.customerAcceptedAt | `04.03.2026, 14:32 Uhr` |

### 2.3 Provider Party

| Variable | Source | Example |
|----------|--------|---------|
| `{{providerCompanyName}}` | provider.provider_companies.name | `Schnell Umzüge GmbH` |
| `{{providerCompanyEmail}}` | provider.provider_companies.email | `info@schnell-umzuege.de` |
| `{{providerCompanyPhone}}` | provider.provider_companies.phone_number | `+49 211 12345678` |
| `{{providerCompanyTaxNumber}}` | provider.provider_companies.tax_number | `DE123456789` |
| `{{providerCompanyAddress}}` | provider.provider_addresses.* | `Musterstraße 1, 40210 Düsseldorf` |
| `{{providerContactName}}` | shared.user_references.displayName (provider_owner) | `Hans Müller` |
| `{{providerAcceptedAt}}` | contract.providerAcceptedAt | `04.03.2026, 15:01 Uhr` |

### 2.4 Service Details

| Variable | Source | Example |
|----------|--------|---------|
| `{{serviceDescription}}` | contract.serviceDescription | Auto-generated summary |
| `{{serviceType}}` | demand.serviceType (localized) | `Privatumzug` |
| `{{fromAddress}}` | transport.addresses (from) | `Musterstraße 1, 40210 Düsseldorf` |
| `{{fromFloor}}` | transport.addresses.floor (from) | `3. OG` |
| `{{toAddress}}` | transport.addresses (to) | `Beispielweg 42, 50667 Köln` |
| `{{toFloor}}` | transport.addresses.floor (to) | `EG` |
| `{{estimatedVolume}}` | transport.transportations.estimated_volume | `28.5 m³` |
| `{{numberOfPeople}}` | transport.transportations.number_of_people | `3` |
| `{{additionalServices}}` | Derived from estate flags | `Möbelmontage, Verpackungsservice` |

### 2.5 Pricing

| Variable | Source | Example |
|----------|--------|---------|
| `{{totalPrice}}` | contract.agreedPriceAmount (formatted) | `1.850,00 €` |
| `{{netPrice}}` | totalPrice - vatAmount | `1.554,62 €` |
| `{{vatRate}}` | From offer (19% standard DE) | `19%` |
| `{{vatAmount}}` | contract.vatAmount (formatted) | `295,38 €` |
| `{{commissionRate}}` | From offer | `4%` |
| `{{commissionAmount}}` | contract.commissionAmount (formatted) | `74,00 €` |
| `{{providerReceives}}` | totalPrice - commissionAmount | `1.776,00 €` |

### 2.6 Price Breakdown (if available)

| Variable | Source | Example |
|----------|--------|---------|
| `{{priceBreakdown}}` | offer.priceBreakdown (array) | See template section |
| `{{baseTransportPrice}}` | Transportgrundpreis | `1.200,00 €` |
| `{{assemblyCost}}` | Montagekosten | `350,00 €` |
| `{{packingCost}}` | Verpackungskosten | `200,00 €` |
| `{{halteverbotCost}}` | Halteverbotkosten | `100,00 €` |

---

## 3. HTML Template (German — DE)

This is the default template stored in `contract.contract_templates` with `locale = 'de'`.

```html
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <style>
    /* --- PDF Print Styles --- */
    @page {
      size: A4;
      margin: 20mm 15mm 25mm 15mm;
    }

    body {
      font-family: 'Helvetica Neue', Arial, sans-serif;
      font-size: 10pt;
      line-height: 1.5;
      color: #1a1a1a;
    }

    /* --- Header --- */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #2563eb;
      padding-bottom: 12px;
      margin-bottom: 20px;
    }
    .header-logo {
      font-size: 18pt;
      font-weight: 700;
      color: #2563eb;
    }
    .header-logo small {
      display: block;
      font-size: 8pt;
      font-weight: 400;
      color: #6b7280;
    }
    .header-meta {
      text-align: right;
      font-size: 9pt;
      color: #4b5563;
    }

    /* --- Sections --- */
    h2 {
      font-size: 12pt;
      color: #1e3a5f;
      border-bottom: 1px solid #d1d5db;
      padding-bottom: 4px;
      margin-top: 20px;
      margin-bottom: 10px;
    }

    /* --- Party boxes --- */
    .parties {
      display: flex;
      gap: 20px;
      margin-bottom: 16px;
    }
    .party-box {
      flex: 1;
      border: 1px solid #d1d5db;
      border-radius: 4px;
      padding: 12px;
    }
    .party-box h3 {
      font-size: 10pt;
      margin: 0 0 8px 0;
      color: #2563eb;
    }
    .party-box p {
      margin: 2px 0;
      font-size: 9pt;
    }

    /* --- Table --- */
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 10px 0;
    }
    th {
      background-color: #f3f4f6;
      text-align: left;
      padding: 6px 10px;
      font-size: 9pt;
      border-bottom: 1px solid #d1d5db;
    }
    td {
      padding: 6px 10px;
      font-size: 9pt;
      border-bottom: 1px solid #e5e7eb;
    }
    .text-right { text-align: right; }
    .text-bold { font-weight: 600; }
    .total-row td {
      font-weight: 700;
      border-top: 2px solid #1e3a5f;
      font-size: 10pt;
    }

    /* --- Service details --- */
    .detail-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px 20px;
      font-size: 9pt;
    }
    .detail-label {
      color: #6b7280;
      font-size: 8pt;
    }

    /* --- Acceptance --- */
    .acceptance-box {
      border: 2px solid #2563eb;
      border-radius: 4px;
      padding: 12px;
      margin: 16px 0;
      background-color: #eff6ff;
    }
    .acceptance-box h3 {
      color: #2563eb;
      margin: 0 0 8px 0;
      font-size: 10pt;
    }
    .acceptance-entry {
      display: flex;
      justify-content: space-between;
      font-size: 9pt;
      padding: 4px 0;
    }
    .checkmark { color: #16a34a; font-weight: 700; }

    /* --- Footer --- */
    .footer {
      margin-top: 30px;
      padding-top: 10px;
      border-top: 1px solid #d1d5db;
      font-size: 7pt;
      color: #9ca3af;
      text-align: center;
    }

    /* --- Terms --- */
    .terms {
      font-size: 8pt;
      color: #4b5563;
      line-height: 1.4;
    }
    .terms ol {
      padding-left: 16px;
    }
    .terms li {
      margin-bottom: 4px;
    }
  </style>
</head>
<body>

  <!-- ============ HEADER ============ -->
  <div class="header">
    <div class="header-logo">
      CDS Platform
      <small>Community Driven Services</small>
    </div>
    <div class="header-meta">
      <strong>Dienstleistungsvertrag</strong><br>
      Vertragsnr.: {{contractNumber}}<br>
      Datum: {{contractDate}}<br>
      Status: {{contractStatus}}
    </div>
  </div>

  <!-- ============ PARTIES ============ -->
  <h2>1. Vertragsparteien</h2>
  <div class="parties">
    <div class="party-box">
      <h3>Auftraggeber (Kunde)</h3>
      <p><strong>{{customerName}}</strong></p>
      <p>{{customerEmail}}</p>
    </div>
    <div class="party-box">
      <h3>Auftragnehmer (Umzugsunternehmen)</h3>
      <p><strong>{{providerCompanyName}}</strong></p>
      <p>{{providerCompanyAddress}}</p>
      <p>{{providerCompanyEmail}}</p>
      <p>Tel.: {{providerCompanyPhone}}</p>
      <p>USt-IdNr.: {{providerCompanyTaxNumber}}</p>
      <p>Ansprechpartner: {{providerContactName}}</p>
    </div>
  </div>

  <!-- ============ SERVICE DETAILS ============ -->
  <h2>2. Leistungsbeschreibung</h2>

  <div class="detail-grid">
    <div>
      <div class="detail-label">Umzugsart</div>
      <div>{{serviceType}}</div>
    </div>
    <div>
      <div class="detail-label">Vereinbarter Umzugstermin</div>
      <div>{{serviceDate}}</div>
    </div>
    <div>
      <div class="detail-label">Beladeadresse</div>
      <div>{{fromAddress}}{{#if fromFloor}}, {{fromFloor}}{{/if}}</div>
    </div>
    <div>
      <div class="detail-label">Entladeadresse</div>
      <div>{{toAddress}}{{#if toFloor}}, {{toFloor}}{{/if}}</div>
    </div>
    <div>
      <div class="detail-label">Geschätztes Ladevolumen</div>
      <div>{{estimatedVolume}}</div>
    </div>
    <div>
      <div class="detail-label">Personenanzahl im Haushalt</div>
      <div>{{numberOfPeople}}</div>
    </div>
  </div>

  {{#if additionalServices}}
  <p style="margin-top: 10px;"><strong>Zusätzliche Leistungen:</strong> {{additionalServices}}</p>
  {{/if}}

  <p style="margin-top: 10px; font-size: 9pt;">{{serviceDescription}}</p>

  <!-- ============ PRICING ============ -->
  <h2>3. Vergütung</h2>

  <table>
    <thead>
      <tr>
        <th>Position</th>
        <th class="text-right">Betrag</th>
      </tr>
    </thead>
    <tbody>
      {{#if priceBreakdown}}
      <tr>
        <td>Transportgrundpreis</td>
        <td class="text-right">{{baseTransportPrice}}</td>
      </tr>
      {{#if assemblyCost}}
      <tr>
        <td>Möbelmontage / -demontage</td>
        <td class="text-right">{{assemblyCost}}</td>
      </tr>
      {{/if}}
      {{#if packingCost}}
      <tr>
        <td>Verpackungsservice</td>
        <td class="text-right">{{packingCost}}</td>
      </tr>
      {{/if}}
      {{#if halteverbotCost}}
      <tr>
        <td>Halteverbotszone</td>
        <td class="text-right">{{halteverbotCost}}</td>
      </tr>
      {{/if}}
      {{#each additionalCharges}}
      <tr>
        <td>{{this.description}}</td>
        <td class="text-right">{{this.amount}}</td>
      </tr>
      {{/each}}
      {{/if}}
      <tr>
        <td class="text-bold">Nettobetrag</td>
        <td class="text-right text-bold">{{netPrice}}</td>
      </tr>
      <tr>
        <td>MwSt. ({{vatRate}})</td>
        <td class="text-right">{{vatAmount}}</td>
      </tr>
      <tr class="total-row">
        <td>Gesamtbetrag (brutto)</td>
        <td class="text-right">{{totalPrice}}</td>
      </tr>
    </tbody>
  </table>

  <p style="font-size: 8pt; color: #6b7280;">
    CDS Plattformgebühr ({{commissionRate}}): {{commissionAmount}} —
    Auszahlung an Auftragnehmer: {{providerReceives}}
  </p>

  <!-- ============ TERMS ============ -->
  <h2>4. Vertragsbedingungen</h2>

  <div class="terms">
    <ol>
      <li><strong>Leistungsumfang:</strong> Der Auftragnehmer erbringt die unter Punkt 2 beschriebenen Umzugsleistungen am vereinbarten Termin.</li>
      <li><strong>Vergütung:</strong> Die Vergütung gemäß Punkt 3 ist nach Abschluss der Leistung fällig. Die Zahlung erfolgt über die CDS-Plattform (Stripe).</li>
      <li><strong>Plattformgebühr:</strong> Die CDS-Plattformgebühr ({{commissionRate}}) wird automatisch vom Gesamtbetrag einbehalten. Der Auftragnehmer erhält den Nettobetrag nach Abzug der Plattformgebühr.</li>
      <li><strong>Stornierung:</strong> Beide Parteien können den Vertrag bis 48 Stunden vor dem vereinbarten Termin kostenfrei stornieren. Bei späterer Stornierung gelten die gesetzlichen Regelungen.</li>
      <li><strong>Haftung:</strong> Der Auftragnehmer haftet für Schäden am Umzugsgut gemäß §§ 451-451h HGB (Frachtrecht). Die Haftungshöchstgrenze beträgt 620 Euro je Kubikmeter Laderaum.</li>
      <li><strong>Versicherung:</strong> Der Auftragnehmer bestätigt, über eine gültige Betriebshaftpflichtversicherung zu verfügen.</li>
      <li><strong>Datenschutz:</strong> Personenbezogene Daten werden gemäß DSGVO verarbeitet. Details in der Datenschutzerklärung unter cds-platform.de/datenschutz.</li>
      <li><strong>Streitbeilegung:</strong> Bei Streitigkeiten gilt deutsches Recht. Gerichtsstand ist der Sitz des Auftraggebers.</li>
      <li><strong>Salvatorische Klausel:</strong> Sollte eine Bestimmung dieses Vertrages unwirksam sein, bleibt die Wirksamkeit der übrigen Bestimmungen unberührt.</li>
    </ol>
  </div>

  <!-- ============ ACCEPTANCE ============ -->
  <h2>5. Annahme</h2>

  <div class="acceptance-box">
    <h3>Digitale Vertragsannahme</h3>
    <p style="font-size: 8pt; margin-bottom: 10px;">
      Beide Parteien haben diesen Vertrag durch Klick auf "Ich akzeptiere" auf der CDS-Plattform angenommen.
      Die Zeitstempel dienen als Nachweis der Zustimmung.
    </p>
    <div class="acceptance-entry">
      <span><span class="checkmark">&#10003;</span> Auftraggeber: {{customerName}}</span>
      <span>{{customerAcceptedAt}}</span>
    </div>
    <div class="acceptance-entry">
      <span><span class="checkmark">&#10003;</span> Auftragnehmer: {{providerContactName}} ({{providerCompanyName}})</span>
      <span>{{providerAcceptedAt}}</span>
    </div>
  </div>

  <!-- ============ FOOTER ============ -->
  <div class="footer">
    Dieses Dokument wurde automatisch von der CDS-Plattform (Community Driven Services) erstellt.<br>
    Vertragsnr.: {{contractNumber}} | Vertrags-ID: {{contractId}}<br>
    Generiert am: {{generatedAt}} | cds-platform.de
  </div>

</body>
</html>
```

---

## 4. English Template (EN)

Same structure, different labels. Stored with `locale = 'en'`.

Key label differences:

| Section | DE | EN |
|---------|----|----|
| Title | Dienstleistungsvertrag | Service Contract |
| §1 | Vertragsparteien | Contracting Parties |
| Customer | Auftraggeber (Kunde) | Client (Customer) |
| Provider | Auftragnehmer (Umzugsunternehmen) | Contractor (Moving Company) |
| §2 | Leistungsbeschreibung | Service Description |
| §3 | Vergütung | Compensation |
| §4 | Vertragsbedingungen | Terms and Conditions |
| §5 | Annahme | Acceptance |
| Gesamtbetrag | Gesamtbetrag (brutto) | Total Amount (gross) |
| MwSt | MwSt. | VAT |
| Plattformgebühr | Plattformgebühr | Platform Fee |

The EN template is structurally identical — only text labels change. Muhendis can duplicate the DE template and swap labels.

---

## 5. Implementation Notes

### 5.1 PDF Generation Service

```typescript
// src/modules/contract/services/pdf-generator.service.ts

@Injectable()
export class PdfGeneratorService {
  // Dependencies: Handlebars (template rendering), Puppeteer (HTML→PDF)

  async generateContractPdf(contract: Contract, locale: string): Promise<Buffer> {
    // 1. Load template from DB (contract_templates where locale + isDefault)
    // 2. Fetch cross-module data (customer name, provider company, addresses)
    // 3. Format money values (1850 cents → "1.850,00 €" for DE, "€1,850.00" for EN)
    // 4. Format dates (DD.MM.YYYY for DE, YYYY-MM-DD for EN)
    // 5. Render Handlebars template with variables
    // 6. Puppeteer: launch browser → page.setContent(html) → page.pdf({ format: 'A4' })
    // 7. Return PDF buffer
  }
}
```

### 5.2 Money Formatting

```typescript
function formatMoney(amountCents: number, locale: string): string {
  const amount = amountCents / 100;
  return new Intl.NumberFormat(locale === 'de' ? 'de-DE' : 'en-US', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}
// 185000 → "1.850,00 €" (DE) or "€1,850.00" (EN)
```

### 5.3 Date Formatting

```typescript
function formatDate(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale === 'de' ? 'de-DE' : 'en-US', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}
// → "04.03.2026" (DE) or "03/04/2026" (EN)
```

### 5.4 Contract Number Generation

```typescript
// Format: CDS-YYYY-NNNNN (sequential per year)
// Example: CDS-2026-00142
// Implementation: DB sequence or MAX(contractNumber) + 1 within transaction
```

### 5.5 Storage

```
MinIO bucket: cds-contracts
Path: contracts/{year}/{contractId}.pdf
Example: contracts/2026/a1b2c3d4-e5f6-7890-abcd-ef1234567890.pdf
```

### 5.6 Dependencies

```json
{
  "handlebars": "^4.7.0",     // Template rendering
  "puppeteer": "^22.0.0"      // HTML → PDF (headless Chrome)
}
```

**Alternative (lighter):** If Puppeteer's ~300MB Chromium download is too heavy for MVP, consider `@react-pdf/renderer` or `html-pdf-node`. But Puppeteer gives the best CSS/layout fidelity for the A4 template above.

---

## 6. Seed Data: Default Templates

```typescript
// prisma/seed.ts — add to seed script
await prisma.contractTemplate.upsert({
  where: { locale_isDefault: { locale: 'de', isDefault: true } },
  update: {},
  create: {
    name: 'Standardvertrag (DE)',
    locale: 'de',
    htmlTemplate: DE_CONTRACT_TEMPLATE, // The HTML from Section 3
    isDefault: true,
  },
});

await prisma.contractTemplate.upsert({
  where: { locale_isDefault: { locale: 'en', isDefault: true } },
  update: {},
  create: {
    name: 'Standard Contract (EN)',
    locale: 'en',
    htmlTemplate: EN_CONTRACT_TEMPLATE,
    isDefault: true,
  },
});
```

---

## 7. Legal Disclaimer

The template in Section 3 is a **technical draft** — not legal advice. Before go-live:

1. A German lawyer should review the Vertragsbedingungen (Section 4 of the PDF)
2. §451h HGB reference (Haftungshöchstgrenze 620€/m³) needs verification for Umzugsgut
3. Stornierung terms (48h free cancellation) must align with consumer protection law (Widerrufsrecht)
4. The document is NOT a qualified electronic signature (eIDAS) — it's a mutual acceptance record

Phase 1.5 will add eIDAS-compliant qualified electronic signatures.
