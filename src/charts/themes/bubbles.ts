// 气泡使用用户参考图中的彩色分类方案；与经营状态的红绿背景分开。
export const channelColors: Record<string, string> = {
  自然到访: '#4F8EFF',
  中介分销: '#F4A275',
  自渠自拓: '#91C98B',
  线上获客: '#A98BEA',
  老带新: '#E985BB',
  全民营销: '#55C5B4',
  其他: '#E8B868',
};
export const bubblePalette = [
  '#4F8EFF',
  '#55C5B4',
  '#91C98B',
  '#A98BEA',
  '#E985BB',
  '#F4A275',
  '#E8B868',
  '#55BFD7',
];
// 多维分析采用参考图中鲜明的多色城市分类，避免相邻城市仅有深浅差异。
export const conversionMatrixPalette = [
  '#486DE6',
  '#8B50F5',
  '#16B98A',
  '#FFA633',
  '#E13CCF',
  '#34ADE2',
  '#EF642F',
  '#14A597',
  '#9D26C8',
  '#E52E80',
  '#42C83D',
  '#3D32D8',
  '#30C5CC',
  '#C8D52D',
  '#D19318',
  '#21A04C',
];
export function bubbleColor(name: string): string {
  const hash = [...name].reduce((value, char) => (value * 31 + char.charCodeAt(0)) % 65536, 0);
  return channelColors[name] || bubblePalette[hash % bubblePalette.length];
}
