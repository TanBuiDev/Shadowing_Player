export function parseSRT(content) {
  const subs = [];
  const normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const blocks = normalized.split('\n\n');

  blocks.forEach((block) => {
    if (!block.trim()) return;
    const lines = block.split('\n');
    if (lines.length < 3) return; // Needs Index, Time, Text

    // Line 1: Index (skip)
    // Line 2: Time
    const timeLine = lines[1];
    const [startStr, endStr] = timeLine.split(' --> ');

    if (!startStr || !endStr) return;

    // Line 3+: Text
    const text = lines.slice(2).join('\n');

    subs.push({
      id: crypto.randomUUID(),
      start: parseTime(startStr),
      end: parseTime(endStr),
      text: text,
    });
  });
  return subs;
}

export function parseParsedSubtitlesToSRT(subs) {
  return subs
    .map((sub, index) => {
      const start = formatTime(sub.start);
      const end = formatTime(sub.end);
      return `${index + 1}\n${start} --> ${end}\n${sub.text}\n`;
    })
    .join('\n');
}

function parseTime(timeStr) {
  // 00:00:20,000 -> seconds
  const [h, m, sWithMs] = timeStr.replace(',', '.').split(':');
  const s = parseFloat(sWithMs);
  return parseInt(h) * 3600 + parseInt(m) * 60 + s;
}

function formatTime(seconds) {
  const pad = (num, size = 2) => num.toString().padStart(size, '0');

  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);

  return `${pad(h)}:${pad(m)}:${pad(s)},${pad(ms, 3)}`;
}
