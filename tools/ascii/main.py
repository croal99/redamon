import argparse
import os
import sys
from pathlib import Path

def _resolve_hzk_path(hzk_path: str | None = None) -> Path:
    """Resolve an existing HZK font file path (e.g., HZK16/HZK24).

    Resolution order:
    1) Explicit argument `hzk_path`
    2) Environment variable `HZK16_PATH`
    3) A file named "HZK16" next to this script
    4) A file named "HZK16" in current working directory
    """
    candidates: list[Path] = []
    if hzk_path:
        candidates.append(Path(hzk_path))

    env_path = os.environ.get("HZK16_PATH")
    if env_path:
        candidates.append(Path(env_path))

    candidates.append(Path(__file__).resolve().parent / "HZK16")
    candidates.append(Path(__file__).resolve().parent / "HZK24")
    candidates.append(Path.cwd() / "HZK16")
    candidates.append(Path.cwd() / "HZK24")

    for candidate in candidates:
        try:
            if candidate.is_file():
                return candidate
        except OSError:
            continue

    searched = "\n".join(f"- {p}" for p in candidates)
    raise FileNotFoundError(
        "找不到 HZK16/HZK24 字库文件。\n"
        "可选方案：\n"
        "1) 把 HZK16 或 HZK24 放到本脚本同目录；或\n"
        "2) 设置环境变量 HZK16_PATH 指向该文件；或\n"
        "3) 运行时传入参数 --hzk /path/to/HZK16 (或 HZK24)\n"
        f"已搜索路径：\n{searched}"
    )


def _detect_font_size(font_path: Path, requested_size: int | None) -> int:
    """Detect font size (16 or 24) based on parameter or file size heuristic."""
    if requested_size in (16, 24):
        return requested_size

    try:
        file_size = font_path.stat().st_size
    except OSError:
        return 16

    return 24 if file_size >= 450 * 1024 else 16


def _render_glyph_rows(
    font_rect: bytes,
    *,
    width: int,
    height: int,
    foreground_cell: str,
    background_cell: str,
    xscale: int,
) -> list[str]:
    """Convert one glyph's dot-matrix bytes into printable rows."""
    bytes_per_row = (width + 7) // 8
    fg = foreground_cell * xscale
    bg = background_cell * xscale

    rows: list[str] = []
    for row in range(height):
        row_offset = row * bytes_per_row
        row_str = ""
        for col in range(width):
            byte_val = font_rect[row_offset + (col // 8)]
            if byte_val & (0x80 >> (col % 8)):
                row_str += fg
            else:
                row_str += bg
        rows.append(row_str)
    return rows


def text_to_ascii_art(
    text: str,
    *,
    hzk_path: str | None = None,
    size: int | None = None,
    xscale: int = 2,
    foreground_cell: str = "█",
    background_cell: str = " ",
    gap_cells: int = 1,
) -> None:
    """Render (GB2312) Chinese characters as dot-matrix ASCII art from HZK16/HZK24.

    Notes:
    - HZK16/HZK24 are GB2312 dot-matrix font libraries. Only GB2312 characters are supported.
    - The output is printed as a single block; multiple input characters are rendered on the same lines.
    """
    if xscale < 1:
        raise ValueError("xscale 必须为 >= 1 的整数")

    font_path = _resolve_hzk_path(hzk_path)
    font_size = _detect_font_size(font_path, size)
    if font_size == 16:
        width = 16
        height = 16
    elif font_size == 24:
        width = 24
        height = 24
    else:
        raise ValueError("仅支持 size=16 或 size=24")

    bytes_per_glyph = ((width + 7) // 8) * height
    gap = (background_cell * xscale) * gap_cells

    with font_path.open("rb") as font_file:
        lines: list[str] = ["" for _ in range(height)]
        for char in text:
            if char == "\n":
                for line in lines:
                    print(line.rstrip())
                print()
                lines = ["" for _ in range(height)]
                continue

            try:
                gb_bytes = char.encode("gb2312")
            except UnicodeEncodeError:
                blank = (background_cell * xscale) * width
                for row in range(height):
                    lines[row] += blank + gap
                continue

            if len(gb_bytes) != 2:
                blank = (background_cell * xscale) * width
                for row in range(height):
                    lines[row] += blank + gap
                continue

            area = gb_bytes[0] - 0xA1
            index = gb_bytes[1] - 0xA1
            if not (0 <= area <= 93 and 0 <= index <= 93):
                blank = (background_cell * xscale) * width
                for row in range(height):
                    lines[row] += blank + gap
                continue

            offset = (94 * area + index) * bytes_per_glyph
            font_file.seek(offset)
            font_rect = font_file.read(bytes_per_glyph)

            if len(font_rect) != bytes_per_glyph:
                blank = (background_cell * xscale) * width
                for row in range(height):
                    lines[row] += blank + gap
                continue

            glyph_rows = _render_glyph_rows(
                font_rect,
                width=width,
                height=height,
                foreground_cell=foreground_cell,
                background_cell=background_cell,
                xscale=xscale,
            )
            for row in range(height):
                lines[row] += glyph_rows[row] + gap

        for line in lines:
            print(line.rstrip())

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    script_dir = Path(__file__).resolve().parent
    default_hzk16_path = str(script_dir / "HZK16")
    default_hzk24_path = str(script_dir / "HZK24")
    parser.add_argument("text", nargs="?", default="赞")
    parser.add_argument("--hzk", "--hzk16", dest="hzk_path", default=None)
    parser.add_argument("--size", dest="size", choices=["auto", "16", "24"], default="auto")
    parser.add_argument("--xscale", dest="xscale", type=int, default=2)
    parser.add_argument("--foreground", dest="foreground_cell", default="█")
    parser.add_argument("--background", dest="background_cell", default=" ")
    args = parser.parse_args()

    try:
        if args.hzk_path is None:
            if args.size == "24" and Path(default_hzk24_path).is_file():
                args.hzk_path = default_hzk24_path
            elif args.size == "16" and Path(default_hzk16_path).is_file():
                args.hzk_path = default_hzk16_path
            elif Path(default_hzk16_path).is_file():
                args.hzk_path = default_hzk16_path
            else:
                args.hzk_path = default_hzk24_path

        text_to_ascii_art(
            args.text,
            hzk_path=args.hzk_path,
            size=None if args.size == "auto" else int(args.size),
            xscale=args.xscale,
            foreground_cell=args.foreground_cell,
            background_cell=args.background_cell,
        )
    except FileNotFoundError as exc:
        print(str(exc), file=sys.stderr)
        raise SystemExit(2) from None
