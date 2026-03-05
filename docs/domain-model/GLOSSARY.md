# CDS Domain Glossary (DE↔EN)

> **Ubiquitous Language** for the CDS Moving/Relocation Platform.
> Decision D-014: All domain terms have official German↔English mappings.
>
> This glossary is the **single source of truth** for domain terminology.
> Interface files reference this via `@see GLOSSARY.md`.
> i18n keys should follow these term conventions.

---

## Core Business Concepts

| EN (Code) | DE (User/Market) | Description | Interface File |
|-----------|------------------|-------------|----------------|
| Demand | Umzugsanfrage | A customer's moving/relocation request | `demand.ts` |
| Offer | Angebot | A provider's price offer for a demand | `offer.ts` |
| Contract | Dienstleistungsvertrag | Digital service contract between parties | `contract.ts` |
| Transportation | Umzugstransport | The physical moving/transport operation | `transport.ts` |
| Review | Bewertung | Bi-directional rating after service | `review.ts` |
| Payment | Zahlung | Payment transaction record | `payment.ts` |
| Notification | Benachrichtigung | System notification (email, push) | `notification.ts` |

## Actors & Roles

| EN (Code) | DE (User/Market) | Description | Interface File |
|-----------|------------------|-------------|----------------|
| Customer | Kunde | Person requesting a moving service | `core-types.ts` |
| Provider | Umzugsunternehmen / Anbieter | Moving company offering services | `provider.ts` |
| Provider Company | Umzugsunternehmen | The registered company entity | `provider.ts` |
| Provider Employee | Mitarbeiter | Employee of a provider company | `provider.ts` |
| Owner (role) | Inhaber/Admin | Company owner/admin role | `provider.ts` |
| Dispatcher | Disponent | Can manage offers and jobs | `provider.ts` |
| Worker | Mitarbeiter | Can view but not modify | `provider.ts` |

## Estate & Property (Immobilie)

| EN (Code) | DE (User/Market) | Description | Interface File |
|-----------|------------------|-------------|----------------|
| Estate | Wohnung / Immobilie | The property being moved from/to | `estate.ts` |
| Estate Type | Immobilientyp | Category: Apartment, House, Office, Warehouse | `estate.ts` |
| Estate Part | Raumtyp / Zimmer | A room or area within an estate | `estate.ts` |
| Apartment | Wohnung | Estate type: residential flat | `estate.ts` |
| House | Haus | Estate type: standalone house | `estate.ts` |
| Office | Gewerbeobjekt / Büro | Estate type: commercial office | `estate.ts` |
| Warehouse | Lager | Estate type: storage/warehouse | `estate.ts` |
| Cellar | Keller | Basement storage (common in DE) | `estate.ts` |
| Loft / Attic | Dachboden | Attic space | `estate.ts` |
| Garden / Garage | Garten / Garage | Outdoor area | `estate.ts` |
| Living Room | Wohnzimmer | Room type | Estate.xlsx |
| Bedroom | Schlafzimmer | Room type | Estate.xlsx |
| Kitchen | Küche | Room type | Estate.xlsx |
| Dining Room | Esszimmer | Room type | Estate.xlsx |
| Children's Room | Kinderzimmer | Room type | Estate.xlsx |
| Study / Home Office | Arbeitszimmer | Room type | Estate.xlsx |
| Guest Room | Gästezimmer | Room type | Estate.xlsx |
| Bathroom | Bad | Room type | Estate.xlsx |
| Hallway / Corridor | Diele / Flur / Gang | Room type | Estate.xlsx |
| Balcony / Terrace | Balkon / Terrasse | Outer area | Estate.xlsx |
| Storage Room | Speicher / Abstellkammer | Room type | Estate.xlsx |
| Dressing Room | Ankleide | Room type | Estate.xlsx |

## Furniture & Moving Goods (Umzugsgut)

