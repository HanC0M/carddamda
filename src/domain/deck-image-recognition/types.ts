export type DeckImageSourceHint = 'master_duel' | 'neuron' | 'unknown';

export type DeckSection = 'main' | 'extra' | 'side' | 'unknown';

export type RecognizedDeckCard = {
  searchTerm: string;
  quantity: number;
  confidence: number;
  section: DeckSection;
  sourceName: string | null;
  note: string | null;
};

export type UnresolvedDeckCard = {
  quantity: number;
  section: DeckSection;
  reason: string;
};

export type DeckImageRecognitionResponse = {
  sourceTemplate: DeckImageSourceHint;
  recognized: RecognizedDeckCard[];
  unresolved: UnresolvedDeckCard[];
  warnings: string[];
};

export type DeckImageRecognitionRequest = {
  imageDataUrl: string;
  sourceHint?: DeckImageSourceHint;
};
