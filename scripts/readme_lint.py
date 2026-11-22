"""Lint the root README and keep its TOC in sync with its headings.

Usage:
  python3 scripts/readme_lint.py [README.md]            # report problems, exit 1 if any
  python3 scripts/readme_lint.py --fix-toc [README.md]  # rewrite the TOC from the headings
  python3 scripts/readme_lint.py --fix-indent [README.md]  # re-indent every list at 2 spaces per nesting level
  python3 scripts/readme_lint.py --links [README.md]    # print every link URL, sorted (for diffing)
"""
from __future__ import annotations

import re
import sys
from collections import Counter
from pathlib import Path

HEADING = re.compile(r"^ {0,3}(#{1,6})\s+(.*?)\s*$")
LINK = re.compile(r"\[([^\]]*)\]\(([^()\s]*(?:\([^()]*\)[^()\s]*)*)(\s[^)]*)?\)")
LIST_ITEM = re.compile(r"^(\s*)[-*+]\s")
FENCE = re.compile(r"^\s*```")


def plain(text: str) -> str:
    """Heading text as GitHub renders it: links become their label."""
    return re.sub(r"\[([^\]]*)\]\([^)]*\)", r"\1", text)


def slug(text: str) -> str:
    s = plain(text).strip().lower()
    s = re.sub(r"[^\w\- ]", "", s)
    return s.replace(" ", "-")


def headings(lines: list[str]) -> list[tuple[int, int, str, str]]:
    """(line_no, level, text, anchor) for every heading outside code fences."""
    out, seen, fenced = [], Counter(), False
    for i, line in enumerate(lines):
        if FENCE.match(line):
            fenced = not fenced
        if fenced or not (m := HEADING.match(line)):
            continue
        base = slug(m.group(2))
        anchor = base if not seen[base] else f"{base}-{seen[base]}"
        seen[base] += 1
        out.append((i, len(m.group(1)), m.group(2), anchor))
    return out


def toc_span(lines: list[str]) -> tuple[int, int]:
    """The TOC is the list right after the H1."""
    start = 1
    end = start
    while end < len(lines) and LIST_ITEM.match(lines[end]):
        end += 1
    return start, end


def build_toc(hs: list[tuple[int, int, str, str]]) -> list[str]:
    def label(t: str) -> str:
        return plain(t).replace("&", "\\&")
    return [f"{'  ' * (lvl - 1)}- [{label(t)}](#{a})" for _, lvl, t, a in hs]


def fix_indent(lines: list[str]) -> list[str]:
    """Keep each list's nesting tree, re-emit it at 2 spaces per level (top level keeps 0 or 2)."""
    out, stack, base, shift, fenced = [], [], 0, 0, False
    for line in lines:
        if FENCE.match(line):
            fenced = not fenced
        if fenced or FENCE.match(line):
            out.append(line)
            continue
        if m := LIST_ITEM.match(line):
            i = len(m.group(1).expandtabs(4))
            if not stack:
                base = min(i, 2) & ~1
            while stack and stack[-1] > i:
                stack.pop()
            if not stack or stack[-1] < i:
                stack.append(i)
            new = " " * (base + 2 * (len(stack) - 1))
            shift = len(new) - len(m.group(1))
            out.append(new + line.lstrip())
        elif not line.strip():
            out.append(line)
        elif HEADING.match(line) or not line[:1].isspace():
            stack = []
            out.append(line)
        else:
            out.append(" " * max(0, len(line) - len(line.lstrip()) + shift) + line.lstrip())
    return out


