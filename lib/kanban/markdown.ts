import * as React from "react"

/**
 * A small, hand-rolled formatting subset (bold/italic/code/links/lists/
 * headings/quotes) rendered directly to React elements — never through
 * dangerouslySetInnerHTML, so there is no HTML-injection surface at all.
 * Links are scheme-checked before rendering as a real <a>.
 */

const SAFE_LINK_SCHEMES = ["http://", "https://", "mailto:"]

function isSafeUrl(url: string) {
  return SAFE_LINK_SCHEMES.some((scheme) => url.toLowerCase().startsWith(scheme))
}

function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  const tokenPattern = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g
  const parts = text.split(tokenPattern).filter((p) => p !== "")

  return parts.map((part, i) => {
    const key = `${keyPrefix}-${i}`
    if (part.startsWith("**") && part.endsWith("**") && part.length > 3) {
      return React.createElement("strong", { key }, part.slice(2, -2))
    }
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      return React.createElement("em", { key }, part.slice(1, -1))
    }
    if (part.startsWith("`") && part.endsWith("`") && part.length > 1) {
      return React.createElement(
        "code",
        { key, className: "rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]" },
        part.slice(1, -1)
      )
    }
    const linkMatch = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part)
    if (linkMatch) {
      const [, label, url] = linkMatch
      if (isSafeUrl(url)) {
        return React.createElement(
          "a",
          {
            key,
            href: url,
            target: "_blank",
            rel: "noreferrer",
            className: "text-primary underline underline-offset-2 hover:text-primary/80",
          },
          label
        )
      }
      return React.createElement("span", { key }, label)
    }
    return part
  })
}

export function renderSafeMarkdown(text: string): React.ReactNode {
  if (!text.trim()) return null
  const lines = text.split("\n")
  const blocks: React.ReactNode[] = []
  let listBuffer: string[] = []
  let codeBuffer: string[] | null = null
  let key = 0

  function flushList() {
    if (listBuffer.length === 0) return
    blocks.push(
      React.createElement(
        "ul",
        { key: `ul-${key++}`, className: "list-disc space-y-0.5 pl-5" },
        listBuffer.map((item, i) =>
          React.createElement("li", { key: i }, renderInline(item, `li-${key}-${i}`))
        )
      )
    )
    listBuffer = []
  }

  for (const rawLine of lines) {
    const line = rawLine

    if (line.trim().startsWith("```")) {
      if (codeBuffer === null) {
        flushList()
        codeBuffer = []
      } else {
        blocks.push(
          React.createElement(
            "pre",
            { key: `pre-${key++}`, className: "overflow-x-auto rounded-lg bg-muted p-2.5 text-xs" },
            React.createElement("code", null, codeBuffer.join("\n"))
          )
        )
        codeBuffer = null
      }
      continue
    }
    if (codeBuffer !== null) {
      codeBuffer.push(line)
      continue
    }

    if (/^#{1,3}\s+/.test(line)) {
      flushList()
      const level = line.match(/^#+/)![0].length
      const content = line.replace(/^#{1,3}\s+/, "")
      const Tag = level === 1 ? "h3" : level === 2 ? "h4" : "h5"
      blocks.push(
        React.createElement(
          Tag,
          { key: `h-${key++}`, className: "font-heading font-semibold" },
          renderInline(content, `h-${key}`)
        )
      )
      continue
    }

    if (/^[-*]\s+/.test(line)) {
      listBuffer.push(line.replace(/^[-*]\s+/, ""))
      continue
    }
    flushList()

    if (/^>\s?/.test(line)) {
      blocks.push(
        React.createElement(
          "blockquote",
          { key: `q-${key++}`, className: "border-l-2 border-border pl-3 text-muted-foreground" },
          renderInline(line.replace(/^>\s?/, ""), `q-${key}`)
        )
      )
      continue
    }

    if (line.trim() === "") {
      blocks.push(React.createElement("div", { key: `sp-${key++}`, className: "h-1" }))
      continue
    }

    blocks.push(
      React.createElement(
        "p",
        { key: `p-${key++}`, className: "whitespace-pre-wrap break-words" },
        renderInline(line, `p-${key}`)
      )
    )
  }
  flushList()

  return React.createElement("div", { className: "flex flex-col gap-1 text-sm" }, blocks)
}

export interface FormatAction {
  label: string
  before: string
  after: string
  blockPrefix?: string
}

export const FORMAT_ACTIONS: Record<string, FormatAction> = {
  bold: { label: "Negrito", before: "**", after: "**" },
  italic: { label: "Itálico", before: "*", after: "*" },
  code: { label: "Código", before: "`", after: "`" },
  link: { label: "Link", before: "[", after: "](https://)" },
  heading: { label: "Título", before: "", after: "", blockPrefix: "# " },
  list: { label: "Lista", before: "", after: "", blockPrefix: "- " },
  quote: { label: "Citação", before: "", after: "", blockPrefix: "> " },
}

/** Applies a formatting action to the current selection of a textarea, returning the new value + caret. */
export function applyFormatting(
  value: string,
  selectionStart: number,
  selectionEnd: number,
  action: FormatAction
): { value: string; selectionStart: number; selectionEnd: number } {
  const selected = value.slice(selectionStart, selectionEnd)

  if (action.blockPrefix) {
    const lineStart = value.lastIndexOf("\n", selectionStart - 1) + 1
    const next = value.slice(0, lineStart) + action.blockPrefix + value.slice(lineStart)
    const offset = action.blockPrefix.length
    return {
      value: next,
      selectionStart: selectionStart + offset,
      selectionEnd: selectionEnd + offset,
    }
  }

  const replacement = `${action.before}${selected || "texto"}${action.after}`
  const next = value.slice(0, selectionStart) + replacement + value.slice(selectionEnd)
  return {
    value: next,
    selectionStart: selectionStart + action.before.length,
    selectionEnd: selectionStart + action.before.length + (selected || "texto").length,
  }
}
