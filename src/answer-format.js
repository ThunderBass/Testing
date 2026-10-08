/** Plain text for feedback, final reviews and exports; callers escape HTML. */
export function formatAnswer(question, answer) {
  if (answer == null || answer === '' || (Array.isArray(answer) && !answer.length)) return 'No answer submitted';
  if (/cli/i.test(question.format)) return Array.isArray(answer) ? answer.join('\n') : String(answer);
  const options = /matching/i.test(question.format)
    ? Object.fromEntries([...question.prompt.matchAll(/^([A-Z])\. (.+)$/gm)].map(([, key, text]) => [key, text.replace(/`/g, '')]))
    : question.options || {};
  const label = value => options[value] ? `${value} — ${options[value]}` : String(value);
  if (typeof answer === 'object' && !Array.isArray(answer)) return Object.entries(answer).map(([item, value]) => `${item} → ${label(value)}`).join('\n');
  if (Array.isArray(answer)) return answer.map((value, index) => /ordering/i.test(question.format) ? `${index + 1}. ${label(value)}` : label(value)).join('\n');
  return label(answer);
}
