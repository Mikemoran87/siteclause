export const DEMO_CONTRACT = `JCT STANDARD BUILDING SUBCONTRACT 2016

Subcontract Reference: SC-2025-0312
Date: 1 October 2025

PARTIES:
Main Contractor: Bradstone Construction Ltd, 22 Harbour View, Bristol BS1 4RN
Subcontractor: Fennell Civil Engineering Ltd, Unit 7 Westpark Industrial Estate, Bristol BS3 2QT

PROJECT: Oakfield Rise Residential Development — 72 Units, Filton, Bristol
Architect: Clarke & Webb Architects
Engineer: Hartley Structural Engineers

SUBCONTRACT SUM: £2,850,000 (Two Million Eight Hundred and Fifty Thousand Pounds)

WORKS: Groundworks, foundations, drainage, and external works as per drawings Rev C issued 15 September 2025.

PROGRAMME: Commencement 14 October 2025. Completion 30 June 2026.

---

CLAUSE 3 — INSTRUCTIONS
3.1 The Subcontractor shall only carry out and shall carry out all instructions issued by the Main Contractor which are empowered by this Subcontract.
3.2 All instructions shall be issued in writing. Where instructions are given orally, the Subcontractor shall confirm in writing within 7 days and the Main Contractor shall confirm or dissent within a further 7 days.

CLAUSE 4 — PAYMENT
4.1 The Subcontractor shall submit interim payment applications on the 1st of each month.
4.2 The Main Contractor shall pay within 30 days of receipt of a valid application.
4.3 Any disputed amounts must be notified in writing within 5 days of the payment notice.

CLAUSE 5 — VARIATIONS
5.1 The Main Contractor may instruct variations to the Works at any time.
5.2 All variations shall be valued in accordance with the rates in the Schedule of Rates, or if not applicable, at fair market rates.
5.3 The Subcontractor must give written notice of any claim for additional payment arising from a variation within 14 days of the instruction or the entitlement shall be lost.
5.4 Variations instructed without a formal Variation Order must be confirmed by the Subcontractor in writing within 7 days or they will not be recognised.

CLAUSE 7 — DELAY AND EXTENSION OF TIME
7.1 If the Subcontractor is delayed by any act or omission of the Main Contractor, they shall give written notice within 7 days of the delay event occurring.
7.2 Failure to give notice in accordance with Clause 7.1 shall result in the Subcontractor forfeiting any entitlement to an extension of time or loss and expense.
7.3 Loss and expense arising from delay caused by the Main Contractor shall be claimed within 21 days of the delay event, supported by contemporary records.

CLAUSE 8 — UNFORESEEN CONDITIONS
8.1 If the Subcontractor encounters physical conditions which could not reasonably have been foreseen by an experienced contractor, they shall give immediate written notice.
8.2 Notice under Clause 8.1 must be given before the conditions are disturbed where reasonably practicable.
8.3 The Subcontractor shall keep contemporary records of all additional costs incurred.

CLAUSE 12 — INSURANCE
12.1 The Subcontractor shall maintain public liability insurance of not less than £6,500,000.
12.2 Evidence of insurance shall be provided to the Main Contractor on request.

SCHEDULE OF RATES:
- Excavation (bulk): £18.50/m³
- Excavation (rock): £95.00/m³
- Concrete (foundations): £185/m³
- Drainage (100mm): £45/m
- Drainage (150mm): £68/m
- Blockwork (below ground): £52/m²
- General labourer: £42/hour
- Plant (360 excavator): £95/hour
- Project manager / foreman: £65/hour`

export const DEMO_PROGRAMME = `ID Name Duration Start Finish Predecessors Resource Names
0 Oakfield Rise Groundworks Programme W/C 14.10.2025 180 days Mon 14/10/25 Fri 30/06/26
1 Drainage Works 60 days Mon 14/10/25 Fri 09/01/26
2 Northern boundary drainage run 5 days Mon 20/10/25 Fri 24/10/25
3 RE-ROUTE INSTRUCTED — awaiting formal VO from Bradstone. Works completed 25/10/25.
0 days Mon 20/10/25 Mon 20/10/25 Gary Pearce
4 Main drainage run CH1 to CH485 25 days Mon 14/10/25 Fri 14/11/25
5 Rock Excavation Plots 7-12 0 days Fri 05/11/25 Fri 05/11/25
6 Rock survey complete. 480m3 unforeseeable rock. Awaiting agreement on additional cost from Bradstone QS.
0 days Fri 07/11/25 Fri 07/11/25 Hartley Engineers
7 Foundations 45 days Mon 17/11/25 Fri 16/01/26
8 Block A foundations 15 days Mon 17/11/25 Fri 05/12/25
9 Block B foundations - REVISED SPEC (pad and beam replacing strip footings per architect instruction 18/11/25)
25 days Mon 08/12/25 Fri 09/01/26 Hartley Structural
10 Accommodation Works 30 days Mon 19/01/26 Fri 27/02/26
11 South boundary retaining wall - VERBAL INSTRUCTION from Gary Pearce 06/02/26. VO not yet issued.
0 days Mon 09/02/26 Mon 09/02/26 Gary Pearce`

