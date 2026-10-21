/**
 * Markdown Viewer Component
 * 
 * Lightweight, zero-dependency Markdown renderer designed for
 * AI Copilot responses with Cairo Arabic typography, headers, bold,
 * lists, badges, and dividers.
 */

import React from "react";
import {
  Box,
  Typography,
  Divider,
  Chip,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Paper,
} from "@mui/material";

interface MarkdownViewerProps {
  content: string;
  isUser?: boolean;
}

/**
 * Replace common LaTeX symbols and math constructs with standard Unicode equivalents.
 */
function preprocessLatexAndMath(text: string): string {
  return text
    // LaTeX arrows
    .replace(/\$\\rightarrow\$/g, "→")
    .replace(/\$\\to\$/g, "→")
    .replace(/\$\\Rightarrow\$/g, "⇒")
    .replace(/\$\\leftarrow\$/g, "←")
    .replace(/\$\\Leftarrow\$/g, "⇐")
    .replace(/\$\\leftrightarrow\$/g, "↔")
    .replace(/\\rightarrow\b/g, "→")
    .replace(/\\Rightarrow\b/g, "⇒")
    .replace(/\\to\b/g, "→")
    // Mathematical comparisons & operators
    .replace(/\$\\le\$/g, "≤")
    .replace(/\$\\ge\$/g, "≥")
    .replace(/\$\\ne\$/g, "≠")
    .replace(/\$\\approx\$/g, "≈")
    .replace(/\$\\times\$/g, "×")
    .replace(/\$\\div\$/g, "÷")
    .replace(/\$\\pm\$/g, "±")
    .replace(/\\le\b/g, "≤")
    .replace(/\\ge\b/g, "≥")
    .replace(/\\ne\b/g, "≠")
    .replace(/\\approx\b/g, "≈")
    .replace(/\\times\b/g, "×")
    .replace(/\\div\b/g, "÷")
    .replace(/\\pm\b/g, "±");
}

const isTableSeparator = (line: string): boolean => {
  return /^\s*\|?(\s*:?-{2,}:?\s*\|)+\s*:?-{2,}:?\s*\|?\s*$/.test(line);
};

const parseTableRow = (line: string): string[] => {
  let trimmed = line.trim();
  if (trimmed.startsWith("|")) trimmed = trimmed.substring(1);
  if (trimmed.endsWith("|")) trimmed = trimmed.substring(0, trimmed.length - 1);
  return trimmed.split("|").map((cell) => cell.trim());
};

const parseAlignments = (sepLine: string): ("left" | "center" | "right")[] => {
  const parts = parseTableRow(sepLine);
  return parts.map((part) => {
    const trimmed = part.trim();
    const startsColon = trimmed.startsWith(":");
    const endsColon = trimmed.endsWith(":");
    if (startsColon && endsColon) return "center";
    if (endsColon) return "right";
    return "left";
  });
};