def lint(lines: list[str], root: Path) -> list[str]:
    problems = []
    hs = headings(lines)
    anchors = {a for *_, a in hs}
    lo, hi = toc_span(lines)
    if lines[lo:hi] != build_toc(hs):
        problems.append(f"{lo + 1}: TOC out of sync with headings (run --fix-toc)")

    prev_level = 1
    for i, lvl, text, _ in hs:
        if lvl > prev_level + 1:
            problems.append(f"{i + 1}: heading jumps H{prev_level}->H{lvl}: {text}")
        prev_level = lvl
        if lines[i] != lines[i].strip():
            problems.append(f"{i + 1}: leading or trailing space in heading")

    fenced, prev_indent, after_break = False, None, True
    for i, line in enumerate(lines):
        n = i + 1
        if FENCE.match(line):
            fenced = not fenced
            continue
        if fenced:
            continue
        if "\t" in line[: len(line) - len(line.lstrip())]:
            problems.append(f"{n}: tab in indentation")
        if m := LIST_ITEM.match(line):
            indent = len(m.group(1).expandtabs(4))
            if indent % 2:
                problems.append(f"{n}: odd indent ({indent} spaces)")
            if after_break and indent >= 4:
                problems.append(f"{n}: list starts at {indent} spaces, renders as a code block")
            elif prev_indent is not None and indent > prev_indent + 2:
                problems.append(f"{n}: indent jumps {prev_indent}->{indent}")
            prev_indent, after_break = indent, False
        elif not line.strip() or HEADING.match(line):
            after_break = True
            prev_indent = None if HEADING.match(line) else prev_indent

        if lo <= i < hi:
            continue
        for lm in LINK.finditer(line):
            label, url, title = lm.group(1), lm.group(2), lm.group(3)
            if not label.strip():
                problems.append(f"{n}: empty link label")
            if not url:
                problems.append(f"{n}: empty link target: [{label}]()")
            elif title and not title.strip().startswith(('"', "'")):
                problems.append(f"{n}: space inside URL: {url}{title}")
            elif url.startswith("(") or url.endswith(")") and url.count("(") < url.count(")"):
                problems.append(f"{n}: stray parenthesis in URL: {url}")
            elif url.startswith("#"):
                if url[1:] not in anchors:
                    problems.append(f"{n}: anchor not found: {url}")
            elif not re.match(r"[a-z][a-z0-9+.-]*:", url):
                target = root / url.split("#")[0].split("?")[0]
                if not target.exists():
                    problems.append(f"{n}: local file not found: {url}")
            if line[lm.end():lm.end() + 2] == "(h":
                problems.append(f"{n}: bare (URL) not attached to a link label: [{label[:40]}]")
            if line[lm.end():lm.end() + 1] == ")" and line[lm.start() - 1:lm.start()] != "(":
                problems.append(f"{n}: extra ')' after link: [{label[:40]}]")
        if re.match(r"^\s*-\S", line) and not re.match(r"^\s*--", line):
            problems.append(f"{n}: missing space after '-', not a list item")
        if re.match(r"^\s*-\s*$", line):
            problems.append(f"{n}: empty list item")
        if re.match(r"^\s*\(https?://", line) or re.search(r"\)\s+\(https?://", line):
            problems.append(f"{n}: bare (URL) not attached to a link label")
        if re.search(r"\[\]", line):
            problems.append(f"{n}: empty [] label")
        if re.search(r"\]\s+\(http", line):
            problems.append(f"{n}: space between ] and (")
    return problems


def main(argv: list[str]) -> int:
    flags = {a for a in argv if a.startswith("--")}
    path = Path(next((a for a in argv if not a.startswith("--")), "README.md"))
    lines = path.read_text(encoding="utf-8").split("\n")
    if "--links" in flags:
        lo, hi = toc_span(lines)
        urls = [m.group(2) for i, l in enumerate(lines) if not lo <= i < hi for m in LINK.finditer(l)]
        print("\n".join(sorted(urls)))
        return 0
    if "--fix-indent" in flags:
        lines = fix_indent(lines)
        path.write_text("\n".join(lines), encoding="utf-8")
    if "--fix-toc" in flags:
        lo, hi = toc_span(lines)
        lines[lo:hi] = build_toc(headings(lines))
        path.write_text("\n".join(lines), encoding="utf-8")
    problems = lint(lines, path.parent)
    print("\n".join(problems) or "clean")
    print(f"{len(problems)} problems", file=sys.stderr)
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