export const DEMO_CORRESPONDENCE = `===== WHATSAPP GROUP: Oakfield Rise Site — Fennell Civil =====
Exported 28 March 2026

14/10/2025, 07:52 - Gary Pearce (Bradstone PM): Morning all. Welcome to Oakfield Rise. Site meeting 8am Monday.

20/10/2025, 14:33 - Gary Pearce (Bradstone PM): Sean, we need to move the drainage run on the north boundary. About 3m north of what's on the contract. Architect's call.

20/10/2025, 14:55 - Gary Pearce (Bradstone PM): About 180m of 150mm pipe. We'll sort the VO paperwork later. Just crack on.

21/10/2025, 09:12 - Sean Fennell: Starting re-route today. Cost is 180m x £68 = £12,240 plus manholes. Need the VO Gary.

21/10/2025, 09:30 - Gary Pearce (Bradstone PM): Noted. Will chase the office.

05/11/2025, 11:20 - Gary Pearce (Bradstone PM): Sean — rock on plots 7-12. Structural engineer wants a survey before we go further.

07/11/2025, 08:15 - Sean Fennell: Survey done. 480 cubic metres of rock. That's £45,600 at our contract rate of £95/m3. Not in the geotech Gary.

07/11/2025, 09:00 - Gary Pearce (Bradstone PM): I know. Keep records, we'll deal with it.

18/11/2025, 16:45 - Gary Pearce (Bradstone PM): Architect has changed the Block B foundation spec. Strip footings out, pad and beam in. New drawings Rev E attached.

19/11/2025, 07:55 - Sean Fennell: That's a complete redesign. Extra concrete, different reinforcement, extra excavation. We're looking at £58,000 on top.

19/11/2025, 09:10 - Gary Pearce (Bradstone PM): Get the costs together and send them over.

06/02/2026, 10:15 - Gary Pearce (Bradstone PM): Sean, architect wants a retaining wall along the south boundary. About 45m. Not in scope.

06/02/2026, 10:40 - Sean Fennell: That's extra works. 45m retaining wall, rough estimate £22,500. Need a proper VO before we start Gary. Still waiting on the other three.

---

===== EMAILS — Oakfield Rise =====

From: Sean Fennell <sfennell@fennellcivil.co.uk>
To: Gary Pearce <g.pearce@bradstone.co.uk>
Date: 10 January 2026
Subject: Outstanding Variation Orders — Notice under Clause 5.3

Gary,

We now have four outstanding items with no formal Variation Order:

1. Northern boundary drainage re-route (instructed verbally 20 Oct 2025)
   180m x 150mm pipe at £68/m = £12,240 plus 2 additional manholes at £850 each = £1,700
   Subtotal: £13,940

2. Rock excavation — Plots 7-12 (unforeseen physical conditions under Clause 8)
   480m3 at £95/m3 = £45,600
   Standing time during rock survey: 3 days x £1,800/day = £5,400
   Subtotal: £51,000

3. Block B foundation redesign (architect instruction 18 Nov 2025)
   Additional excavation, formwork, pad and beam concrete: £58,000

4. South boundary retaining wall (verbal instruction 6 Feb 2026)
   45m retaining wall: £22,500

Total outstanding: £145,440

All items are outside our original subcontract scope. Notice under Clause 5.3 is hereby formally given. We require Variation Orders within 7 days or this matter will be escalated.

Sean Fennell
Director, Fennell Civil Engineering

---

From: Gary Pearce <g.pearce@bradstone.co.uk>
To: Sean Fennell <sfennell@fennellcivil.co.uk>
Date: 14 January 2026

Sean, our QS is reviewing all items. We will revert by end of month.

Gary`
