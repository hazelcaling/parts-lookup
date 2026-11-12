import React, { useEffect, useRef, useState } from "react";

// Small multi-line editor for Special Instructions with Bold / Red / Yellow highlight.
// The value is stored as lines of styled runs: [[{ text, b, r, h }]] — the same shape the
// PDF code draws — so formatting carries straight into the PDF.
import { linesToHtml, domToLines, styleOf, RED, YELLOW } from "./richText.js";

export default function RichTextEditor({ value, onChange, resetKey, id, labelId, rows = 4 }) {
  const ref = useRef(null);
  const [active, setActive] = useState({ b: false, r: false, h: false });

  // Fill the editor from the saved value on mount and whenever the form is cleared
  useEffect(() => {
    if (ref.current) ref.current.innerHTML = linesToHtml(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  const inEditor = () => {
    const sel = window.getSelection();
    return sel && sel.rangeCount && ref.current && ref.current.contains(sel.anchorNode);
  };
  const refresh = () => {
    if (!inEditor()) return;
    const sel = window.getSelection();
    const node = sel.anchorNode && (sel.anchorNode.nodeType === 3 ? sel.anchorNode.parentElement : sel.anchorNode);
    if (node && ref.current.contains(node)) setActive(styleOf(node, ref.current));
  };
  useEffect(() => {
    document.addEventListener("selectionchange", refresh);
    return () => document.removeEventListener("selectionchange", refresh);
  });

  const emit = () => onChange(domToLines(ref.current));

  const apply = (kind) => {
    const el = ref.current;
    if (!el) return;
    if (!inEditor()) el.focus();
    document.execCommand("styleWithCSS", false, true);
    if (kind === "b") document.execCommand("bold");
    if (kind === "r") document.execCommand("foreColor", false, active.r ? "#212529" : RED);
    if (kind === "h") {
      const color = active.h ? "transparent" : YELLOW;
      if (!document.execCommand("hiliteColor", false, color)) document.execCommand("backColor", false, color);
    }
    if (kind === "clear") {
      document.execCommand("removeFormat");
      if (!document.execCommand("hiliteColor", false, "transparent")) document.execCommand("backColor", false, "transparent");
    }
    emit();
    refresh();
  };

  const tool = (kind, label, title, style) => (
    <button
      type="button"
      className={"df-tool" + (active[kind] ? " on" : "")}
      aria-pressed={kind === "clear" ? undefined : !!active[kind]}
      title={title}
      onMouseDown={(e) => e.preventDefault()} // keep the text selection
      onClick={() => apply(kind)}
      style={style}
    >
      {label}
    </button>
  );

  return (
    <div className="df-rich">
      <div className="df-toolbar" role="toolbar" aria-label="Special Instructions formatting">
        {tool("b", "B Bold", "Bold the selected text", { fontWeight: 700 })}
        {tool("r", "Red", "Make the selected text red", { color: RED, fontWeight: 600 })}
        {tool("h", "Highlight", "Highlight the selected text in yellow", { background: YELLOW })}
        {tool("clear", "Plain", "Remove formatting from the selected text")}
        <span className="df-tool-hint">Select text, then click a button.</span>
      </div>
      <div
        ref={ref}
        id={id}
        className="df-rich-area"
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-labelledby={labelId}
        style={{ minHeight: `${rows * 1.45}em` }}
        onInput={emit}
        onBlur={emit}
        onPaste={(e) => {
          e.preventDefault();
          const text = e.clipboardData.getData("text/plain");
          document.execCommand("insertText", false, text);
        }}
        onKeyDown={(e) => {
          const k = e.key.toLowerCase();
          if ((e.ctrlKey || e.metaKey) && k === "b") { e.preventDefault(); apply("b"); }
          if ((e.ctrlKey || e.metaKey) && (k === "i" || k === "u")) e.preventDefault();
        }}
      />
    </div>
  );
}
