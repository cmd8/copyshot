#!/usr/bin/env python3
"""Extract the last assistant text response from the current Claude Code session."""

import json
import sys
from pathlib import Path


def find_session_jsonl(projects_root: Path, session_id: str) -> Path | None:
    for project_dir in projects_root.iterdir():
        if not project_dir.is_dir():
            continue
        candidate = project_dir / f"{session_id}.jsonl"
        if candidate.exists():
            return candidate
    return None


def find_active_leaf(records: list[dict]) -> dict | None:
    """Find the leaf of the currently active branch.

    The last file-history-snapshot before the final last-prompt record
    contains a messageId pointing to the root of the active branch.
    We walk from that root down to its leaf via the child graph.
    Falls back to the last record if no snapshot is found.
    """
    by_uuid = {}
    children: dict[str, list[str]] = {}
    for rec in records:
        uuid = rec.get("uuid")
        if uuid:
            by_uuid[uuid] = rec
            parent = rec.get("parentUuid")
            if parent:
                children.setdefault(parent, []).append(uuid)

    # Find the last file-history-snapshot before the final last-prompt
    branch_root_uuid = None
    for i in range(len(records) - 1, -1, -1):
        if records[i].get("type") == "last-prompt":
            for j in range(i - 1, -1, -1):
                if records[j].get("type") == "file-history-snapshot":
                    branch_root_uuid = records[j].get("messageId")
                    break
            break

    if branch_root_uuid and branch_root_uuid in by_uuid:
        # Walk down from root to leaf (take last child at each step)
        current = branch_root_uuid
        while current in children:
            current = children[current][-1]
        return by_uuid.get(current)

    # Fallback: last record with a uuid
    for rec in reversed(records):
        if rec.get("uuid"):
            return rec
    return None


def build_active_branch(records: list[dict]) -> list[dict]:
    by_uuid = {}
    for rec in records:
        uuid = rec.get("uuid")
        if uuid:
            by_uuid[uuid] = rec

    leaf = find_active_leaf(records)
    branch_uuids = set()
    current = leaf
    while current:
        uuid = current.get("uuid")
        if uuid:
            branch_uuids.add(uuid)
        parent = current.get("parentUuid")
        current = by_uuid.get(parent) if parent else None

    return [r for r in records if r.get("uuid") in branch_uuids]


def extract_last_response(jsonl_path: Path) -> str | None:
    records = []
    with open(jsonl_path) as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                records.append(json.loads(line))
            except json.JSONDecodeError:
                continue

    branch = build_active_branch(records)
    by_uuid = {r.get("uuid"): r for r in records if r.get("uuid")}

    for i in range(len(branch) - 1, -1, -1):
        rec = branch[i]
        if rec.get("type") != "assistant":
            continue

        # Walk up parentUuid to find the user message this assistant replies to
        parent = by_uuid.get(rec.get("parentUuid"))
        while parent and parent.get("type") != "user":
            parent = by_uuid.get(parent.get("parentUuid"))

        # Skip if the parent user message is system-injected
        if parent and parent.get("isMeta"):
            continue

        msg = rec.get("message", {})
        if not isinstance(msg, dict):
            continue
        content = msg.get("content", [])
        if not isinstance(content, list):
            continue
        texts = [c["text"] for c in content if c.get("type") == "text" and c.get("text")]
        if not texts:
            continue
        return "\n".join(texts)

    return None


def main():
    if len(sys.argv) < 2 or not sys.argv[1]:
        print("Usage: extract-last-response.py <session-id>", file=sys.stderr)
        sys.exit(1)

    session_id = sys.argv[1]
    projects_root = Path.home() / ".claude" / "projects"

    jsonl_path = find_session_jsonl(projects_root, session_id)
    if not jsonl_path:
        print(f"No JSONL found for session: {session_id}", file=sys.stderr)
        sys.exit(1)

    text = extract_last_response(jsonl_path)
    if not text:
        print("No assistant text response found", file=sys.stderr)
        sys.exit(1)

    print(text)


if __name__ == "__main__":
    main()
