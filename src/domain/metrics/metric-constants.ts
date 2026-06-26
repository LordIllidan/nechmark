export const STOP_WORDS = new Set([
  "a","an","the","and","or","but","in","on","at","to","for","of","with","by",
  "from","is","are","was","were","be","been","being","have","has","had","do",
  "does","did","will","would","could","should","may","might","must","shall",
  "can","need","that","this","it","its","they","them","their","we","our",
  "as","so","if","then","when","where","which","who","what","how","all","any",
  "both","each","few","more","most","other","some","such","no","not","only",
  "own","same","than","too","very","just","user","system","able","allow",
  "display","show",
]);

export const VAGUE_WORDS = new Set([
  "easy","fast","quickly","slow","simple","friendly","smooth","reliable",
  "robust","flexible","scalable","efficient","effective","seamlessly",
  "intuitively","user-friendly","appropriate","adequate","reasonable",
  "sufficient","good","bad","nice","better","best","various","several",
  "some","many","few","large","small","high","low","quickly","easily",
  "regularly","often","sometimes","usually","typically","generally",
  "approximately","about","around","roughly","nearly",
]);

export const MEASURABLE_PATTERNS = [
  /\d+\s*(ms|sec|s|min|hour|h|day|%|kb|mb|gb|px|rpm|rps)/i,
  /[<>≤≥]=?\s*\d+/,
  /\d+\s*(attempt|try|tries|request|item|result|character|char)/i,
  /within\s+\d+/i,
  /at least\s+\d+/i,
  /no more than\s+\d+/i,
  /maximum\s+\d+/i,
  /minimum\s+\d+/i,
  /exactly\s+\d+/i,
  /\d+\s*(concurrent|simultaneous)/i,
];

export const GHERKIN_PATTERNS = [
  /\bgiven\b.*\bwhen\b.*\bthen\b/is,
  /^given\b/im,
  /^when\b/im,
  /^then\b/im,
];

export const MULTI_ACTION_PATTERN = /\b(and also|as well as|in addition to|and then|also)\b/i;

export const PASSIVE_PATTERN = /\b(is|are|was|were|been|be|being)\s+\w+(?:ed|en)\b/i;

export const MANDATORY_MODALS = new Set(["must", "shall"]);
export const RECOMMENDED_MODALS = new Set(["should"]);
export const OPTIONAL_MODALS = new Set(["may", "can", "could", "might"]);

export const SUBORDINATE_CONJUNCTIONS = [
  "when","if","because","although","since","while","unless","after","before",
  "until","as","though","even if","even though","so that","in order that",
  "provided that","assuming that","given that","in case","whenever","wherever",
];

export const SYNONYM_GROUPS: Array<{ canonical: string; variants: string[] }> = [
  { canonical: "user",         variants: ["customer","client","actor","person","member","account holder"] },
  { canonical: "system",       variants: ["application","app","platform","service","backend","api"] },
  { canonical: "display",      variants: ["show","render","present","view","visualize"] },
  { canonical: "error",        variants: ["failure","fault","exception","issue","problem","bug"] },
  { canonical: "create",       variants: ["add","generate","make","produce","build","set up"] },
  { canonical: "delete",       variants: ["remove","destroy","erase","clear","purge"] },
  { canonical: "update",       variants: ["edit","modify","change","alter","revise"] },
  { canonical: "validate",     variants: ["verify","check","confirm","authenticate","authorize"] },
  { canonical: "notification", variants: ["alert","message","email","reminder","notice"] },
  { canonical: "login",        variants: ["sign in","log in","authenticate","access"] },
];
