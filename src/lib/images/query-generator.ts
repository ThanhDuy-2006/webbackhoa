/**
  * Normalizes a product name for searching and caching.
  */
export function normalizeProductName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, '');
}

/**
 * Generates a controlled, high-quality search query list (max 4 queries).
 * Prefer specific English grocery terms to yield accurate stock photo results.
 * Remove overly broad terms like "vegetable" or "fruit" alone.
 */
export function generateControlledSearchQueries(name: string): string[] {
  const normalized = normalizeProductName(name);

  // Common Vietnamese grocery dictionary to precise English queries
  const dictionary: Record<string, string[]> = {
    'củ cải trắng': ['daikon radish isolated', 'white radish vegetable', 'fresh daikon radish', 'daikon product photo'],
    'rau xà lách': ['fresh lettuce vegetable', 'head of lettuce isolated', 'green lettuce product', 'lettuce grocery'],
    'xà lách': ['fresh lettuce vegetable', 'head of lettuce isolated', 'green lettuce product', 'lettuce grocery'],
    'cà chua': ['fresh red tomato', 'whole tomato isolated', 'ripe tomato product', 'tomato grocery'],
    'cà rốt': ['fresh carrot vegetable', 'carrots isolated', 'raw carrot product', 'fresh carrots'],
    'khoai tây': ['fresh potato vegetable', 'raw potatoes isolated', 'potato grocery', 'fresh potatoes'],
    'hành tây': ['yellow onion vegetable', 'raw onion isolated', 'fresh onion product', 'onion grocery'],
    'tỏi': ['fresh garlic bulb', 'garlic cloves isolated', 'garlic product photo', 'raw garlic'],
    'thịt heo': ['raw pork meat', 'pork chop isolated', 'fresh pork product', 'raw pork cutlet'],
    'thịt bò': ['raw beef steak', 'fresh beef meat', 'raw beef product', 'beef steak isolated'],
    'thịt gà': ['raw chicken meat', 'fresh chicken breast', 'raw chicken product', 'whole raw chicken'],
    'cá hồi': ['fresh salmon fillet', 'raw salmon fish', 'salmon fillet isolated', 'fresh salmon steak'],
    'táo': ['fresh red apple', 'whole apple isolated', 'red apple product', 'fresh apples'],
    'chuối': ['fresh yellow banana', 'banana bunch isolated', 'banana product photo', 'ripe bananas'],
    'cam': ['fresh orange fruit', 'ripe orange isolated', 'fresh oranges product', 'orange fruit'],
  };

  for (const [viTerm, queries] of Object.entries(dictionary)) {
    if (normalized.includes(viTerm)) {
      return queries.slice(0, 4);
    }
  }

  // Fallback generation for unmapped terms (max 4 specific queries)
  const baseQuery = normalized;
  return [
    `${baseQuery} product photo`,
    `fresh ${baseQuery}`,
    `${baseQuery} isolated`,
    `${baseQuery} grocery`,
  ].slice(0, 4);
}
