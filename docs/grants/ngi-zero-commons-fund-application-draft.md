# NGI Zero Commons Fund — Application Draft

**Fund:** NGI Zero Commons Fund (2026-04Z)
**Deadline:** 1 April 2026, 12:00 CEST
**Status:** DRAFT — review and refine before submission

---

## Contact Information

- **Name:** Levent Sezgin Genc
- **Email:** [TO BE FILLED]
- **Phone:** [TO BE FILLED]
- **Organisation:** 3eAI Labs
- **Country:** Turkey

---

## Proposal Name

**CDS — Community Driven Services: A Post-Platform Service Economy Engine Powered by AI**

---

## Website / Wiki

https://3eai-labs.org

---

## Abstract

*Can you explain the whole project and its expected outcome(s).*

Platform businesses like Uber, Airbnb, and DoorDash were a necessary innovation of the pre-AI era. They solved the coordination problem between service providers and consumers at scale — matching supply with demand, handling pricing, logistics, and trust. For this, they charge 15-30% commission. That was a reasonable cost for a real service.

AI changes this equation fundamentally. AI agents can now perform matching, dynamic pricing, scheduling, logistics optimization, and quality assessment at near-zero marginal cost. The commission that platforms charge is no longer the cost of coordination — it is economic friction without corresponding value.

CDS (Community Driven Services) is an open-source engine for the post-platform service economy. Instead of a centralized platform taking a cut from every transaction, CDS provides:

1. **Service Contract Engine** — A specification and runtime for defining, executing, and verifying service agreements. Contracts are code-enforced and legally valid, using W3C Verifiable Credentials and EBSI-compatible identity for tamper-proof evidence. Think of smart contracts, but without blockchain overhead, with legal standing, and designed for real-world services.

2. **AI Agent Framework** — Autonomous agents handle the operational work that platforms currently do: finding customers, optimizing routes, pricing services, managing bookings. These agents work for the service provider, not for a platform.

3. **Human Validation Protocol** — A lightweight protocol where humans serve as validators (digital notaries) for service quality and dispute resolution. Every smartphone can be a validation node. Validators earn income for their participation — not through cryptocurrency mining, but through verified contribution to service quality assurance.

**Expected outcomes:**

- Open-source Service Contract Engine with reference implementation (library + API)
- Open Service Contract Specification (JSON Schema-based, extensible per service domain)
- Proof-of-concept demonstrating the full cycle: service definition → AI agent matching → human validation → settlement
- Technical documentation and integration guide
- All outcomes published under an OSI-approved open-source license

**The core insight:** AI has made platform intermediation an obsolete cost layer. CDS provides the open infrastructure for what comes next — a more efficient service economy where AI handles operations, humans provide authority, and the 15-30% that used to go to platform owners stays in the productive economy.

---

## Relevant Experience

*Have you been involved with projects or organisations relevant to this project before? And if so, can you tell us a bit about your contributions?*

I have been working on the CDS concept for over two years, beginning with a comprehensive whitepaper and architectural design under 3eAI Labs. The original vision has since been refined through extensive analysis — removing unnecessary complexity (heavy blockchain, custom cryptocurrency) and focusing on what AI now makes possible.

Professionally, I lead software development projects following enterprise-grade practices: structured SDLC guidelines, API design standards, observability frameworks, and data governance policies. The CDS project inherits this engineering rigor — it is not an academic exercise but a production-oriented system designed for real-world deployment.

My current development environment uses an AI-first approach: multiple AI agent sessions collaborate through a purpose-built team platform (Team Hub), demonstrating the same human-AI collaboration model that CDS proposes for the service economy. This gives me practical, daily experience with the coordination patterns CDS is built on.

[OPTIONAL: Add relevant professional background, previous open-source contributions, etc.]

---

## Requested Amount

**EUR 50,000**

---

## Budget Breakdown

*Explain what the requested budget will be used for. Does the project have other funding sources, both past and present? A breakdown in the main tasks with associated effort is appreciated.*

