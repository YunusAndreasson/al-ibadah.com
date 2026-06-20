#!/usr/bin/env python3
"""Generate self-hosted, glyph-subset woff2 fonts for Inter and Source Serif 4.

Why: @fontsource ships per-script subsets where the `latin-ext` slice alone is
~85 KB (Inter) / ~43 KB (Source Serif) because it carries the *entire* Latin
Extended block. This site only uses ~36 non-ASCII codepoints across all 1,776
pages (Swedish + a fixed Arabic-transliteration glyph set). Subsetting to the
real glyph coverage collapses ~325 KB of fonts to a fraction of that.

Each source slice (latin / latin-ext) is subset independently and its original
@fontsource `unicode-range` is preserved, so the browser still only fetches the
ext slice when an extended glyph is present. Output woff2 go to src/fonts/ and a
generated src/styles/fonts.css carries the @font-face rules — both are picked up
by Astro/Vite, content-hashed, and inherit the immutable /_astro/* cache header.

Variable wght axis (100-900) is preserved (no instancing).

Run: python scripts/subset-fonts.py   (then rebuild)
Requires: fonttools + brotli (pip).
"""

import os
import sys
from fontTools.ttLib import TTFont
from fontTools.subset import Subsetter, Options
from fontTools.varLib.instancer import instantiateVariableFont

# The site only uses font weights 400-700 (body 400, medium 500, semibold 600,
# bold 700). The variable fonts ship 100-900; clamping the wght axis to this
# range via partial instancing drops the unused-weight variation data while
# keeping rendering identical for every weight actually in use.
WGHT_RANGE = (400, 700)

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NM = os.path.join(ROOT, "node_modules")
OUT_FONTS = os.path.join(ROOT, "src", "fonts")
OUT_CSS = os.path.join(ROOT, "src", "styles", "fonts.css")

# Generous unicode superset — pyftsubset keeps only glyphs the slice actually
# has, so listing extras is free. Kept wider than the 36 codepoints currently in
# content so standard scholarly transliteration in new articles won't fall back.
UNICODES = ",".join([
    "U+0020-007E", "U+00A0-00FF",
    "U+0100-0101", "U+0112-0113", "U+012A-012B", "U+014C-014D", "U+016A-016B",
    "U+0152-0153", "U+0160-0161", "U+017D-017E", "U+010C-010D", "U+011E-0121",
    "U+0130-0131", "U+0218-021B",
    "U+1E0C-1E0F", "U+1E24-1E25", "U+1E2A-1E2B", "U+1E32-1E37", "U+1E42-1E47",
    "U+1E5A-1E5B", "U+1E62-1E63", "U+1E6C-1E6F", "U+1E92-1E96",
    "U+0300-030C", "U+0323", "U+0331", "U+0332",
    "U+02B9-02D0",
    "U+2009-2014", "U+2018-201E", "U+2020-2022", "U+2026", "U+202F",
    "U+2039-203A", "U+2192", "U+21A9", "U+2122", "U+00B0", "U+00D7",
])

# fontsource's standard Google unicode-range split (identical for both families).
RANGE_LATIN = ("U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,"
               "U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,"
               "U+2212,U+2215,U+FEFF,U+FFFD")
RANGE_LATIN_EXT = ("U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,"
                   "U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,"
                   "U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF")

