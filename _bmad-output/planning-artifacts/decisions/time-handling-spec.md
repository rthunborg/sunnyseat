# Time Handling Spec — Europe/Stockholm & DST (No Code)

Authoritative TZ: `Europe/Stockholm`. Precompute at 02:00 local. Store UTC; format 24‑hour local. DST: skip nonexistent hour (spring), disambiguate repeated hour (autumn) using UTC; never show duplicate local times. API returns both UTC and pre‑formatted local strings per window. Non‑prod header `X‑Fake‑Now` for deterministic tests.