| EN (Code) | DE (User/Market) | Description | Interface File |
|-----------|------------------|-------------|----------------|
| Moving Goods | Umzugsgut | Collective term for items being moved | `estate.ts` |
| Furniture Type | Möbeltyp | Category of furniture item (227 types in seed) | `estate.ts` |
| Furniture Item | Möbelstück | A specific furniture piece in an estate part | `estate.ts` |
| Furniture Group | Möbelgruppe | Grouping of related furniture types | `estate.ts` |
| Volume | Ladevolumen | Volume in cubic meters (m³) | `estate.ts` |
| Assemblable | Zerlegbar | Can be disassembled/reassembled | `estate.ts` |
| Assembly Cost | Montagekosten | Cost to reassemble furniture | `estate.ts` |
| Disassembly Cost | Demontagekosten | Cost to disassemble furniture | `estate.ts` |
| Flat Rate | Pauschale | Fixed price for assembly service | `estate.ts` |

## Moving Services (Umzugsdienstleistungen)

| EN (Code) | DE (User/Market) | Description | Interface File |
|-----------|------------------|-------------|----------------|
| Furniture Montage | Möbelmontage | Furniture assembly/disassembly service | `estate.ts` |
| Kitchen Montage | Küchenmontage | Kitchen disassembly/reassembly service | `estate.ts` |
| Packing Service | Verpackungsservice | Professional packing service | `estate.ts` |
| No-Parking Zone | Halteverbot (HVB) | Reserved parking permit for moving day | `estate.ts` |
| Walking Way | Trageweg | Carrying distance from door to truck (meters) | `transport.ts` |
| Floor | Stockwerk / Etage | Floor level of the property | `transport.ts` |

## Address & Location (Adresse)

| EN (Code) | DE (User/Market) | Description | Interface File |
|-----------|------------------|-------------|----------------|
| Address | Adresse | Physical address (German format) | `address.ts` |
| Street | Straße | Street name | `address.ts` |
| House Number | Hausnummer | Building number | `address.ts` |
| Post Code | Postleitzahl (PLZ) | 5-digit German postal code | `address.ts` |
| City / Place | Ort / Stadt | City or town name | `address.ts` |
| Post Code Data | PLZ-Daten | PLZ database with geo coordinates | `address.ts` |

## Elevator (Aufzug)

| EN (Code) | DE (User/Market) | Description | Interface File |
|-----------|------------------|-------------|----------------|
| Elevator | Aufzug / Fahrstuhl | Elevator/lift in building | `core-types.ts` |
| No Elevator | Kein Aufzug | No elevator available | `core-types.ts` |
| Personal Elevator | Personenaufzug | Passenger elevator only | `core-types.ts` |
| Freight Elevator | Lastenaufzug | Freight/cargo elevator (can carry furniture) | `core-types.ts` |

## Provider Onboarding (Anbieter-Registrierung)

| EN (Code) | DE (User/Market) | Description | Interface File |
|-----------|------------------|-------------|----------------|
| Deposit / Stake | Kaution / Sicherheitsleistung | Provider's financial commitment to platform | `provider.ts` |
| Service Coverage | Einsatzgebiet | PLZ ranges a provider serves | `provider.ts` |
| Business License | Gewerbeschein | Official business registration | `provider.ts` |
| Insurance Certificate | Versicherungsnachweis | Proof of insurance | `provider.ts` |
| Commercial Register | Handelsregisterauszug | Commercial register extract | `provider.ts` |
| Connected Account | Stripe Connected Account | Provider's Stripe account for payouts | `provider.ts` |

## Contract (Vertrag)

| EN (Code) | DE (User/Market) | Description | Interface File |
|-----------|------------------|-------------|----------------|
| Service Contract | Dienstleistungsvertrag | The legal agreement between parties | `contract.ts` |
| Moving Contract | Umzugsvertrag | Synonym for service contract in moving context | `contract.ts` |
| Contract Template | Vertragsvorlage | HTML template for PDF generation | `contract.ts` |
| Agreed Price | Vereinbarter Gesamtpreis | The accepted offer price | `contract.ts` |
| Service Date | Vereinbarter Umzugstermin | Agreed moving date | `contract.ts` |
| Service Description | Leistungsbeschreibung | Summary of agreed services | `contract.ts` |
| Customer Acceptance | Kundenakzeptanz | Customer's contract acceptance timestamp | `contract.ts` |
| Provider Acceptance | Anbieterakzeptanz | Provider's contract acceptance timestamp | `contract.ts` |

## Payment (Zahlung)

