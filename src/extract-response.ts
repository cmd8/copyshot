/**
 * Extract the last assistant text response from a Claude Code session JSONL.
 *
 * Finds the active branch via file-history-snapshot, walks it backwards,
 * skips system-injected messages (isMeta), returns the first valid assistant text.
 */

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

interface Record {
  uuid?: string;
  parentUuid?: string;
  type?: string;
  isMeta?: boolean;
  messageId?: string;
  message?: {
    content?: string | Array<{ type: string; text?: string }>;
  };
}

function findSessionJsonl(sessionId: string): string | null {
  const projectsRoot = join(homedir(), ".claude", "projects");
  if (!existsSync(projectsRoot)) return null;

  for (const dir of readdirSync(projectsRoot, { withFileTypes: true })) {
    if (!dir.isDirectory()) continue;
    const candidate = join(projectsRoot, dir.name, `${sessionId}.jsonl`);
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

function findActiveLeaf(records: Record[]): Record | undefined {
  const byUuid = new Map<string, Record>();
  const children = new Map<string, string[]>();

  for (const rec of records) {
    if (rec.uuid) {
      byUuid.set(rec.uuid, rec);
      if (rec.parentUuid) {
        const kids = children.get(rec.parentUuid) || [];
        kids.push(rec.uuid);
        children.set(rec.parentUuid, kids);
      }
    }
  }

  // Find last file-history-snapshot before final last-prompt
  let branchRootUuid: string | undefined;
  for (let i = records.length - 1; i >= 0; i--) {
    if (records[i].type === "last-prompt") {
      for (let j = i - 1; j >= 0; j--) {
        if (records[j].type === "file-history-snapshot") {
          branchRootUuid = records[j].messageId;
          break;
        }
      }
      break;
    }
  }

  if (branchRootUuid && byUuid.has(branchRootUuid)) {
    let current = branchRootUuid;
    while (children.has(current)) {
      const kids = children.get(current)!;
      current = kids[kids.length - 1];
    }
    return byUuid.get(current);
  }

  // Fallback: last record with uuid
  for (let i = records.length - 1; i >= 0; i--) {
    if (records[i].uuid) return records[i];
  }
}

function buildActiveBranch(records: Record[]): Record[] {
  const byUuid = new Map<string, Record>();
  for (const rec of records) {
    if (rec.uuid) byUuid.set(rec.uuid, rec);
  }

  const leaf = findActiveLeaf(records);
  const branchUuids = new Set<string>();
  let current = leaf;
  while (current) {
    if (current.uuid) branchUuids.add(current.uuid);
    current = current.parentUuid ? byUuid.get(current.parentUuid) : undefined;
  }

  return records.filter((r) => r.uuid && branchUuids.has(r.uuid));
}

export function extractLastResponse(sessionId: string): string | null {
  const jsonlPath = findSessionJsonl(sessionId);
  if (!jsonlPath) {
    console.error(`No JSONL found for session: ${sessionId}`);
    process.exit(1);
  }

  const records: Record[] = [];
  for (const line of readFileSync(jsonlPath, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      records.push(JSON.parse(trimmed));
    } catch {}
  }

  const branch = buildActiveBranch(records);
  const byUuid = new Map<string, Record>();
  for (const rec of records) {
    if (rec.uuid) byUuid.set(rec.uuid, rec);
  }

  for (let i = branch.length - 1; i >= 0; i--) {
    const rec = branch[i];
    if (rec.type !== "assistant") continue;

    // Walk up to find the user message this assistant replies to
    let parent = rec.parentUuid ? byUuid.get(rec.parentUuid) : undefined;
    while (parent && parent.type !== "user") {
      parent = parent.parentUuid ? byUuid.get(parent.parentUuid) : undefined;
    }

    // Skip if parent user message is system-injected
    if (parent?.isMeta) continue;

    const msg = rec.message;
    if (!msg || typeof msg !== "object") continue;
    const content = msg.content;
    if (!Array.isArray(content)) continue;

    const texts = content
      .filter((c: any) => c.type === "text" && c.text)
      .map((c: any) => c.text);
    if (texts.length === 0) continue;

    return texts.join("\n");
  }

  return null;
}

// CLI
if (process.argv[1]?.endsWith("extract-response.ts")) {
  const sessionId = process.argv[2];
  if (!sessionId) {
    console.error("Usage: extract-response.ts <session-id>");
    process.exit(1);
  }

  const text = extractLastResponse(sessionId);
  if (!text) {
    console.error("No assistant text response found");
    process.exit(1);
  }

  console.log(text);
}
