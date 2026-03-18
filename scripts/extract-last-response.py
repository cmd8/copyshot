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


def build_active_branch(records: list[dict]) -> list[dict]:
    by_uuid = {}
    for rec in records:
        uuid = rec.get("uuid")
        if uuid:
            by_uuid[uuid] = rec

    branch_uuids = set()
    current = records[-1] if records else None
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

    last_user_idx = None
    for i in range(len(branch) - 1, -1, -1):
        if branch[i].get("type") in ("human", "user"):
            last_user_idx = i
            break

    search_end = last_user_idx if last_user_idx is not None else len(branch)
    for i in range(search_end - 1, -1, -1):
        rec = branch[i]
        if rec.get("type") != "assistant":
            continue

        preceding_user = None
        for j in range(i - 1, -1, -1):
            if branch[j].get("type") in ("human", "user"):
                preceding_user = branch[j]
                break
        if preceding_user:
            user_content = preceding_user.get("message", {})
            if isinstance(user_content, dict):
                user_content = user_content.get("content", "")
            if isinstance(user_content, list):
                user_content = " ".join(c.get("text", "") for c in user_content if c.get("type") == "text")
            if isinstance(user_content, str) and "<local-command-caveat>" in user_content:
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