P = "@fontsource-variable"
# (label, family, font-style, unicode-range, source slice, output basename)
SLICES = [
    ("inter-latin", "Inter Variable", "normal", RANGE_LATIN,
     f"{P}/inter/files/inter-latin-wght-normal.woff2", "inter-latin"),
    ("inter-latin-ext", "Inter Variable", "normal", RANGE_LATIN_EXT,
     f"{P}/inter/files/inter-latin-ext-wght-normal.woff2", "inter-latin-ext"),
    ("serif-latin", "Source Serif 4 Variable", "normal", RANGE_LATIN,
     f"{P}/source-serif-4/files/source-serif-4-latin-wght-normal.woff2", "source-serif-latin"),
    ("serif-latin-ext", "Source Serif 4 Variable", "normal", RANGE_LATIN_EXT,
     f"{P}/source-serif-4/files/source-serif-4-latin-ext-wght-normal.woff2", "source-serif-latin-ext"),
    ("serif-italic-latin", "Source Serif 4 Variable", "italic", RANGE_LATIN,
     f"{P}/source-serif-4/files/source-serif-4-latin-wght-italic.woff2", "source-serif-italic-latin"),
    ("serif-italic-latin-ext", "Source Serif 4 Variable", "italic", RANGE_LATIN_EXT,
     f"{P}/source-serif-4/files/source-serif-4-latin-ext-wght-italic.woff2", "source-serif-italic-latin-ext"),
]

# Glyphs that MUST survive in the latin-ext slices (else transliteration breaks).
# NB: U+0331/U+0332 (the k̲h/s̲h under-bar) are in NEITHER fontsource slice — they
# already render from a fallback font in production, so they are not required here.
REQUIRED_EXT = [0x101, 0x12B, 0x16B, 0x1E25, 0x1E63, 0x1E6D, 0x1E0D, 0x1E93]


def parse_unicodes(spec):
    out = []
    for part in spec.replace("U+", "").split(","):
        part = part.strip()
        if not part:
            continue
        if "-" in part:
            a, b = part.split("-")
            out.extend(range(int(a, 16), int(b, 16) + 1))
        else:
            out.append(int(part, 16))
    return out


def subset_one(src_rel, out_base, require=None):
    src = os.path.join(NM, src_rel)
    if not os.path.exists(src):
        sys.exit(f"missing source font: {src}")
    before = os.path.getsize(src)
    font = TTFont(src)

    opts = Options()
    opts.flavor = "woff2"
    opts.desubroutinize = True
    opts.layout_features = ["*"]
    opts.name_IDs = ["*"]
    opts.notdef_outline = True
    ss = Subsetter(options=opts)
    ss.populate(unicodes=parse_unicodes(UNICODES))
    ss.subset(font)

    # Clamp the variable weight axis to the range the site actually uses.
    # Done after glyph subsetting to avoid variation-table inconsistencies.
    instantiateVariableFont(font, {"wght": WGHT_RANGE}, inplace=True)

    cmap = font.getBestCmap()
    if require:
        missing = [hex(c) for c in require if c not in cmap]
        if missing:
            sys.exit(f"{out_base}: required glyphs missing after subset: {missing}")

    out_path = os.path.join(OUT_FONTS, out_base + ".woff2")
    font.save(out_path)
    after = os.path.getsize(out_path)
    return before, after, len(cmap)


def main():
    os.makedirs(OUT_FONTS, exist_ok=True)
    total_before = total_after = 0
    css = ["/* GENERATED by scripts/subset-fonts.py — do not edit by hand. */\n"]
    for label, family, style, urange, src_rel, out_base in SLICES:
        require = REQUIRED_EXT if "ext" in label else None
        before, after, n = subset_one(src_rel, out_base, require)
        total_before += before
        total_after += after
        print(f"{label:22s} {before/1024:6.1f}KB -> {after/1024:6.1f}KB  ({n} glyphs)")
        css.append(
            "@font-face {\n"
            f"  font-family: '{family}';\n"
            f"  font-style: {style};\n"
            "  font-display: swap;\n"
            f"  font-weight: {WGHT_RANGE[0]} {WGHT_RANGE[1]};\n"
            f"  src: url('../fonts/{out_base}.woff2') format('woff2-variations');\n"
            f"  unicode-range: {urange};\n"
            "}\n"
        )
    with open(OUT_CSS, "w") as f:
        f.write("\n".join(css))
    print(f"{'TOTAL':22s} {total_before/1024:6.1f}KB -> {total_after/1024:6.1f}KB  "
          f"({100*(1-total_after/total_before):.0f}% smaller)")
    print(f"wrote {OUT_CSS}")


if __name__ == "__main__":
    main()
