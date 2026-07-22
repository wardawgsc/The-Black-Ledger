#!/usr/bin/env python3
"""Download top-down ship images from hangar.link / fleetviewer CDN."""

import json
import os
import re
import sys
import urllib.request
import ssl
import shutil

OUTPUT_DIR = "./sc-ship-topdown-test"
API_URL = "https://hangar.link/ships.json"
SIZE_KEY = "top_l"

def fetch_json(url):
    ctx = ssl.create_default_context()
    req = urllib.request.Request(url, headers={
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    })
    with urllib.request.urlopen(req, timeout=10, context=ctx) as resp:
        return json.loads(resp.read().decode())

def download_file(url, filepath):
    """Download file and return True if it's a valid PNG."""
    ctx = ssl.create_default_context()
    req = urllib.request.Request(url, headers={
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Referer": "https://hangar.link/",
    })
    try:
        with urllib.request.urlopen(req, timeout=15, context=ctx) as resp:
            data = resp.read()
        # Validate PNG magic bytes
        if len(data) < 8:
            return False
        if data[:4] != b'\x89PNG':
            return False
        if data[12:16] != b'IHDR':
            return False
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        with open(filepath, 'wb') as f:
            f.write(data)
        return True
    except Exception:
        return False

def test_png(filepath):
    """Check if file exists and is a valid PNG."""
    if not os.path.exists(filepath):
        return False
    try:
        with open(filepath, 'rb') as f:
            data = f.read(24)
        return len(data) >= 16 and data[:4] == b'\x89PNG' and data[12:16] == b'IHDR'
    except Exception:
        return False

def get_url(ship_slug, variant_slug, hash_val):
    """Construct CDN URL."""
    if not variant_slug or variant_slug.strip() == "":
        return f"https://cdn1.fleetviewer.link/{ship_slug}__top_l_{hash_val}.png"
    else:
        return f"https://cdn1.fleetviewer.link/{ship_slug}_{variant_slug}_top_l_{hash_val}.png"

def sanitize_name(name):
    """Replace invalid filename characters."""
    return re.sub(r'[\\/:*?"<>|]', '_', name)

def main():
    print("Fetching ship manifest...")
    data = fetch_json(API_URL)
    ships = data.get("ships", []) if isinstance(data, dict) else data
    print(f"Found {len(ships)} ships\n")

    if not os.path.exists(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR)

    downloaded = 0
    skipped = 0
    failed = 0
    repaired = 0

    for ship in ships:
        ship_slug = ship.get("slug", "") or ""
        ship_name = ship.get("name", ship_slug)
        mfr = ship.get("manufacturerName", "Unknown")
        mfr_safe = sanitize_name(mfr)
        mfr_dir = os.path.join(OUTPUT_DIR, mfr_safe)

        variants = ship.get("variants", [])
        if not variants:
            variants = [ship]

        for variant in variants:
            var_slug = variant.get("slug", "") or ""
            var_name = variant.get("name", ship_name) or ship_name
            safe_name = sanitize_name(var_name)

            if var_slug and var_slug != ship_slug and safe_name.lower() not in var_slug.lower():
                safe_name += f"_{var_slug}"

            out_file = os.path.join(mfr_dir, f"{safe_name}.png")

            # Skip if valid PNG exists
            if test_png(out_file):
                print(f"  [SKIP]    {mfr_safe}/{safe_name} (valid)")
                skipped += 1
                continue

            # Get hash
            top_l = variant.get(SIZE_KEY) or variant.get("top_l")
            if not top_l:
                print(f"  [SKIP]    {mfr_safe}/{safe_name} (no top_l data)")
                skipped += 1
                continue

            hash_val = top_l.get("hash", "") if isinstance(top_l, dict) else str(top_l)
            if not hash_val:
                print(f"  [FAIL]    {mfr_safe}/{safe_name} (no hash)")
                failed += 1
                continue

            # Remove corrupt file
            if test_png(out_file):
                if not test_png(out_file):
                    os.remove(out_file)
                    repaired += 1

            url = get_url(ship_slug, var_slug, hash_val)
            if download_file(url, out_file):
                print(f"  [DL]      {mfr_safe}/{safe_name}")
                downloaded += 1
            else:
                print(f"  [FAIL]    {mfr_safe}/{safe_name}")
                failed += 1

    print(f"\n=== Done ===")
    print(f"Downloaded: {downloaded}")
    print(f"Skipped   : {skipped}")
    print(f"Failed    : {failed}")
    print(f"Repaired  : {repaired}")

if __name__ == "__main__":
    main()
