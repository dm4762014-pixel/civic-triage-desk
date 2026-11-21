const training = [
  ['water', 'Pipe burst|Water flowing from a broken main|Leaking water line|Water leaking onto street|ನೀರಿನ ಪೈಪ್ ಒಡೆದಿದೆ|ನೀರು ರಸ್ತೆಗೆ ಹರಿಯುತ್ತಿದೆ|ಕುಡಿಯುವ ನೀರಿನ ಸೋರಿಕೆ'],
  ['road', 'Deep pothole on street|Damaged road surface|Large hole in asphalt|ರಸ್ತೆಯಲ್ಲಿ ಗುಂಡಿ|ರಸ್ತೆ ಹಾಳಾಗಿದೆ|ದೊಡ್ಡ ಗುಂಡಿ ಬಿದ್ದಿದೆ'],
  ['waste', 'Garbage not collected|Rubbish dumped near homes|Overflowing waste bins|ಕಸ ತೆಗೆದುಕೊಂಡು ಹೋಗಿಲ್ಲ|ಕಸದ ರಾಶಿ|ಕಸದ ಬುಟ್ಟಿ ತುಂಬಿದೆ'],
  ['light', 'Streetlight not working|Lamp is dark at night|Broken street lamp|ಬೀದಿ ದೀಪ ಕೆಟ್ಟಿದೆ|ರಸ್ತೆ ದೀಪ ಉರಿಯುತ್ತಿಲ್ಲ|ಬೀದಿ ದೀಪ ಕೆಲಸ ಮಾಡುತ್ತಿಲ್ಲ']
];
const words = text => text.normalize('NFC').toLowerCase().match(/[\p{L}\p{M}\p{N}]+/gu) || [];
function features(text) {
  return new Set(words(text).flatMap(word => {
    const letters = Array.from(word);
    return [word, ...letters.slice(0, -2).map((_, i) => letters.slice(i, i + 3).join(''))];
  }));
}

const examples = training.flatMap(([label, phrases]) =>
  phrases.split('|').map(phrase => ({ label, vector: features(phrase) })));
function similarity(a, b) {
  if (!a.size || !b.size) return 0;
  return [...a].filter(value => b.has(value)).length / Math.sqrt(a.size * b.size);
}
export function classify(text) {
  const vector = features(text);
  const scores = training.map(([label]) => ({
    label,
    score: Math.max(...examples.filter(example => example.label === label)
      .map(example => similarity(vector, example.vector)))
  })).sort((a, b) => b.score - a.score);
  return scores[0].score >= .23 && scores[0].score - scores[1].score >= .08 ? scores[0].label : null;
}
export const routes = {
  water: 'Water supply', road: 'Road maintenance', waste: 'Solid waste', light: 'Street lighting'
};

export const demo = [
  { id: 'C101', area: 'Library Gate', hour: 9, text: 'A broken water pipe is flooding the pavement.', incident: 'A' },
  { id: 'C102', area: 'Library Gate', hour: 10, text: 'ನೀರಿನ ಪೈಪ್ ಒಡೆದು ರಸ್ತೆಗೆ ನೀರು ಹರಿಯುತ್ತಿದೆ.', incident: 'A' },
  { id: 'C103', area: 'Library Gate', hour: 11, text: 'Water leaking from a pipe beside the entrance.', incident: 'A' },
  { id: 'C104', area: 'Library Gate', hour: 10, text: 'There is a deep pothole beside the pavement.', incident: 'B' },
  { id: 'C105', area: 'Market Junction', hour: 10, text: 'ಕಸದ ಬುಟ್ಟಿ ತುಂಬಿ ರಸ್ತೆಗೆ ಕಸ ಬಿದ್ದಿದೆ.', incident: 'C' },
  { id: 'C106', area: 'Market Junction', hour: 11, text: 'The waste bins are overflowing outside the market.', incident: 'C' },
  { id: 'C107', area: 'Market Junction', hour: 11, text: 'The street lamp is broken and the crossing is dark.', incident: 'D' },
  { id: 'C108', area: 'Library Gate', hour: 21, text: 'A different water pipe is leaking by the back entrance.', incident: 'E' },
  { id: 'C109', area: 'Market Junction', hour: 12, text: 'Something is blocking the side entrance.', incident: 'F' },
  { id: 'C110', area: 'Market Junction', hour: 12, text: 'Something is blocking the side entrance by the shop.', incident: 'G' }
];
const stop = new Set('a the is there and at by are from outside for in of to near beside'.split(' '));
function keywordVector(text) {
  return new Set(words(text).filter(word => !stop.has(word)));
}

export function compare(left, right) {
  const nearby = left.area.trim().toLowerCase() === right.area.trim().toLowerCase();
  const hours = Math.abs(left.hour - right.hour);
  const type = classify(left.text);
  const otherType = classify(right.text);
  const window = nearby && hours <= 3;
  return {
    ai: Boolean(window && type && type === otherType),
    keyword: window && similarity(keywordVector(left.text), keywordVector(right.text)) >= .4,
    review: window && (!type || !otherType),
    type, otherType, nearby, hours
  };
}

export function pairs(reports) {
  return reports.flatMap((left, index) => reports.slice(index + 1).map(right => ({
    left, right, ...compare(left, right)
  })));
}

export function benchmark() {
  const labeled = pairs(demo);
  return ['ai', 'keyword'].map(method => {
    const counts = { method, tp: 0, fp: 0, fn: 0, tn: 0 };
    for (const pair of labeled) {
      const same = pair.left.incident === pair.right.incident;
      counts[pair[method] ? (same ? 'tp' : 'fp') : (same ? 'fn' : 'tn')]++;
    }
    return counts;
  });
}

// A merge is committed only from a staff action. Every cross-pair of a
// proposed group must stay within the shared location and time window.
export function approve(groups, pair, reports, rejected = new Set()) {
  if (!pair.ai && !pair.review && !pair.keyword) throw new Error('This pair is outside the review queue.');
  const left = groups.find(group => group.includes(pair.left.id)) || [pair.left.id];
  const right = groups.find(group => group.includes(pair.right.id)) || [pair.right.id];
  if (left === right) throw new Error('Already grouped.');
  const ids = [...left, ...right];
  const members = ids.map(id => reports.find(report => report.id === id));
  if (pairs(members).some(item => rejected.has([item.left.id, item.right.id].sort().join('/'))
      || !item.nearby || item.hours > 3 ||
      (item.type && item.otherType && item.type !== item.otherType))) {
    throw new Error('The combined group has conflicting reports. Review separately.');
  }
  return [...groups.filter(group => group !== left && group !== right), ids];
}

