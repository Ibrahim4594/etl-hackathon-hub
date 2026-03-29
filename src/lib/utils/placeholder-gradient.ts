const CATEGORY_GRADIENTS: Record<string, string> = {
  ai: "from-teal-500 to-blue-500",
  ml: "from-teal-500 to-blue-500",
  "ai/ml": "from-teal-500 to-blue-500",
  "artificial intelligence": "from-teal-500 to-blue-500",
  "machine learning": "from-teal-500 to-blue-500",
  fintech: "from-green-500 to-teal-500",
  finance: "from-green-500 to-teal-500",
  "open source": "from-cyan-500 to-teal-500",
  opensource: "from-cyan-500 to-teal-500",
  "web dev": "from-purple-500 to-pink-500",
  web: "from-purple-500 to-pink-500",
  frontend: "from-purple-500 to-pink-500",
  mobile: "from-orange-500 to-red-500",
  "mobile dev": "from-orange-500 to-red-500",
  iot: "from-yellow-500 to-orange-500",
  hardware: "from-yellow-500 to-orange-500",
  blockchain: "from-indigo-500 to-purple-500",
  web3: "from-indigo-500 to-purple-500",
  health: "from-rose-500 to-pink-500",
  healthcare: "from-rose-500 to-pink-500",
  cybersecurity: "from-red-500 to-orange-500",
  security: "from-red-500 to-orange-500",
  "data science": "from-blue-500 to-indigo-500",
  education: "from-emerald-500 to-teal-500",
  gaming: "from-violet-500 to-fuchsia-500",
  "game dev": "from-violet-500 to-fuchsia-500",
};

export function getCategoryGradient(category?: string | null): string {
  if (!category) return "from-primary to-primary/70";
  const key = category.toLowerCase().trim();
  return CATEGORY_GRADIENTS[key] ?? "from-primary to-primary/70";
}