export default function MarkdownViewer({ content, isUser = false }: MarkdownViewerProps) {
  // If user message, render as simple formatted text
  if (isUser) {
    return (
      <Typography
        variant="body2"
        sx={{
          fontFamily: "Cairo, sans-serif",
          fontSize: "0.95rem",
          lineHeight: 1.6,
          unicodeBidi: "plaintext",
          whiteSpace: "pre-wrap",
        }}
        dir="auto"
      >
        {content}
      </Typography>
    );
  }

  // Pre-process LaTeX symbols to Unicode
  const processedContent = preprocessLatexAndMath(content);

  // Parse lines into blocks
  const lines = processedContent.split("\n");
  const blocks: React.ReactNode[] = [];

  let inList = false;
  let listItems: React.ReactNode[] = [];
  let isNumberedList = false;

  const flushList = () => {
    if (inList && listItems.length > 0) {
      blocks.push(
        <Box
          key={`list_${blocks.length}`}
          component={isNumberedList ? "ol" : "ul"}
          sx={{
            m: 0,
            mb: 1.5,
            pl: isNumberedList ? 3 : 2.5,
            pr: 1,
            display: "flex",
            flexDirection: "column",
            gap: 0.5,
          }}
        >
          {listItems}
        </Box>
      );
      listItems = [];
      inList = false;
    }
  };

  const renderInlineFormatted = (text: string): React.ReactNode => {
    // Regex splits by bold (**...**) and inline code (`...`)
    const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);

    return parts.map((part, idx) => {
      if (part.startsWith("**") && part.endsWith("**") && part.length >= 4) {
        return (
          <Box
            key={idx}
            component="strong"
            sx={{
              fontWeight: 700,
              color: "text.primary",
            }}
          >
            {part.slice(2, -2)}
          </Box>
        );
      }

      if (part.startsWith("`") && part.endsWith("`") && part.length >= 2) {
        return (
          <Chip
            key={idx}
            label={part.slice(1, -1)}
            size="small"
            sx={{
              height: 20,
              fontSize: "0.75rem",
              fontWeight: 600,
              fontFamily: "monospace",
              bgcolor: "action.selected",
              color: "primary.main",
              mx: 0.5,
              verticalAlign: "middle",
            }}
          />
        );
      }

      return <span key={idx}>{part}</span>;
    });
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();

    // Table parsing: Detect start of markdown table
    if (line.includes("|") && i + 1 < lines.length && isTableSeparator(lines[i + 1])) {
      flushList();
      const headerLine = line;
      const separatorLine = lines[i + 1].trim();
      const alignments = parseAlignments(separatorLine);
      const headers = parseTableRow(headerLine);
      const rows: string[][] = [];

      let j = i + 2;
      while (j < lines.length) {
        const rowLine = lines[j].trim();
        if (rowLine.includes("|") && rowLine.length > 0 && !isTableSeparator(rowLine)) {
          rows.push(parseTableRow(rowLine));
          j++;
        } else {
          break;
        }
      }

      i = j - 1; // Advance loop to end of table

      blocks.push(
        <TableContainer
          key={`table_${i}`}
          component={Paper}
          elevation={0}
          sx={{
            my: 2,
            border: 1,
            borderColor: "divider",
            borderRadius: 2,
            overflowX: "auto",
            bgcolor: "background.paper",
            boxShadow: "0 2px 10px rgba(0,0,0,0.12)",
          }}
        >
          <Table size="small" sx={{ minWidth: 350 }}>
            <TableHead sx={{ bgcolor: "action.hover" }}>
              <TableRow>
                {headers.map((h, hIdx) => (
                  <TableCell
                    key={`th_${hIdx}`}
                    align={alignments[hIdx] || "left"}
                    sx={{
                      fontWeight: 700,
                      fontFamily: "Cairo, sans-serif",
                      fontSize: "0.85rem",
                      color: "primary.main",
                      borderBottom: 2,
                      borderColor: "divider",
                      py: 1.25,
                      px: 1.5,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {renderInlineFormatted(h)}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row, rIdx) => (
                <TableRow
                  key={`tr_${rIdx}`}
                  sx={{
                    "&:nth-of-type(even)": { bgcolor: "action.hover" },
                    "&:hover": { bgcolor: "action.selected" },
                  }}
                >
                  {row.map((cell, cIdx) => (
                    <TableCell
                      key={`td_${rIdx}_${cIdx}`}
                      align={alignments[cIdx] || "left"}
                      sx={{
                        fontFamily: "Cairo, sans-serif",
                        fontSize: "0.85rem",
                        borderBottom: 1,
                        borderColor: "divider",
                        py: 1,
                        px: 1.5,
                        lineHeight: 1.5,
                        color: "text.primary",
                      }}
                    >
                      {renderInlineFormatted(cell)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      );
      continue;
    }

    // Horizontal Rule (--- or ***)
    if (line === "---" || line === "***") {
      flushList();
      blocks.push(
        <Divider key={`hr_${i}`} sx={{ my: 1.5, borderColor: "divider" }} />
      );
      continue;
    }

    // Headings: ### Heading 3, ## Heading 2, # Heading 1
    if (line.startsWith("### ")) {
      flushList();
      blocks.push(
        <Typography
          key={`h3_${i}`}
          variant="subtitle1"
          dir="auto"
          sx={{
            fontFamily: "Cairo, sans-serif",
            fontWeight: 700,
            fontSize: "1.05rem",
            color: "primary.main",
            mt: 1.75,
            mb: 0.5,
            unicodeBidi: "plaintext",
          }}
        >
          {renderInlineFormatted(line.slice(4))}
        </Typography>
      );
      continue;
    }

    if (line.startsWith("## ")) {
      flushList();
      blocks.push(
        <Typography
          key={`h2_${i}`}
          variant="h6"
          dir="auto"
          sx={{
            fontFamily: "Cairo, sans-serif",
            fontWeight: 700,
            fontSize: "1.15rem",
            color: "primary.main",
            mt: 2,
            mb: 0.75,
            unicodeBidi: "plaintext",
          }}
        >
          {renderInlineFormatted(line.slice(3))}
        </Typography>
      );
      continue;
    }

    if (line.startsWith("# ")) {
      flushList();
      blocks.push(
        <Typography
          key={`h1_${i}`}
          variant="h5"
          dir="auto"
          sx={{
            fontFamily: "Cairo, sans-serif",
            fontWeight: 800,
            fontSize: "1.25rem",
            color: "primary.main",
            mt: 2,
            mb: 1,
            unicodeBidi: "plaintext",
          }}
        >
          {renderInlineFormatted(line.slice(2))}
        </Typography>
      );
      continue;
    }

    // Blockquote: > ...
    if (line.startsWith("> ")) {
      flushList();
      blocks.push(
        <Box
          key={`quote_${i}`}
          sx={{
            borderLeft: "3px solid",
            borderColor: "primary.main",
            pl: 2,
            pr: 1,
            py: 0.5,
            my: 1,
            bgcolor: "action.hover",
            borderRadius: "0 8px 8px 0",
          }}
          dir="auto"
        >
          <Typography
            variant="body2"
            sx={{
              fontFamily: "Cairo, sans-serif",
              fontStyle: "italic",
              color: "text.secondary",
            }}
          >
            {renderInlineFormatted(line.slice(2))}
          </Typography>
        </Box>
      );
      continue;
    }

    // Bullet lists: * or -
    if (line.startsWith("* ") || line.startsWith("- ") || line.startsWith("• ")) {
      if (!inList || isNumberedList) {
        flushList();
        inList = true;
        isNumberedList = false;
      }
      const itemText = line.replace(/^(\*|-|•)\s+/, "");
      listItems.push(
        <Typography
          key={`li_${i}`}
          component="li"
          variant="body2"
          dir="auto"
          sx={{
            fontFamily: "Cairo, sans-serif",
            fontSize: "0.92rem",
            lineHeight: 1.6,
            unicodeBidi: "plaintext",
          }}
        >
          {renderInlineFormatted(itemText)}
        </Typography>
      );
      continue;
    }

    // Numbered lists: 1. 2. etc.
    const numberedMatch = line.match(/^(\d+)\.\s+(.*)/);
    if (numberedMatch) {
      if (!inList || !isNumberedList) {
        flushList();
        inList = true;
        isNumberedList = true;
      }
      listItems.push(
        <Typography
          key={`nli_${i}`}
          component="li"
          variant="body2"
          dir="auto"
          sx={{
            fontFamily: "Cairo, sans-serif",
            fontSize: "0.92rem",
            lineHeight: 1.6,
            unicodeBidi: "plaintext",
          }}
        >
          {renderInlineFormatted(numberedMatch[2])}
        </Typography>
      );
      continue;
    }

    // Empty line
    if (!line) {
      flushList();
      continue;
    }

    // Normal paragraph line
    flushList();
    blocks.push(
      <Typography
        key={`p_${i}`}
        variant="body2"
        dir="auto"
        sx={{
          fontFamily: "Cairo, sans-serif",
          fontSize: "0.93rem",
          lineHeight: 1.7,
          mb: 1,
          color: "text.primary",
          unicodeBidi: "plaintext",
        }}
      >
        {renderInlineFormatted(line)}
      </Typography>
    );
  }

  flushList();

  return (
    <Box sx={{ width: "100%", overflowWrap: "break-word" }}>
      {blocks}
    </Box>
  );
}
