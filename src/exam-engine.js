/** Pure, framework-independent exam state and conservative IOS simulation grading. */
const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
const kind = q => /cli/i.test(q.format) ? 'cli' : /matching/i.test(q.format) ? 'matching' : /ordering/i.test(q.format) ? 'ordering' : /multiple-answer/i.test(q.format) ? 'multiple' : 'single';
const letters = value => Array.isArray(value) ? value.map(v => String(v).trim().toUpperCase()) : (String(value ?? '').toUpperCase().match(/[A-Z]+/g) ?? []).flatMap(v => v.split(''));
const empty = value => value == null || value === '' || (Array.isArray(value) && value.length === 0) || (typeof value === 'object' && Object.values(value).every(v => !String(v ?? '').trim()));

export function normalizeResponse(question, input) {
  if (input == null) return null;
  const type = kind(question);
  if (type === 'cli') return (Array.isArray(input) ? input.join('\n') : String(input)).trim();
  if (type === 'multiple') return [...new Set(letters(input))].sort();
  if (type === 'ordering') {
    const text = String(input).trim();
    if (!Array.isArray(input) && /dhcp/i.test(text)) {
      const names = text.toUpperCase().match(/DHCP(?:DISCOVER|OFFER|REQUEST|ACK)/g) ?? [];
      return names.map(name => Object.keys(question.options).find(k => question.options[k].toUpperCase() === name) ?? name);
    }
    return letters(input);
  }
  if (type === 'single') return String(input).trim().toUpperCase().replace(/^(?:OPTION|ANSWER)\s*:?\s*/, '').replace(/[.)]$/, '');
  const aliases = question.id === 5
    ? { 'global unicast': 'A', 'link local': 'B', 'unique local': 'C' }
    : question.id === 19 ? { '192.0.2.2': 'A', '192.0.2.6': 'B', '192.0.2.10': 'C' } : {};
  const mapValue = value => {
    const text = String(value ?? '').trim().replace(/`/g, '').replace(/-/g, ' ').replace(/\s+/g, ' ').toLowerCase();
    return aliases[text] ?? text.toUpperCase();
  };
  if (typeof input === 'object' && !Array.isArray(input)) return Object.fromEntries(Object.entries(input).map(([key, value]) => [key, mapValue(value)]));
  if (Array.isArray(input)) return Object.fromEntries(input.map((v, i) => [String(i + 1), mapValue(v)]));
  const text = String(input).trim();
  const compactNumbered = [...text.matchAll(/(?:^|[,;\s]+)([1-9])([A-Za-z])(?=$|[,;\s])/g)];
  if (compactNumbered.length > 0) return Object.fromEntries(compactNumbered.map(m => [m[1], mapValue(m[2])]));
  const numbered = [...text.matchAll(/(?:^|[,;\n]\s*|\s+)([1-9])(?:\s*[-=:.]\s*|\s+)(.*?)(?=(?:[,;\n]\s*|\s+)[1-9](?:\s*[-=:.]\s*|\s+)|$)/g)];
  if (numbered.length > 0) return Object.fromEntries(numbered.map(m => [m[1], mapValue(m[2])]));
  const values = /^[A-Za-z\s,;>\-]+$/.test(text) && !Object.keys(aliases).some(a => text.toLowerCase().includes(a)) ? letters(text) : text.split(/[,;\n]/).map(mapValue);
  return Object.fromEntries(values.map((v, i) => [String(i + 1), v]));
}

export function createSession(questions, { carryOver = false } = {}) {
  const ids = questions.map(q => q.id);
  const resume = carryOver && ids[0] === 1 && ids[1] === 2;
  return { version: 1, questionIds: ids, currentIndex: resume ? 1 : 0, answers: resume ? { 1: 'A' } : {}, skippedIds: [], viewedIds: ids.length ? (resume ? [1, 2] : [ids[0]]) : [], mode: 'exam', status: ids.length ? 'active' : 'finished', startedAt: new Date().toISOString(), finishedAt: null, selfAssessments: {} };
}
const validResumeIndex = (session, index) => Number.isInteger(index) && index >= 0 && index <= session.questionIds.length && (index === session.questionIds.length || session.viewedIds.includes(session.questionIds[index]));
/** Revisit only questions already presented, preserving the forward position. */
export function revisitQuestion(session, id) {
  if (session.status !== 'active') return session;
  const index = session.questionIds.indexOf(id);
  if (index < 0 || !session.viewedIds.includes(id) || index === session.currentIndex) return session;
  if (!validResumeIndex(session, session.currentIndex) || (Object.hasOwn(session, 'resumeIndex') && !validResumeIndex(session, session.resumeIndex))) return session;
  if (index === session.resumeIndex) return returnToExam(session);
  const next = clone(session);
  if (!Object.hasOwn(next, 'resumeIndex')) next.resumeIndex = next.currentIndex;
  next.currentIndex = index;
  return next;
}
/** Return from a revisit without changing answers or presenting a new question. */
export function returnToExam(session) {
  if (session.status !== 'active' || !Object.hasOwn(session, 'resumeIndex') || !validResumeIndex(session, session.resumeIndex)) return session;
  const next = clone(session);
  next.currentIndex = next.resumeIndex;
  delete next.resumeIndex;
  return next;
}
function advance(session, question, response, skip) {
  if (session.status !== 'active' || session.questionIds[session.currentIndex] !== question.id) return session;
  const next = clone(session);
  if (skip) {
    delete next.answers[question.id];
    next.skippedIds = [...new Set([...next.skippedIds, question.id])];
  } else {
    next.answers[question.id] = normalizeResponse(question, response);
    next.skippedIds = next.skippedIds.filter(id => id !== question.id);
  }
  if (next.selfAssessments) delete next.selfAssessments[question.id];
  if (Object.hasOwn(next, 'resumeIndex')) return returnToExam(next);
  next.currentIndex += 1;
  if (next.currentIndex < next.questionIds.length) next.viewedIds = [...new Set([...next.viewedIds, next.questionIds[next.currentIndex]])];
  return next;
}
export const recordAnswer = (session, question, answer) => empty(normalizeResponse(question, answer)) ? session : advance(session, question, answer, false);
export const skipQuestion = (session, question) => advance(session, question, null, true);
export function finishSession(session) { return { ...clone(session), status: 'finished', finishedAt: session.finishedAt ?? new Date().toISOString() }; }
export function setMode(session, mode) { return ['exam', 'study'].includes(mode) ? { ...clone(session), mode } : session; }
/** User self-assessment is explicit and only resolves an unsupported CLI answer. */
export function reviewAnswer(session, question, correct) {
  if (gradeQuestion(question, session.answers[question.id]).status !== 'needs-review' || typeof correct !== 'boolean') return session;
  return { ...clone(session), selfAssessments: { ...session.selfAssessments, [question.id]: correct } };
}

export function gradeQuestion(question, answer) {
  const normalizedAnswer = normalizeResponse(question, answer);
  if (empty(normalizedAnswer)) return { status: 'unanswered', correct: null, points: 0, normalizedAnswer };
  if (kind(question) === 'cli') return { ...gradeCLI(question, normalizedAnswer), normalizedAnswer, rubric: question.rubric };
  const expected = normalizeResponse(question, question.correct_answer);
  const correct = kind(question) === 'matching'
    ? Object.keys(expected).length === Object.keys(normalizedAnswer).length && Object.entries(expected).every(([key, value]) => normalizedAnswer[key] === value)
    : JSON.stringify(expected) === JSON.stringify(normalizedAnswer);
  return { status: correct ? 'correct' : 'incorrect', correct, points: Number(correct), normalizedAnswer };
}

/** Non-overlapping progress counts, without grading or revealing answers. */
export function getProgressCounts(session) {
  const counts = { answered: 0, unanswered: 0, skipped: 0, unpresented: 0 };
  for (const id of session.questionIds) {
    if (!empty(session.answers[id])) counts.answered += 1;
    else if (session.skippedIds.includes(id)) counts.skipped += 1;
    else if (session.viewedIds.includes(id)) counts.unanswered += 1;
    else counts.unpresented += 1;
  }
  return counts;
}

export function getResults(questions, session) {
  const rows = questions.map(question => {
    const answer = session.answers[question.id] ?? null;
    let grade = gradeQuestion(question, answer);
    if (grade.status === 'unanswered') {
      grade = { ...grade, status: session.skippedIds.includes(question.id) ? 'skipped' : !session.viewedIds.includes(question.id) ? 'unpresented' : 'unanswered' };
    }
    const selfAssessed = grade.status === 'needs-review' && typeof session.selfAssessments?.[question.id] === 'boolean';
    if (selfAssessed) {
      const correct = session.selfAssessments[question.id];
      grade = { ...grade, status: correct ? 'correct' : 'incorrect', correct, points: Number(correct) };
    }
    return { question, answer, ...grade, selfAssessed };
  });
  const count = status => rows.filter(row => row.status === status).length;
  const correct = count('correct'), incorrect = count('incorrect'), needsReview = count('needs-review');
  const attempted = correct + incorrect + needsReview;
  const cliAttempted = rows.filter(row => kind(row.question) === 'cli' && !empty(row.answer)).length;
  const topicNames = [...new Set(questions.map(q => q.domain ?? q.topic))];
  const topics = topicNames.map(topic => {
    const group = rows.filter(r => (r.question.domain ?? r.question.topic) === topic);
    const attempts = group.filter(r => !empty(r.answer)).length;
    const right = group.filter(r => r.status === 'correct').length;
    return { topic, attempted: attempts, correct: right, accuracy: attempts ? 100 * right / attempts : null, needsReview: group.filter(r => r.status === 'needs-review').length, total: group.length, sources: [...new Set(group.flatMap(r => r.question.sources ?? []))], sourceSections: [...new Set(group.flatMap(r => r.question.source_sections ?? []))] };
  });
  return { total: questions.length, maxScore: questions.length, correct, incorrect, skipped: count('skipped'), unanswered: count('unanswered'), unpresented: count('unpresented'), needsReview, cliAttempted, attempted, accuracy: attempted ? 100 * correct / attempted : null, score: correct, percentage: questions.length ? 100 * correct / questions.length : 0, provisional: needsReview > 0, selfAssessed: rows.filter(r => r.selfAssessed).length, questions: rows, topics };
}

// This is a bounded command interpreter, not an IOS emulator. Unrecognized syntax
// is deferred to rubric review instead of being confidently marked wrong.
const prefix = (token, word, minimum = 1) => typeof token === 'string' && token.length >= minimum && word.startsWith(token);
const ipv4 = value => /^\d{1,3}(\.\d{1,3}){3}$/.test(value ?? '') && value.split('.').every(v => +v <= 255);
const ipNumber = value => value.split('.').reduce((sum, octet) => sum * 256 + Number(octet), 0);
const interfaceName = text => String(text ?? '').toLowerCase().replace(/^[a-z]+/, name => 'gigabitethernet'.startsWith(name) ? 'gi' : 'fastethernet'.startsWith(name) ? 'fa' : name);
const validInterface = value => /^(gi|fa)\d+(\/\d+)+(\.\d+)?$/.test(value);
const isInterface = value => /^(?:g(?:i|igabitEthernet)?|f(?:a|astEthernet)?)\d/i.test(value ?? '');
const grade = (status, reason) => ({ status, correct: status === 'needs-review' ? null : status === 'correct', points: status === 'needs-review' ? null : Number(status === 'correct'), reason });
const interfaceState = (state, name) => state.interfaces[name] ?? (state.interfaces[name] = { address: null, mask: null, enabled: !(state.id === 8 && name === 'gi0/1'), vlan: null, native: false, nat: null, filters: {} });
function commands(text) {
  return text.split(/\r?\n|;/).map(line => line.trim()).filter(line => line && !line.startsWith('```') && !line.startsWith('!') && !line.startsWith('#')).map(line => line.replace(/^[\w.-]+(?:\([^)]*\))?[#>]\s*/, '').trim()).filter(Boolean);
}
function gradeCLI(question, text) {
  const state = { id: question.id, context: question.id === 8 ? 'exec' : 'global', current: null, interfaces: {}, acls: {}, routes: [], natRules: [], unknown: [], invalid: [], violations: [], routing: true };
  for (const line of commands(text)) interpret(state, line);
  if (state.unknown.length) return grade('needs-review', 'This command form needs rubric review. The local simulator cannot reliably evaluate every valid IOS equivalent.');
  if (state.invalid.length) return grade('incorrect', 'One or more commands are invalid in the submitted configuration context.');
  if (state.violations.length) return grade('incorrect', 'The commands change configuration that the task requires preserving.');
  const enabled = name => state.interfaces[name]?.enabled !== false;
  let correct = false;
  if (question.id === 8) {
    const i = state.interfaces['gi0/1'];
    correct = !!i && i.address === '192.168.72.1' && i.mask === '255.255.255.224' && i.enabled;
  } else if (question.id === 10) {
    const subinterfaces = Object.entries(state.interfaces).filter(([name]) => /^gi0\/0\.[1-9]\d*$/.test(name));
    correct = state.routing && enabled('gi0/0') && [40, 50].every(vlan => subinterfaces.some(([, i]) => i.vlan === vlan && !i.native && i.enabled && i.address === `10.${vlan}.0.1` && i.mask === '255.255.255.0'));
    if (Object.values(state.interfaces).some(i => i.vlan && [40, 50].includes(i.vlan)) && new Set(subinterfaces.map(([, i]) => i.vlan)).size !== subinterfaces.filter(([, i]) => i.vlan).length) return grade('needs-review', 'Duplicate VLAN encapsulations need review against IOS subinterface constraints.');
  } else if (question.id === 17) {
    correct = state.routes.length === 1 && state.routes[0].network === '10.90.40.0' && state.routes[0].mask === '255.255.255.0' && state.routes[0].nextHop === '192.0.2.2' && state.routes[0].distance === 130 && (!state.routes[0].interface || state.routes[0].interface === 'gi0/2');
  } else if (question.id === 24) {
    const acl = state.acls['17'];
    const aclCorrect = acl && acl.type === 'standard' && standardPolicy(acl.rules);
    if (aclCorrect === null) return grade('needs-review', 'This ACL form requires rubric review.');
    correct = state.interfaces['gi0/0']?.nat === 'inside' && state.interfaces['gi0/1']?.nat === 'outside' && enabled('gi0/0') && enabled('gi0/1') && !!aclCorrect && state.natRules.length === 1 && state.natRules[0].list === '17' && state.natRules[0].interface === 'gi0/1' && state.natRules[0].overload;
  } else if (question.id === 28) {
    const acl = state.acls.STAFF_FILTER;
    const policy = acl && acl.type === 'extended' ? extendedPolicy(acl.rules) : false;
    if (policy === null) return grade('needs-review', 'This ACL form requires rubric review.');
    correct = !!policy && state.interfaces['gi0/0']?.filters.in === 'STAFF_FILTER' && enabled('gi0/0') && enabled('gi0/1') && state.routing;
  } else return grade('needs-review', 'Use the source-backed rubric to review this CLI answer.');
  return grade(correct ? 'correct' : 'incorrect', correct ? 'The submitted commands satisfy every required outcome.' : 'The final configuration does not satisfy every required outcome.');
}
function interpret(s, original) {
  let raw = original.split(/\s+/);
  let t = raw.map(token => token.toLowerCase());
  let negate = t[0] === 'no';
  if (negate) { t = t.slice(1); raw = raw.slice(1); }
  const unknown = () => s.unknown.push(original);
  const invalid = () => s.invalid.push(original);
  if (!t.length) return invalid();
  if (prefix(t[0], 'enable', 2) && t.length === 1 && !negate) return;
  if (prefix(t[0], 'configure', 4) && prefix(t[1], 'terminal', 1) && t.length === 2 && !negate) { s.context = 'global'; s.current = null; return; }
  if (prefix(t[0], 'end', 2) && t.length === 1 && !negate) { s.context = 'exec'; s.current = null; return; }
  if (prefix(t[0], 'exit', 2) && t.length === 1 && !negate) { s.context = s.context === 'global' ? 'exec' : 'global'; s.current = null; return; }
  if (t[0] === 'do') { t = t.slice(1); raw = raw.slice(1); }
  if (prefix(t[0], 'show', 2) && !negate) return;
  if (prefix(t[0], 'write', 2) || prefix(t[0], 'copy', 3)) {
    const save = !negate && ((prefix(t[0], 'write', 2) && (t.length === 1 || (prefix(t[1], 'memory', 1) && t.length === 2))) || (prefix(t[0], 'copy', 3) && prefix(t[1], 'running-config', 3) && prefix(t[2], 'startup-config', 3) && t.length === 3));
    if (save) return;
    return unknown();
  }
  if (s.context === 'exec') return invalid();
  if (prefix(t[0], 'interface', 3)) {
    const name = interfaceName(t.slice(1).join(''));
    if (!validInterface(name)) return unknown();
    if (negate) { delete s.interfaces[name]; s.context = 'global'; s.current = null; return; }
    s.context = 'interface'; s.current = name; interfaceState(s, name); return;
  }
  if (prefix(t[0], 'ip', 2) && prefix(t[1], 'routing', 4) && t.length === 2) { s.routing = !negate; if (s.id === 24 && negate) s.violations.push(original); return; }
  if (prefix(t[0], 'ip', 2) && prefix(t[1], 'access-list', 6)) {
    if (t.length !== 4) return unknown();
    const type = prefix(t[2], 'standard', 2) ? 'standard' : prefix(t[2], 'extended', 2) ? 'extended' : null;
    if (!type) return unknown();
    const name = raw[3];
    if (negate) { delete s.acls[name]; s.context = 'global'; s.current = null; return; }
    if (s.acls[name] && s.acls[name].type !== type) return invalid();
    s.acls[name] ??= { type, rules: [] }; s.context = 'acl'; s.current = name; return;
  }
  if (prefix(t[0], 'access-list', 6)) {
    const name = t[1];
    if (!/^\d+$/.test(name)) return unknown();
    if (negate) {
      if (t.length === 2) delete s.acls[name]; else unknown();
      return;
    }
    const n = +name, type = (n >= 1 && n <= 99) || (n >= 1300 && n <= 1999) ? 'standard' : 'extended';
    const rule = parseRule(t.slice(2), type);
    if (!rule) return unknown();
    s.acls[name] ??= { type, rules: [] }; s.acls[name].rules.push({ ...rule, sequence: nextSequence(s.acls[name].rules) }); return;
  }
  if (prefix(t[0], 'ip', 2) && prefix(t[1], 'route', 2)) {
    if (s.id === 24) s.violations.push(original);
    let rest = t.slice(2), iface = null;
    const network = rest.shift(), mask = rest.shift();
    if (!ipv4(network) || !ipv4(mask)) return unknown();
    if (isInterface(rest[0])) iface = interfaceName(rest.shift());
    const nextHop = ipv4(rest[0]) ? rest.shift() : null;
    const distance = rest.length && /^\d+$/.test(rest[0]) ? +rest.shift() : 1;
    if (rest.length || (!iface && !nextHop)) return unknown();
    const route = { network, mask, nextHop, distance, interface: iface };
    if (negate) s.routes = s.routes.filter(r => JSON.stringify(r) !== JSON.stringify(route)); else s.routes.push(route);
    return;
  }
  if (prefix(t[0], 'ip', 2) && t[1] === 'nat' && prefix(t[2], 'inside', 3) && prefix(t[3], 'source', 1)) {
    if (!prefix(t[4], 'list', 1) || !/^\d+$/.test(t[5] ?? '') || !prefix(t[6], 'interface', 3)) return unknown();
    const rule = { list: t[5], interface: interfaceName(t[7]), overload: prefix(t[8], 'overload', 2) };
    if (t.length > 9 || !validInterface(rule.interface)) return unknown();
    if (negate) s.natRules = s.natRules.filter(r => JSON.stringify(r) !== JSON.stringify(rule)); else s.natRules.push(rule);
    return;
  }
  if (s.context === 'acl') {
    if (prefix(t[0], 'remark', 3) && !negate) return;
    const numbered = /^\d+$/.test(t[0]);
    const sequence = numbered ? +t[0] : nextSequence(s.acls[s.current].rules);
    if (negate && numbered && t.length === 1) { s.acls[s.current].rules = s.acls[s.current].rules.filter(r => r.sequence !== sequence); return; }
    if (negate) return unknown();
    const rule = parseRule(numbered ? t.slice(1) : t, s.acls[s.current].type);
    if (!rule) return unknown();
    if (s.acls[s.current].rules.some(r => r.sequence === sequence)) return invalid();
    s.acls[s.current].rules.push({ ...rule, sequence }); return;
  }
  if (s.context !== 'interface') return unknown();
  const i = interfaceState(s, s.current);
  if (prefix(t[0], 'description', 4) && !negate) return;
  if (prefix(t[0], 'shutdown', 2) && t.length === 1) { i.enabled = negate; return; }
  if (prefix(t[0], 'encapsulation', 3) && prefix(t[1], 'dot1q', 3)) {
    if (!s.current.includes('.') || !/^\d+$/.test(t[2] ?? '') || +t[2] < 1 || +t[2] > 4094 || t.length > 4 || (t[3] && !prefix(t[3], 'native', 3))) return unknown();
    i.vlan = negate ? null : +t[2]; i.native = !!t[3]; return;
  }
  if (prefix(t[0], 'ip', 2) && prefix(t[1], 'address', 3)) {
    if (s.id === 24) s.violations.push(original);
    if (negate) { i.address = null; i.mask = null; return; }
    if (t.length !== 4 || !ipv4(t[2]) || !ipv4(t[3])) return unknown();
    i.address = t[2]; i.mask = t[3]; return;
  }
  if (prefix(t[0], 'ip', 2) && t[1] === 'nat') {
    const role = prefix(t[2], 'inside', 3) ? 'inside' : prefix(t[2], 'outside', 3) ? 'outside' : null;
    if (!role || t.length !== 3) return unknown();
    i.nat = negate ? null : role; return;
  }
  if (prefix(t[0], 'ip', 2) && prefix(t[1], 'access-group', 8)) {
    const direction = prefix(t[3], 'in', 1) ? 'in' : prefix(t[3], 'out', 1) ? 'out' : null;
    if (!direction || t.length !== 4) return unknown();
    if (s.id === 24 && t[2] === '17' && !negate) s.violations.push(original);
    if (negate) delete i.filters[direction]; else i.filters[direction] = raw[2]; return;
  }
  return unknown();
}
const nextSequence = rules => rules.length ? Math.max(...rules.map(r => r.sequence)) + 10 : 10;
function parseAddress(tokens, cursor) {
  if (prefix(tokens[cursor], 'any', 1)) return { address: 0, wildcard: 4294967295, end: cursor + 1 };
  if (prefix(tokens[cursor], 'host', 1) && ipv4(tokens[cursor + 1])) return { address: ipNumber(tokens[cursor + 1]), wildcard: 0, end: cursor + 2 };
  if (ipv4(tokens[cursor]) && ipv4(tokens[cursor + 1])) return { address: ipNumber(tokens[cursor]), wildcard: ipNumber(tokens[cursor + 1]), end: cursor + 2 };
  return null;
}
function parsePort(tokens, cursor) {
  const token = tokens[cursor];
  if (!['eq', 'neq', 'gt', 'lt', 'range'].includes(token)) return { intervals: [[0, 65535]], end: cursor };
  const value = v => ({ ssh: 22, telnet: 23, www: 80, http: 80, https: 443, domain: 53 })[v] ?? (/^\d+$/.test(v ?? '') ? +v : NaN);
  const a = value(tokens[cursor + 1]);
  if (!Number.isInteger(a) || a < 0 || a > 65535) return null;
  if (token === 'range') {
    const b = value(tokens[cursor + 2]);
    return Number.isInteger(b) && b >= a && b <= 65535 ? { intervals: [[a, b]], end: cursor + 3 } : null;
  }
  const intervals = token === 'eq' ? [[a, a]] : token === 'neq' ? [[0, a - 1], [a + 1, 65535]] : token === 'gt' ? [[a + 1, 65535]] : [[0, a - 1]];
  return { intervals: intervals.filter(([low, high]) => low <= high), end: cursor + 2 };
}
function parseRule(tokens, type) {
  const action = prefix(tokens[0], 'permit', 1) ? 'permit' : prefix(tokens[0], 'deny', 1) ? 'deny' : null;
  if (!action) return null;
  let cursor = 1, protocol = 'ip';
  if (type === 'extended') {
    protocol = tokens[cursor++];
    protocol = ({ '6': 'tcp', '17': 'udp', '1': 'icmp' })[protocol] ?? protocol;
    if (!['ip', 'tcp', 'udp', 'icmp'].includes(protocol)) return null;
  }
  const src = parseAddress(tokens, cursor);
  if (!src) return null;
  cursor = src.end;
  let srcPorts = [[0, 65535]], dstPorts = [[0, 65535]], dst = { address: 0, wildcard: 4294967295 };
  if (type === 'extended') {
    const sourcePort = parsePort(tokens, cursor);
    if (!['tcp', 'udp'].includes(protocol) && sourcePort?.end !== cursor) return null;
    if (!sourcePort) return null;
    srcPorts = sourcePort.intervals; cursor = sourcePort.end;
    dst = parseAddress(tokens, cursor);
    if (!dst) return null;
    cursor = dst.end;
    const destinationPort = parsePort(tokens, cursor);
    if (!['tcp', 'udp'].includes(protocol) && destinationPort?.end !== cursor) return null;
    if (!destinationPort) return null;
    dstPorts = destinationPort.intervals; cursor = destinationPort.end;
  }
  if (tokens[cursor] === 'log' || tokens[cursor] === 'log-input') cursor++;
  if (cursor !== tokens.length) return null;
  return { action, protocol, src, dst, srcPorts, dstPorts };
}
function addressInterval(address) {
  const { wildcard } = address;
  // Contiguous IOS wildcard masks produce exact intervals. Other masks remain
  // valid IOS but are deliberately deferred to human rubric review.
  if (wildcard !== 4294967295 && ((wildcard + 1) & wildcard) !== 0) return null;
  const low = (address.address & (~wildcard >>> 0)) >>> 0;
  return [low, low + wildcard];
}
function representatives(intervals, max) {
  const boundaries = new Set([0, max + 1]);
  for (const [low, high] of intervals) { boundaries.add(low); boundaries.add(high + 1); }
  return [...boundaries].filter(v => v >= 0 && v <= max).sort((a, b) => a - b);
}
const contains = (interval, value) => value >= interval[0] && value <= interval[1];
function standardPolicy(rules) {
  const sorted = [...rules].sort((a, b) => a.sequence - b.sequence);
  const ranges = sorted.map(r => addressInterval(r.src));
  if (ranges.some(r => !r)) return null;
  const expected = [ipNumber('10.42.8.0'), ipNumber('10.42.8.255')];
  return representatives([...ranges, expected], 4294967295).every(ip => {
    const found = sorted.findIndex((r, i) => contains(ranges[i], ip));
    return (found >= 0 && sorted[found].action === 'permit') === contains(expected, ip);
  });
}
function extendedPolicy(rules) {
  const sorted = [...rules].sort((a, b) => a.sequence - b.sequence);
  const srcRanges = sorted.map(r => addressInterval(r.src)), dstRanges = sorted.map(r => addressInterval(r.dst));
  if ([...srcRanges, ...dstRanges].some(r => !r)) return null;
  const admin = ipNumber('10.12.30.10'), server = ipNumber('10.50.0.20');
  const sources = representatives([...srcRanges, [admin, admin]], 4294967295);
  const destinations = representatives([...dstRanges, [server, server]], 4294967295);
  const sourcePorts = representatives(sorted.flatMap(r => r.srcPorts), 65535);
  const destinationPorts = representatives([...sorted.flatMap(r => r.dstPorts), [22, 22]], 65535);
  if (sources.length * destinations.length * sourcePorts.length * destinationPorts.length > 100000) return null;
  for (const src of sources) for (const dst of destinations) for (const sport of sourcePorts) for (const dport of destinationPorts) for (const protocol of ['tcp', 'udp', 'icmp', 'other']) {
    const index = sorted.findIndex((r, i) => (r.protocol === 'ip' || r.protocol === protocol) && contains(srcRanges[i], src) && contains(dstRanges[i], dst) && r.srcPorts.some(range => contains(range, sport)) && r.dstPorts.some(range => contains(range, dport)));
    const permitted = index >= 0 && sorted[index].action === 'permit';
    const expected = !(protocol === 'tcp' && dst === server && dport === 22 && src !== admin);
    if (permitted !== expected) return false;
  }
  return true;
}
