import type { SectionApiId } from '../types'

export interface SectionImage {
  src: string
  figureLabel: string
  caption: string
  sourceDoc: string
  credit: string
}

export interface SectionMetric {
  label: string
  value: string
  note: string
}

export interface MissionSection {
  apiSection: SectionApiId
  displayTitle: string
  shortTitle: string
  eraTag: string
  system: string
  accent: 'telemetry' | 'ember' | 'signal' | 'violet'
  summaryBullets: string[]
  keyMetrics: SectionMetric[]
  images: SectionImage[]
  starterPrompts: [string, string, string]
}

export const MISSION_SECTIONS: MissionSection[] = [
  {
    apiSection: 'Combustion Science',
    displayTitle: 'ISS Combustion Science',
    shortTitle: 'Combustion',
    eraTag: '2000s → present',
    system: 'CIR · MSG · Cygnus / Saffire',
    accent: 'telemetry',
    summaryBullets: [
      'Without buoyancy, microgravity flames become spherical shells: oxygen diffuses inward while CO₂ and H₂O diffuse outward.',
      'ACME experiments in the ≈90 L CIR chamber show sooting flames grow taller, wider and cooler, producing 5–8× the soot volume fraction of 1g flames.',
      'FLEX and FLEX-2 measured low-temperature “cool flames” that persist after radiative extinction — a re-ignition hazard.',
      'BASS / Confined Combustion showed wall confinement can raise or lower solid-fuel flammability; Saffire burns large fabrics inside uncrewed Cygnus cargo ships.',
    ],
    keyMetrics: [
      { label: 'ISS fires studied', value: '1,500', note: '2022 science report' },
      { label: 'Soot fraction', value: '5–8×', note: 'µg vs 1g flames' },
      { label: 'Heptane LOI', value: '0.15 → 0.17', note: 'O₂/N₂ → CO₂' },
      { label: 'CIR chamber', value: '≈90 L', note: 'constant volume' },
    ],
    images: [
      {
        src: '/sections/iss-combustion/flame-regimes.png',
        figureLabel: 'BASS-II · Figure 1',
        caption:
          'Flame regimes observed in BASS-II tests, including blue near-limit flames, droplet burning and wall-confined shapes.',
        sourceDoc: 'BASS-II Summary Report',
        credit: 'Credit: NASA · BASS-II Summary Report',
      },
      {
        src: '/sections/iss-combustion/blue-flame-droplets.png',
        figureLabel: 'BASS-II · Figure 2',
        caption:
          'Droplet flame development and blue-flame burning in microgravity across varying oxygen and diluent conditions.',
        sourceDoc: 'BASS-II Summary Report',
        credit: 'Credit: NASA · BASS-II Summary Report',
      },
      {
        src: '/sections/iss-combustion/quiescent-flames.png',
        figureLabel: 'BASS-II · Figure 3',
        caption:
          'Near-limit quiescent flame shapes as oxygen concentration and diluent composition are varied.',
        sourceDoc: 'BASS-II Summary Report',
        credit: 'Credit: NASA · BASS-II Summary Report',
      },
    ],
    starterPrompts: [
      'How do FLEX cool flames pose a re-ignition hazard after hot flame extinction?',
      'Compare soot volume fraction and flame geometry in ACME microgravity vs 1g tests.',
      'What did BASS and Confined Combustion reveal about solid fuel flammability near walls?',
    ],
  },
  {
    apiSection: 'Apollo 1',
    displayTitle: 'Apollo 1',
    shortTitle: 'Apollo 1',
    eraTag: '27 Jan 1967',
    system: 'AS-204 · Block I CM-012 · Pad 34-A',
    accent: 'ember',
    summaryBullets: [
      'A launch-rehearsal flash fire inside a 100% oxygen cabin at 16.7 psia killed Virgil Grissom, Edward White II and Roger Chaffee.',
      'The Apollo 204 Review Board cited wiring and coolant-plumbing defects in the lower forward bay, Raschel netting and Velcro combustibles, and an inward-opening hatch.',
      'The crew reported fire 9.7 s after a 23:30:55 GMT power blip; the cabin ruptured ≈14.7 s later and the hatch opened at 4 min 55 s.',
      'Fixes included a 60/40 O₂/N₂ atmosphere at 14.7 psi, an outward-opening hatch, Beta cloth, wiring redesign, the ASAP and NASA-STD-6001.',
    ],
    keyMetrics: [
      { label: 'Cabin atmosphere', value: '100% O₂', note: '16.7 psia' },
      { label: 'Cabin rupture', value: '≈14.7 s', note: 'after fire report' },
      { label: 'Hatch opened', value: '4:55', note: 'mm:ss after ignition' },
      { label: 'Block II mix', value: '60/40', note: 'O₂/N₂ at 14.7 psi' },
    ],
    images: [
      {
        src: '/sections/apollo-1/crew-portrait.jpg',
        figureLabel: 'AS-204 · Prime crew',
        caption:
          'Edward H. White II, Virgil I. “Gus” Grissom and Roger B. Chaffee — the Apollo 1 prime crew.',
        sourceDoc: 'NASA JSC photo S66-30236',
        credit: 'Credit: NASA/JSC · S66-30236',
      },
      {
        src: '/sections/apollo-1/prime-backup-crews.jpg',
        figureLabel: 'AS-204 · Crews',
        caption:
          'Prime and backup crews for the first crewed Apollo flight, photographed in 1966.',
        sourceDoc: 'NASA JSC photo S66-30238',
        credit: 'Credit: NASA/JSC · S66-30238',
      },
      {
        src: '/sections/apollo-1/tribute.jpg',
        figureLabel: 'Apollo 1 · Remembrance',
        caption:
          'Kennedy Space Center honors the crews of Apollo 1, Challenger and Columbia during the 2015 Day of Remembrance.',
        sourceDoc: 'NASA KSC photo KSC-2015-1209',
        credit: 'Credit: NASA/KSC · KSC-2015-1209',
      },
    ],
    starterPrompts: [
      'What four root causes did the Apollo 204 Review Board identify in the CM-012 fire?',
      'How did Block II cabin atmosphere and hatch design change after Apollo 1?',
      'How does NASA-STD-6001 Test 1 and Test 4 prevent Apollo 1 style material failures?',
    ],
  },
  {
    apiSection: 'Apollo 13',
    displayTitle: 'Apollo 13',
    shortTitle: 'Apollo 13',
    eraTag: 'April 1970',
    system: 'SM Bay 4 · Cryogenic O₂ Tank No. 2',
    accent: 'signal',
    summaryBullets: [
      'Tank No. 2 still carried 28 V thermostatic switches after the heater circuit was upgraded to 65 V DC.',
      'During ground detanking, 65 V welded the switches closed; the heater tube reached 800–1,000°F while the cabin gauge could only read to 85°F.',
      'The overheating charred PTFE fan-motor insulation. During the cryo stir, an arc ignited Teflon inside supercritical oxygen and blew off Service Module Bay 4.',
      'Apollo 14 added a third oxygen dewar for redundancy, and the 52.8 W stir fans were removed from the oxygen tanks.',
    ],
    keyMetrics: [
      { label: 'Heater supply', value: '65 V DC', note: 'vs 28 V switches' },
      { label: 'Heater tube', value: '800–1,000°F', note: 'gauge max 85°F' },
      { label: 'Oxygen loss', value: '≈3 h', note: 'all SM oxygen' },
      { label: 'Apollo 14 fix', value: '3rd dewar', note: 'tank redundancy' },
    ],
    images: [
      {
        src: '/sections/apollo-13/crew-portrait.jpg',
        figureLabel: 'Apollo 13 · Prime crew',
        caption: 'James Lovell, John “Jack” Swigert and Fred Haise, the Apollo 13 prime crew.',
        sourceDoc: 'NASA JSC photo S70-36485',
        credit: 'Credit: NASA/JSC · S70-36485',
      },
      {
        src: '/sections/apollo-13/damaged-service-module.jpg',
        figureLabel: 'Apollo 13 · SM Bay 4',
        caption:
          'The damaged Apollo 13 Service Module photographed from the Lunar Module after separation; the Bay 4 panel is missing.',
        sourceDoc: 'NASA JSC photo AS13-59-8562',
        credit: 'Credit: NASA/JSC · AS13-59-8562',
      },
      {
        src: '/sections/apollo-13/mission-control.jpg',
        figureLabel: 'Apollo 13 · Mission Control',
        caption:
          'Flight Director Gene Kranz at his console during the Apollo 13 oxygen cell failure, 14 April 1970.',
        sourceDoc: 'NASA JSC photo S70-34904',
        credit: 'Credit: NASA/JSC · S70-34904',
      },
    ],
    starterPrompts: [
      'Why did the 28V thermostatic switch fail during the 65V ground detanking on Apollo 13?',
      'Why did Teflon wire insulation burn explosively inside supercritical oxygen Tank 2?',
      'What oxygen tank redesigns and stir-fan removals were implemented for Apollo 14?',
    ],
  },
  {
    apiSection: 'Mir',
    displayTitle: 'Mir Space Station',
    shortTitle: 'Mir',
    eraTag: '23–24 Feb 1997',
    system: 'Kvant-1 · Vika (TGK) SFOG',
    accent: 'violet',
    summaryBullets: [
      'A Vika solid-fuel oxygen generator in Kvant-1 ignited while six crew members were aboard, including NASA astronaut Jerry Linenger.',
      'Each cartridge holds roughly 1 L of lithium perchlorate and normally makes ≈600 L of oxygen at 450–500°C over 5–20 minutes.',
      'The malfunction produced a 2–3 ft “blowtorch” jet flame and molten sparks. Crew debriefs put the burn at ~14 minutes, not the 90 s first reported.',
      'The flame blocked one of two Soyuz escape routes; soot condensed on the cold hull and cleanup took roughly 24 hours. ISS SFOG and dual-egress protocols followed.',
    ],
    keyMetrics: [
      { label: 'Cartridge', value: '~1 L LiClO₄', note: 'per Vika candle' },
      { label: 'Normal output', value: '600 L O₂', note: 'in 5–20 min' },
      { label: 'Burn duration', value: '~14 min', note: 'crew debrief' },
      { label: 'Escape routes', value: '1 of 2', note: 'Soyuz blocked' },
    ],
    images: [
      {
        src: '/sections/mir/mir-exterior.jpg',
        figureLabel: 'Mir · Orbital complex',
        caption: 'The Mir space station photographed from Space Shuttle Discovery during STS-63.',
        sourceDoc: 'NASA JSC photo STS063-708-095',
        credit: 'Credit: NASA/JSC · STS063-708-095',
      },
      {
        src: '/sections/mir/linenger-suit.jpg',
        figureLabel: 'Mir · Jerry Linenger',
        caption:
          'NASA astronaut Jerry Linenger checks a Russian Sokol pressure suit aboard Mir during the STS-81 increment.',
        sourceDoc: 'NASA JSC photo STS081-372-035',
        credit: 'Credit: NASA/JSC · STS081-372-035',
      },
      {
        src: '/sections/mir/mir-approach.jpg',
        figureLabel: 'Mir · Station stack',
        caption:
          'Mir’s modular stack with solar arrays against black space, photographed during the STS-63 rendezvous.',
        sourceDoc: 'NASA JSC photo STS063-712-068',
        credit: 'Credit: NASA/JSC · STS063-712-068',
      },
    ],
    starterPrompts: [
      'How did the Vika lithium perchlorate fire differ from normal microgravity diffusion flames?',
      'What egress, mask, and water-extinguisher condensation issues occurred during the 1997 Mir fire?',
      'How were SFOG oxygen generators redesigned for safer use on the ISS after Mir?',
    ],
  },
]

export function getMissionSection(id: SectionApiId): MissionSection {
  return MISSION_SECTIONS.find((section) => section.apiSection === id) ?? MISSION_SECTIONS[0]
}
