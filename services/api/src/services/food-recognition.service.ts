/**
 * Food Recognition Service
 *
 * Abstract interface for food detection from images.
 * Mock implementation included — swap provider for OpenAI Vision,
 * Google Cloud Vision, AWS Rekognition, etc.
 */

export interface DetectedFoodItem {
  name: string;
  quantity?: string;
  storageType: 'fridge' | 'freezer';
  estimatedExpiryDays?: number; // days from now (null = use lookup table)
  confidence: number; // 0–1
}

export interface FoodRecognitionResult {
  items: DetectedFoodItem[];
  rawText?: string; // OCR text extracted from image, if any
  provider: string;
}

export interface FoodRecognitionProvider {
  analyze(imageBuffer: Buffer, mimeType: string): Promise<FoodRecognitionResult>;
}

// ─── Expiry Lookup Table ─────────────────────────────────────────────────────
// Days until typical expiry: [fridge_days, freezer_days]
const EXPIRY_LOOKUP: Record<string, [number, number]> = {
  milk:                [7,   60],
  'skim milk':         [7,   60],
  'whole milk':        [7,   60],
  eggs:                [21,  365],
  butter:              [30,  270],
  cheese:              [21,  180],
  'cheddar cheese':    [28,  180],
  yogurt:              [14,   60],
  cream:               [5,    90],
  'sour cream':        [10,   90],
  chicken:             [2,   270],
  'chicken breast':    [2,   270],
  beef:                [3,   270],
  'ground beef':       [2,   120],
  pork:                [3,   180],
  fish:                [2,   180],
  salmon:              [2,   180],
  shrimp:              [2,   180],
  bacon:               [7,   30],
  sausage:             [3,   60],
  ham:                 [5,   60],
  turkey:              [3,   270],
  spinach:             [5,   365],
  lettuce:             [7,   365],
  tomato:              [5,   365],
  carrot:              [21,  365],
  broccoli:            [7,   365],
  cauliflower:         [7,   365],
  pepper:              [10,  365],
  'bell pepper':       [10,  365],
  cucumber:            [7,   365],
  celery:              [14,  365],
  onion:               [30,  365],
  garlic:              [30,  365],
  potato:              [21,  365],
  strawberry:          [5,   365],
  blueberry:           [10,  365],
  raspberry:           [3,   365],
  apple:               [30,  365],
  orange:              [14,  365],
  grape:               [7,   365],
  lemon:               [21,  365],
  lime:                [21,  365],
  mushroom:            [7,   365],
  corn:                [3,   365],
  peas:                [5,   365],
  'frozen pizza':      [60,  60],
  'ice cream':         [60,  60],
  'frozen vegetables': [7,   365],
  'frozen fruit':      [7,   365],
  juice:               [7,   60],
  'orange juice':      [7,   60],
  'apple juice':       [7,   60],
  beer:                [90,  365],
  wine:                [5,   365],
  'leftovers':         [3,   90],
  'cooked rice':       [4,   180],
  'cooked pasta':      [4,   90],
  cake:                [3,   90],
  bread:               [7,   90],
  tofu:                [5,   90],
  hummus:              [7,   60],
  salsa:               [14,  365],
  'soy sauce':         [90,  365],
  ketchup:             [90,  365],
  mayo:                [60,  365],
  mustard:             [90,  365],
  'hot sauce':         [90,  365],
  dressing:            [30,  365],
};

export function estimateExpiryDays(
  name: string,
  storageType: 'fridge' | 'freezer',
): number {
  const key = name.toLowerCase().trim();
  const entry =
    EXPIRY_LOOKUP[key] ??
    Object.entries(EXPIRY_LOOKUP).find(([k]) => key.includes(k) || k.includes(key))?.[1];
  if (entry) return storageType === 'freezer' ? entry[1] : entry[0];
  // Unknown item — conservative defaults
  return storageType === 'freezer' ? 180 : 7;
}

// ─── Mock Provider ────────────────────────────────────────────────────────────
// Returns plausible food items based on image size heuristic.
// Replace with real provider (OpenAI Vision, etc.) for production.

const COMMON_FRIDGE_ITEMS: DetectedFoodItem[] = [
  { name: 'milk',     quantity: '1 carton', storageType: 'fridge', confidence: 0.92 },
  { name: 'eggs',     quantity: '6 eggs',   storageType: 'fridge', confidence: 0.88 },
  { name: 'cheese',   quantity: '1 block',  storageType: 'fridge', confidence: 0.85 },
  { name: 'yogurt',   quantity: '2 cups',   storageType: 'fridge', confidence: 0.80 },
  { name: 'spinach',  quantity: '1 bag',    storageType: 'fridge', confidence: 0.75 },
  { name: 'chicken breast', quantity: '500g', storageType: 'fridge', confidence: 0.83 },
  { name: 'carrot',   quantity: '4 pieces', storageType: 'fridge', confidence: 0.78 },
  { name: 'butter',   quantity: '1 pack',   storageType: 'fridge', confidence: 0.82 },
];

const COMMON_FREEZER_ITEMS: DetectedFoodItem[] = [
  { name: 'frozen vegetables', quantity: '1 bag', storageType: 'freezer', confidence: 0.90 },
  { name: 'ice cream',         quantity: '1 tub',  storageType: 'freezer', confidence: 0.87 },
  { name: 'frozen pizza',      quantity: '1 box',  storageType: 'freezer', confidence: 0.85 },
  { name: 'chicken',           quantity: '1kg',    storageType: 'freezer', confidence: 0.82 },
  { name: 'shrimp',            quantity: '500g',   storageType: 'freezer', confidence: 0.78 },
];

class MockFoodRecognitionProvider implements FoodRecognitionProvider {
  async analyze(imageBuffer: Buffer, _mimeType: string): Promise<FoodRecognitionResult> {
    // Use image buffer size to seed pseudo-random selection
    const seed = imageBuffer.length % 1000;
    const isFreezer = seed % 3 === 0;
    const pool = isFreezer ? COMMON_FREEZER_ITEMS : COMMON_FRIDGE_ITEMS;
    const count = 2 + (seed % 4); // 2–5 items
    const items = pool.slice(0, count);

    return {
      items,
      rawText: undefined,
      provider: 'mock',
    };
  }
}

// ─── Singleton factory ────────────────────────────────────────────────────────

let _provider: FoodRecognitionProvider | null = null;

export function getFoodRecognitionProvider(): FoodRecognitionProvider {
  if (!_provider) {
    // TODO: swap for real provider when credentials available
    // e.g. import { OpenAIVisionProvider } from './providers/openai-vision';
    // _provider = new OpenAIVisionProvider(process.env.OPENAI_API_KEY!);
    _provider = new MockFoodRecognitionProvider();
  }
  return _provider;
}