The project is currently self-funded. No other funding sources, past or present.

### Task Breakdown

| # | Task | Effort | Budget |
|---|------|--------|--------|
| 1 | **Service Contract Specification** — Design the open specification for service contracts: schema definition, lifecycle states, validation rules, dispute triggers. Domain-agnostic core with extension points for specific service types (transport, hospitality, delivery). | 6 weeks | EUR 8,000 |
| 2 | **Service Contract Engine** — Reference implementation of the spec: contract creation, execution, state management, event emission, automated verification. TypeScript library publishable as npm package. | 10 weeks | EUR 14,000 |
| 3 | **EBSI / Verifiable Credentials Integration** — Implement W3C Verifiable Credentials for contract evidence, service provider identity, and validation proofs. EBSI-compatible DID methods for European interoperability. | 6 weeks | EUR 8,000 |
| 4 | **Human Validation Protocol** — Design and implement the lightweight protocol for human validators: validation request/response, reputation scoring, income distribution, mobile-optimized endpoint. | 6 weeks | EUR 8,000 |
| 5 | **Proof of Concept** — End-to-end demonstration with a concrete service domain (moving/transport): AI agent creates service listing, matches with customer, human validator confirms completion, settlement executes. | 4 weeks | EUR 6,000 |
| 6 | **Documentation & Community** — Technical documentation, API reference, integration guides, contribution guidelines. Project website, open repository, initial community outreach. | 4 weeks | EUR 6,000 |
| | **Total** | **~36 weeks (9 months)** | **EUR 50,000** |

Budget is allocated primarily to development effort (personal time). Infrastructure costs are minimal — cloud hosting for development/demo environments, domain registration. No hardware purchases planned.

---

## Comparison with Existing Efforts

*Compare your own project with existing or historical efforts.*

| Project | Approach | CDS Difference |
|---------|----------|----------------|
| **Uber, Airbnb, DoorDash** | Centralized platforms, 15-30% commission, proprietary algorithms, platform owns user data | CDS eliminates the intermediary. AI agents do the same work at near-zero cost. Service providers own their data and customer relationships. |
| **Blockchain platforms (Colony, Origin Protocol, dApps)** | Full on-chain operations, cryptocurrency tokens, high technical barrier, gas fees | CDS takes only what works from blockchain — verifiable credentials, tamper-proof evidence — without the infrastructure overhead. No wallet needed, no tokens, no gas fees. Real currency (EUR, TL, USD). |
| **Platform cooperatives (Stocksy, Up&Go, Fairmondo)** | Cooperative ownership model, democratic governance | Good intentions but they don't scale — same centralized technology, just different ownership. CDS changes the technology itself, making the centralized coordination layer unnecessary. |
| **Open Food Network** | Open-source platform for local food systems | Domain-specific solution. CDS provides domain-agnostic infrastructure — the Service Contract Engine can be used for food, transport, hospitality, or any service type. |
| **Solid (Tim Berners-Lee)** | Personal data pods, user data ownership | Focuses on data sovereignty. CDS focuses on service economy efficiency. Complementary — CDS could use Solid pods for user data storage. |

**CDS's unique position:** It is not another platform (centralized or cooperative) and not another blockchain project. It is **post-platform infrastructure** — the open-source building blocks that make platform intermediation unnecessary, enabled by AI's ability to perform coordination at near-zero cost.

---

## Technical Challenges

*What are significant technical challenges you expect to solve during the project, if any?*

1. **Service Contract Generalization** — Designing a contract specification flexible enough to represent diverse service types (moving, food delivery, accommodation, professional services) while maintaining strong enough structure for automated verification. The challenge is finding the right abstraction level — too generic becomes useless, too specific limits adoption. Approach: start with one concrete domain (moving/transport), extract patterns, validate against 2-3 other domains.

2. **Human Validation Incentive Design** — Creating a validation protocol where the income for validators is sufficient to motivate participation but doesn't add excessive cost to transactions. The validator must add genuine value (not rubber-stamp approval). Approach: reputation-weighted validation — experienced validators handle higher-value transactions, new validators start with micro-validations.

