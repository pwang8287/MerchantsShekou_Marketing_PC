const colors: Record<string, string> = {
  leads: '#4285f4',
  visitPeople: '#22abc0',
  subscriptionUnits: '#7274e0',
  contracts: '#9b78cf',
};

export function kpiColor(key: string): string {
  return colors[key] || colors.leads;
}
