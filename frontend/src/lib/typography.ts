// Replace the space after short Russian prepositions/conjunctions
// with U+00A0 so they never end up alone at the end of a line.
// Use on display copy (headings, leads). Safe for paragraph text too.

const SHORT_WORDS = [
  // prepositions
  "в", "во", "к", "ко", "о", "об", "обо", "от", "ото",
  "по", "до", "на", "за", "из", "изо", "со", "с", "у",
  "для", "под", "над", "при", "без", "про",
  // conjunctions / particles
  "и", "а", "но", "не", "ни", "же", "ли", "то", "что",
  "или", "как",
];

const RE = new RegExp(
  `(^|[\\s(«„"\\-—–])(${SHORT_WORDS.join("|")})[ \\t]+`,
  "giu",
);

export function nbsp(input: string): string {
  return input.replace(RE, (_m, lead: string, word: string) => `${lead}${word}\u00A0`);
}
