// 气泡使用用户参考图中的彩色分类方案；与经营状态的红绿背景分开。
export const channelColors: Record<string, string> = {
  自然到访: '#4F8EFF',
  中介分销: '#F4A275',
  自渠自拓: '#91C98B',
  线上获客: '#A98BEA',
  老带新: '#E985BB',
  全面营销: '#55C5B4',
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
export function bubbleColor(name: string): string {
  const hash = [...name].reduce((value, char) => (value * 31 + char.charCodeAt(0)) % 65536, 0);
  return channelColors[name] || bubblePalette[hash % bubblePalette.length];
}
