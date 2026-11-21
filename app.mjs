import { demo, benchmark, pairs, classify, routes, approve } from './engine.mjs';

const get = id => document.getElementById(id);
let reports = [...demo];
let groups = [];
let rejected = new Set();
let nextId = 111;
const key = pair => [pair.left.id, pair.right.id].join('/');
function element(tag, value, className) {
  const node = document.createElement(tag);
  if (value) node.textContent = value;
  if (className) node.className = className;
  return node;
}
function button(label, action, className) {
  const node = element('button', label, className);
  node.type = 'button';
  node.onclick = action;
  return node;
}
function tell(text) {
  get('notice').textContent = text;
}
function reportView(report, className) {
  const node = element('p', '', className);
  const time = String(report.hour).padStart(2, '0') + ':00';
  const text = element('span', report.text);
  text.lang = /[\u0C80-\u0CFF]/.test(report.text) ? 'kn' : 'en';
  node.append(element('strong', [report.id, report.area, time].join(' · '), 'meta'), text);
  return node;
}
function render() {
  const method = get('method').value;
  const approvedTogether = pair => groups.some(group => group.includes(pair.left.id) && group.includes(pair.right.id));
  const candidates = pairs(reports).filter(pair => !approvedTogether(pair) && !rejected.has(key(pair)) &&
    (pair[method] || (method === 'ai' && pair.review)));
  const queue = get('queue');
  queue.replaceChildren();
  get('queue-info').textContent = candidates.length
    ? candidates.length + ' pairs awaiting a decision. Check both reports before approving.'
    : 'No pairs awaiting review in this view.';
  for (const pair of candidates) {
    const card = element('article', '', 'card');
    const proposed = pair[method];
    const title = proposed ? 'Suggested duplicate' : 'Needs review';
    const evidence = element('div', '', 'evidence');
    evidence.append(reportView(pair.left, 'report'), reportView(pair.right, 'report'));
    const routing = pair.type && pair.type === pair.otherType ? routes[pair.type] : 'Staff assignment needed';
    const reason = method === 'keyword'
      ? 'Shared words · same landmark · ' + pair.hours + 'h apart'
      : (proposed ? 'Same predicted issue type' : 'Unclear issue type') +
        ' · same landmark · ' + pair.hours + 'h apart';
    const actions = element('div', '', 'actions');
    actions.append(button('Approve merge', () => {
      try {
        groups = approve(groups, pair, reports, rejected);
        tell('Staff approved merge for ' + pair.left.id + ' and ' + pair.right.id + '.');
        render();
      } catch (error) {
        tell(error.message);
      }
    }, 'primary'), button('Keep separate', () => {
      rejected.add(key(pair));
      tell('Staff kept ' + pair.left.id + ' and ' + pair.right.id + ' separate.');
      render();
    }));
    card.append(element('h3', title), element('p', reason, 'meta'), evidence,
      element('p', 'Suggested route: ' + routing), actions);
    queue.append(card);
  }
  const groupList = get('groups');
  groupList.replaceChildren();
  if (!groups.length) groupList.append(element('p', 'Approved merges will appear here.'));
  for (const group of groups) {
    const card = element('article', '', 'card');
    const members = group.map(id => reports.find(report => report.id === id));
    const types = new Set(members.map(report => classify(report.text)));
    const type = [...types][0];
    const route = types.size === 1 && type ? routes[type] : 'Staff assignment needed';
    card.append(element('h3', members[0].area), element('p', group.join(' + ')),
      element('p', 'Route: ' + route), button('Undo group', () => {
        groups = groups.filter(item => item !== group);
        tell('The approved group was undone.');
        render();
      }));
    groupList.append(card);
  }
  get('reports').replaceChildren(...reports.map(report => reportView(report)));
}
for (const row of benchmark()) {
  const tr = element('tr');
  for (const value of [row.method === 'ai' ? 'AI classifier' : 'Keyword matching', row.tp, row.fn, row.fp]) {
    tr.append(element('td', String(value)));
  }
  get('metrics').append(tr);
}
get('method').onchange = render;
get('reset').onclick = () => {
  reports = [...demo];
  groups = [];
  rejected = new Set();
  nextId = 111;
  get('method').value = 'ai';
  tell('Demo data restored.');
  render();
};
get('add').onsubmit = event => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const area = data.get('area').trim();
  const text = data.get('text').trim();
  const hour = Number(data.get('hour'));
  if (!area || text.length < 8 || !Number.isInteger(hour) || hour < 0 || hour > 23) {
    tell('Provide a landmark, a valid hour, and at least eight characters.');
    return;
  }
  if (reports.length >= 60) {
    tell('Demo register is full. Reset it to add more complaints.');
    return;
  }
  reports.push({ id: 'C' + nextId++, area, text, hour });
  event.currentTarget.reset();
  tell('Complaint added.');
  render();
};
render();

