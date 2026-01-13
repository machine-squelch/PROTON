export type AtomType = 'Hydrogen' | 'Helium' | 'Lithium' | 'Carbon' | 'Oxygen';
// EntityType is intentionally broad so we can randomize lifeforms and cosmic subjects without Google-specific constraints.
export type EntityType = string;

export interface WaveParams {
  wavelength: number;
  amplitude: number;
}

export interface QuantumState {
  isCollapsing: boolean;
  isCollapsed: boolean;
  collapsedImage: string | null;
  explanation: string | null;
  error: string | null;
}

export interface AtomData {
  protons: number;
  neutrons: number;
  electrons: { radius: number; speed: number }[];
}

export const ATOM_CONFIGS: Record<AtomType, AtomData> = {
  'Hydrogen': {
    protons: 1,
    neutrons: 0,
    electrons: [{ radius: 1.5, speed: 1.2 }]
  },
  'Helium': {
    protons: 2,
    neutrons: 2,
    electrons: [
      { radius: 1.5, speed: 1.5 },
      { radius: 1.5, speed: -1.5 }
    ]
  },
  'Lithium': {
    protons: 3,
    neutrons: 4,
    electrons: [
      { radius: 1.5, speed: 1.5 },
      { radius: 1.5, speed: -1.5 },
      { radius: 2.8, speed: 0.8 }
    ]
  },
  'Carbon': {
    protons: 6,
    neutrons: 6,
    electrons: [
      { radius: 1.5, speed: 1.8 },
      { radius: 1.5, speed: -1.8 },
      { radius: 3.2, speed: 1.1 },
      { radius: 3.2, speed: -1.1 },
      { radius: 3.2, speed: 0.9 },
      { radius: 3.2, speed: -0.9 }
    ]
  },
  'Oxygen': {
    protons: 8,
    neutrons: 8,
    electrons: [
      { radius: 1.5, speed: 2.0 },
      { radius: 1.5, speed: -2.0 },
      { radius: 3.5, speed: 1.4 },
      { radius: 3.5, speed: -1.4 },
      { radius: 3.5, speed: 1.2 },
      { radius: 3.5, speed: -1.2 },
      { radius: 3.5, speed: 1.0 },
      { radius: 3.5, speed: -1.0 }
    ]
  }
};
