import os
from typing import Iterable, Optional


def resolve_existing_path(
    stored_path: Optional[str],
    upload_root: str,
    preferred_subdir: Optional[str] = None,
    candidate_names: Optional[Iterable[str]] = None,
) -> Optional[str]:
    """Resolve a persisted file path across machines.

    Stored paths may be absolute paths from another developer machine.
    This helper attempts a few safe fallbacks inside the current upload root.
    """
    if not stored_path:
        return None

    normalized = os.path.normpath(stored_path)
    if os.path.exists(normalized):
        return normalized

    basename = os.path.basename(normalized)
    if not basename:
        return None

    basenames = [basename]
    for candidate_name in candidate_names or []:
        if candidate_name:
            candidate_basename = os.path.basename(os.path.normpath(candidate_name))
            if candidate_basename and candidate_basename not in basenames:
                basenames.append(candidate_basename)

    candidate_dirs = []
    if preferred_subdir:
        candidate_dirs.append(os.path.join(upload_root, preferred_subdir))
    candidate_dirs.append(upload_root)

    for directory in candidate_dirs:
        for candidate_basename in basenames:
            candidate = os.path.join(directory, candidate_basename)
            if os.path.exists(candidate):
                return candidate

    lower_parts = [part.lower() for part in normalized.split(os.sep) if part]
    if 'uploads' in lower_parts:
        upload_index = lower_parts.index('uploads')
        relative_parts = normalized.split(os.sep)[upload_index + 1:]
        candidate = os.path.join(upload_root, *relative_parts)
        if os.path.exists(candidate):
            return candidate

    suffixes = set(basenames)
    for candidate_basename in list(basenames):
        parts = candidate_basename.split('_', 2)
        if len(parts) == 3:
            suffixes.add(parts[2])

    for root, _, files in os.walk(upload_root):
        for file_name in files:
            if file_name in basenames:
                return os.path.join(root, file_name)
            for suffix in suffixes:
                if file_name == suffix or file_name.endswith(f'_{suffix}'):
                    return os.path.join(root, file_name)

    return None