| EN (Code) | DE (User/Market) | Description | Interface File |
|-----------|------------------|-------------|----------------|
| Payment Transaction | Zahlungstransaktion | A payment record in the system | `payment.ts` |
| Commission | Plattformgebühr / Provision | Platform's service fee (3-5%) | `payment.ts` |
| Commission Rate | Provisionssatz | Commission percentage | `payment.ts` |
| Provider Net Amount | Nettobetrag Anbieter | Amount after commission deduction | `payment.ts` |
| VAT | Mehrwertsteuer (MwSt) | Value Added Tax | `payment.ts` |
| Total Amount | Gesamtbetrag | Full amount charged to customer | `payment.ts` |
| Payout | Auszahlung | Transfer to provider's account | `payment.ts` |
| Refund | Erstattung | Money returned to customer | `payment.ts` |
| Deposit Payment | Kautionszahlung | Provider's deposit payment | `payment.ts` |
| Deposit Return | Kautionsrückzahlung | Return of provider's deposit | `payment.ts` |

## Review & Rating (Bewertung)

| EN (Code) | DE (User/Market) | Description | Interface File |
|-----------|------------------|-------------|----------------|
| Review | Bewertung | Written review with rating | `review.ts` |
| Rating | Bewertung (Sterne) | Star rating (1-5) | `review.ts` |
| Punctuality | Pünktlichkeit | Review aspect: timeliness | `review.ts` |
| Carefulness | Sorgfalt | Review aspect: care with items | `review.ts` |
| Friendliness | Freundlichkeit | Review aspect: communication | `review.ts` |
| Value for Money | Preis-Leistung | Review aspect: price fairness | `review.ts` |
| Description Accuracy | Beschreibungsgenauigkeit | Review aspect (provider→customer) | `review.ts` |
| Accessibility | Erreichbarkeit | Review aspect (provider→customer) | `review.ts` |
| Average Rating | Durchschnittsbewertung | Aggregated rating score | `review.ts` |

## Status Terms (Statusbegriffe)

| EN (Code) | DE (User/Market) | Description |
|-----------|------------------|-------------|
| Draft | Entwurf | Initial/unpublished state |
| Published | Veröffentlicht | Visible, accepting offers |
| Accepted | Angenommen | Offer/contract accepted |
| In Progress | In Bearbeitung | Work ongoing |
| Completed | Abgeschlossen | Work finished |
| Cancelled | Storniert | Cancelled by a party |
| Submitted | Eingereicht | Offer submitted |
| Rejected | Abgelehnt | Offer rejected |
| Expired | Abgelaufen | Time limit exceeded |
| Withdrawn | Zurückgezogen | Retracted by creator |
| Fulfilled | Erfüllt | Contract terms met |
| Disputed | Streitig | Under dispute |
| Suspended | Gesperrt | Temporarily blocked |
| Active | Aktiv | Operational state |
| Pending | Ausstehend | Awaiting action |
| Registered | Registriert | Account created |

## Notification Types (Benachrichtigungstypen)

| EN (Code) | DE (User/Market) | Interface File |
|-----------|------------------|----------------|
| Email Verification | E-Mail-Bestätigung | `notification.ts` |
| Password Reset | Passwort zurücksetzen | `notification.ts` |
| New Offer Received | Neues Angebot erhalten | `notification.ts` |
| Offer Accepted | Angebot angenommen | `notification.ts` |
| Offer Rejected | Angebot abgelehnt | `notification.ts` |
| Contract Ready | Vertrag zur Bestätigung | `notification.ts` |
| Contract Active | Vertrag bestätigt | `notification.ts` |
| Payment Completed | Zahlung eingegangen | `notification.ts` |
| Provider Payout | Auszahlung überwiesen | `notification.ts` |
| Review Reminder | Bewertung abgeben | `notification.ts` |
| Provider Activated | Konto aktiviert | `notification.ts` |

---

## Usage Notes

1. **In code**: Use English terms for identifiers, German terms in JSDoc with `DE:` prefix
2. **In UI**: Use `LocalizedText` with DE and EN translations from this glossary
3. **In API docs**: Reference both terms, e.g., "Demand (Umzugsanfrage)"
4. **In seed data**: Estate.xlsx already contains DE+EN+4 more languages
5. **For new terms**: Add to this glossary BEFORE using in code — discuss in team if ambiguous