3. **AI Agent Reliability** — Service-matching AI agents must be reliable enough for real commercial transactions. A wrong match or incorrect price estimate has real financial consequences. Approach: human-in-the-loop for high-value decisions, graduated autonomy based on agent track record, clear fallback to human decision-making.

4. **EBSI Integration Maturity** — EBSI is still evolving. Building on it means some APIs and specifications may change. Approach: abstract the credential layer behind a clean interface so the underlying DID/VC provider can be swapped without affecting the rest of the system.

---

## Ecosystem

*Describe the ecosystem of the project, and how you will engage with relevant actors and promote the outcomes?*

**Target ecosystem participants:**

- **SMEs** — Small businesses currently paying 15-30% to platform intermediaries. Initial focus: moving/transport companies in Turkey and EU. Direct engagement through industry associations and chambers of commerce.

- **AI/LLM developer community** — The AI agent framework will be published as an open-source toolkit. Engagement through GitHub, developer conferences, and integration with popular AI frameworks (LangChain, AutoGen, CrewAI).

- **EBSI / SSI community** — Alignment with European blockchain and digital identity initiatives. Participation in EBSI community calls, contribution to W3C Verifiable Credentials working groups where relevant.

- **Platform cooperative movement** — While CDS takes a different technical approach, the goals overlap. Engagement with organizations like Platform Cooperativism Consortium and CECOP (European confederation of cooperatives).

- **NGI ecosystem** — Active participation in NGI community events, cross-project collaboration with complementary NGI-funded projects.

**Promotion strategy:**

- All code on public GitHub from day one (https://github.com/3eAI-Research)
- Monthly development updates (blog/newsletter)
- Technical talks at relevant conferences (FOSDEM, OW2con, EU Open Source Policy Summit)
- Academic paper submission describing the Service Contract Engine architecture
- Pilot deployment with 2-3 real SMEs in the moving/transport sector to validate the model with real transactions

**Sustainability beyond the grant:**

CDS is designed as open-source infrastructure operated by a commercial entity (similar to Red Hat/Linux model). Revenue comes from a low service fee (3-5%) on transactions processed through the network — dramatically lower than current platform commissions, but sufficient for sustainable operation and continued development. The grant funds the creation of the open-source commons; the operational model ensures its long-term maintenance.

---

## Generative AI Disclosure

**Did you use generative AI in writing this proposal?**

Yes.

**Details:** Claude (Anthropic, model: claude-opus-4-6) was used as a collaborative thinking partner throughout the proposal development process — from analyzing the fit between CDS and NGI Zero Commons Fund priorities, to refining the argument framework, to drafting and iterating on the proposal text. The AI was used in an interactive dialogue where the human author (Levent Sezgin Genc) provided strategic direction, corrected framing, and made all key decisions. The AI contributed research (program analysis, comparable project identification), structured the arguments, and produced draft text that was reviewed and refined.

All prompts and conversation transcripts are available upon request.

---

## Notes for Review (DO NOT SUBMIT)

### Before Submission Checklist
- [ ] Fill in contact details (email, phone)
- [ ] Confirm organization name (3eAI Labs or new entity?)
- [ ] Create project website or GitHub landing page
- [ ] Review and personalize the "Relevant Experience" section
- [ ] Final read-through in English — check for natural flow
- [ ] Deadline: 1 April 2026, 12:00 CEST

### Strengths of This Application
- Clear, non-ideological economic argument (AI → efficiency → post-platform)
- Concrete deliverables (spec + engine + PoC)
- EBSI alignment (scores well with EU evaluators)
- Realistic budget and timeline
- Honest about AI use in writing

### Potential Weaknesses to Address
- Single-person team — mitigate by emphasizing AI-assisted development productivity
- Turkey-based — mitigate by emphasizing European dimension (EBSI, EU SMEs, open-source)
- No prior open-source track record mentioned — add if available
