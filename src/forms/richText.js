// Special Instructions rich text <-> [[{ text, b, r, h }]] lines (browser DOM helpers)
export const RED = "#cc0000";
export const YELLOW = "#fff200";
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function linesToHtml(lines) {
  if (!lines || !lines.length) return "";
  return lines.map((line) => {
    if (!line || !line.length) return "<div><br></div>";
    const inner = line.map((r) => {
      const st = [r.b && "font-weight:bold", r.r && `color:${RED}`, r.h && `background-color:${YELLOW}`].filter(Boolean).join(";");
      return st ? `<span style="${st}">${esc(r.text)}</span>` : esc(r.text);
    }).join("");
    return `<div>${inner}</div>`;
  }).join("");
}

const parseRgb = (c) => {
  const m = /rgba?\(([^)]+)\)/.exec(c || "");
  if (!m) return null;
  const [r, g, b, a = 1] = m[1].split(",").map((x) => parseFloat(x));
  return { r, g, b, a };
};
const isRed = (c) => { const x = parseRgb(c); return !!x && x.r >= 150 && x.g <= 90 && x.b <= 90; };
const isYellow = (c) => { const x = parseRgb(c); return !!x && x.a > 0 && x.r >= 200 && x.g >= 200 && x.b <= 150; };

export function styleOf(el, root) {
  const cs = window.getComputedStyle(el);
  let h = false;
  for (let n = el; n && n !== root; n = n.parentElement) {
    if (isYellow(window.getComputedStyle(n).backgroundColor)) { h = true; break; }
  }
  return { b: parseInt(cs.fontWeight, 10) >= 600 || cs.fontWeight === "bold", r: isRed(cs.color), h };
}

export function domToLines(root) {
  const lines = [[]];
  let afterBlock = false;
  const cur = () => lines[lines.length - 1];
  const add = (text, st) => {
    if (afterBlock && cur().length) lines.push([]);
    afterBlock = false;
    const last = cur()[cur().length - 1];
    if (last && last.b === st.b && last.r === st.r && last.h === st.h) last.text += text;
    else cur().push({ text, ...st });
  };
  const walk = (node) => {
    for (const ch of node.childNodes) {
      if (ch.nodeType === 3) {
        const t = ch.nodeValue.replace(/\u00a0/g, " ").replace(/[\r\n]+/g, " ");
        if (t) add(t, styleOf(ch.parentElement, root));
      } else if (ch.nodeName === "BR") {
        afterBlock = false;
        lines.push([]);
      } else if (/^(DIV|P|LI)$/.test(ch.nodeName)) {
        if (cur().length) lines.push([]);
        afterBlock = false;
        walk(ch);
        afterBlock = true;
      } else if (ch.nodeType === 1) {
        walk(ch);
      }
    }
  };
  walk(root);
  while (lines.length && !lines[lines.length - 1].length) lines.pop();
  return lines;
}

