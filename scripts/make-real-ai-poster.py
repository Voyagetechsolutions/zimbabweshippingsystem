from pathlib import Path
import textwrap

from PIL import Image, ImageDraw, ImageFont, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "poster-output"
OUT_DIR.mkdir(exist_ok=True)

W, H = 1080, 1350

COLORS = {
    "green": (0, 126, 58),
    "yellow": (255, 205, 0),
    "red": (210, 16, 52),
    "black": (12, 16, 18),
    "charcoal": (26, 32, 36),
    "white": (255, 255, 255),
    "muted": (223, 229, 225),
}

FONT_DIR = Path("C:/Windows/Fonts")
FONT_HEAVY = FONT_DIR / "arialbd.ttf"
FONT_REGULAR = FONT_DIR / "arial.ttf"
FONT_BLACK = FONT_DIR / "ariblk.ttf"


def font(path: Path, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(path), size)


def cover(image: Image.Image, size: tuple[int, int], focus_y: float = 0.45) -> Image.Image:
    image = image.convert("RGB")
    src_w, src_h = image.size
    dst_w, dst_h = size
    scale = max(dst_w / src_w, dst_h / src_h)
    resized = image.resize((int(src_w * scale), int(src_h * scale)), Image.Resampling.LANCZOS)
    x = (resized.width - dst_w) // 2
    y = int((resized.height - dst_h) * focus_y)
    y = max(0, min(y, resized.height - dst_h))
    return resized.crop((x, y, x + dst_w, y + dst_h))


def rounded_mask(size: tuple[int, int], radius: int) -> Image.Image:
    mask = Image.new("L", size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, size[0], size[1]), radius=radius, fill=255)
    return mask


def paste_round(base: Image.Image, image: Image.Image, xy: tuple[int, int], radius: int) -> None:
    base.paste(image, xy, rounded_mask(image.size, radius))


def draw_wrapped(
    draw: ImageDraw.ImageDraw,
    xy: tuple[int, int],
    text: str,
    typeface: ImageFont.FreeTypeFont,
    fill: tuple[int, int, int],
    max_width: int,
    line_gap: int = 8,
) -> int:
    words = text.split()
    lines: list[str] = []
    current = ""
    for word in words:
        candidate = f"{current} {word}".strip()
        if draw.textbbox((0, 0), candidate, font=typeface)[2] <= max_width:
            current = candidate
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)

    x, y = xy
    for line in lines:
        draw.text((x, y), line, font=typeface, fill=fill)
        bbox = draw.textbbox((x, y), line, font=typeface)
        y = bbox[3] + line_gap
    return y


def draw_shadowed_panel(base: Image.Image, box: tuple[int, int, int, int], radius: int, fill) -> None:
    x1, y1, x2, y2 = box
    shadow = Image.new("RGBA", base.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sd.rounded_rectangle((x1 + 8, y1 + 14, x2 + 8, y2 + 14), radius=radius, fill=(0, 0, 0, 90))
    shadow = shadow.filter(ImageFilter.GaussianBlur(18))
    base.alpha_composite(shadow)
    ImageDraw.Draw(base).rounded_rectangle(box, radius=radius, fill=fill)


def draw_chat_bubble(
    draw: ImageDraw.ImageDraw,
    x: int,
    y: int,
    w: int,
    text: str,
    fill,
    text_fill,
    align: str = "left",
) -> int:
    body_font = font(FONT_REGULAR, 28)
    max_text = w - 40
    words = text.split()
    lines: list[str] = []
    current = ""
    for word in words:
        candidate = f"{current} {word}".strip()
        if draw.textbbox((0, 0), candidate, font=body_font)[2] <= max_text:
            current = candidate
        else:
            lines.append(current)
            current = word
    if current:
        lines.append(current)
    h = 34 * len(lines) + 34
    radius = 28
    draw.rounded_rectangle((x, y, x + w, y + h), radius=radius, fill=fill)
    ty = y + 18
    for line in lines:
        tw = draw.textbbox((0, 0), line, font=body_font)[2]
        tx = x + 22 if align == "left" else x + w - tw - 22
        draw.text((tx, ty), line, font=body_font, fill=text_fill)
        ty += 34
    return y + h + 18


def main() -> None:
    hero = Image.open(ROOT / "public" / "lovable-uploads" / "0ec045d2-2876-4b1c-8d50-24a1d290bc35.png")
    van = Image.open(ROOT / "public" / "lovable-uploads" / "0027003d-7b3b-482d-82a2-9cc4877b58b6.png")
    warehouse = Image.open(ROOT / "public" / "lovable-uploads" / "4f20ce47-cd85-486a-9872-1b0448390358.png")
    logo = Image.open(ROOT / "public" / "logo.png").convert("RGBA")

    poster = Image.new("RGBA", (W, H), COLORS["white"] + (255,))
    hero_img = cover(hero, (W, 850), focus_y=0.32).convert("RGBA")
    poster.alpha_composite(hero_img, (0, 0))

    overlay = Image.new("RGBA", (W, 850), (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    for y in range(850):
        alpha = int(185 * (y / 850) ** 1.4 + 65)
        od.line((0, y, W, y), fill=(0, 0, 0, min(230, alpha)))
    poster.alpha_composite(overlay, (0, 0))

    draw = ImageDraw.Draw(poster)
    draw.rectangle((0, 0, W, 16), fill=COLORS["green"] + (255,))
    draw.rectangle((0, 16, W, 27), fill=COLORS["yellow"] + (255,))
    draw.rectangle((0, 27, W, 38), fill=COLORS["red"] + (255,))

    logo.thumbnail((148, 148), Image.Resampling.LANCZOS)
    draw.rounded_rectangle((54, 64, 238, 214), radius=18, fill=(255, 255, 255, 242))
    poster.alpha_composite(logo, (72, 66))
    draw.text((258, 88), "Zimbabwe Shipping", font=font(FONT_HEAVY, 34), fill=COLORS["white"])
    draw.text((258, 130), "Website AI assistant", font=font(FONT_REGULAR, 24), fill=(226, 238, 229))

    headline_font = font(FONT_BLACK, 76)
    draw.text((58, 286), "Ask before", font=headline_font, fill=COLORS["white"])
    draw.text((58, 366), "you ship.", font=headline_font, fill=COLORS["white"])
    draw.rectangle((62, 466, 455, 476), fill=COLORS["yellow"] + (255,))
    draw_wrapped(
        draw,
        (58, 505),
        "Instant help with prices, bookings, tracking and shipping questions to Zimbabwe.",
        font(FONT_REGULAR, 33),
        COLORS["white"],
        570,
        10,
    )

    panel = (560, 238, 1020, 748)
    draw_shadowed_panel(poster, panel, 32, (248, 250, 248, 255))
    draw = ImageDraw.Draw(poster)
    draw.rounded_rectangle((590, 268, 990, 326), radius=22, fill=COLORS["green"] + (255,))
    draw.text((616, 283), "Zimbabwe Shipping AI", font=font(FONT_HEAVY, 26), fill=COLORS["white"])
    draw.ellipse((940, 287, 956, 303), fill=(71, 222, 121))
    draw.text((616, 333), "Online now", font=font(FONT_REGULAR, 19), fill=(84, 96, 92))

    y = 382
    y = draw_chat_bubble(
        draw,
        596,
        y,
        320,
        "How much is a UK drum?",
        (233, 239, 235, 255),
        COLORS["charcoal"],
    )
    y = draw_chat_bubble(
        draw,
        642,
        y,
        332,
        "A 200-220L drum is GBP 280.",
        COLORS["green"] + (255,),
        COLORS["white"],
        "right",
    )
    draw.text((618, 644), "Ask about bookings, tracking or prices.", font=font(FONT_REGULAR, 23), fill=(82, 94, 90))
    draw.rounded_rectangle((620, 684, 952, 724), radius=18, fill=(238, 242, 239, 255))
    draw.text((646, 690), "Type your question...", font=font(FONT_REGULAR, 20), fill=(111, 122, 118))

    draw.rounded_rectangle((0, 802, W, H), radius=0, fill=(247, 249, 247, 255))
    draw.rectangle((0, 802, W, 822), fill=COLORS["green"] + (255,))

    thumb1 = cover(van, (314, 220), focus_y=0.45).convert("RGBA")
    thumb2 = cover(warehouse, (314, 220), focus_y=0.38).convert("RGBA")
    paste_round(poster, thumb1, (58, 880), 22)
    paste_round(poster, thumb2, (396, 880), 22)
    draw = ImageDraw.Draw(poster)
    draw.rounded_rectangle((734, 880, 1022, 1100), radius=22, fill=COLORS["charcoal"] + (255,))
    draw.text((766, 913), "Use it for:", font=font(FONT_HEAVY, 32), fill=COLORS["white"])

    items = ["Prices", "Bookings", "Tracking"]
    yy = 970
    for idx, item in enumerate(items):
        color = [COLORS["yellow"], COLORS["green"], COLORS["red"]][idx]
        draw.ellipse((768, yy + 8, 784, yy + 24), fill=color + (255,))
        draw.text((800, yy), item, font=font(FONT_REGULAR, 28), fill=(238, 242, 239))
        yy += 42

    draw_wrapped(
        draw,
        (58, 1148),
        "Real shipping team. Real operations. Faster answers.",
        font(FONT_HEAVY, 34),
        COLORS["charcoal"],
        620,
        5,
    )
    draw.text((58, 1234), "Visit the website and tap the chat button.", font=font(FONT_REGULAR, 30), fill=(64, 74, 72))

    draw.rounded_rectangle((706, 1186, 1022, 1274), radius=24, fill=COLORS["green"] + (255,))
    draw.text((744, 1214), "CHAT ON WEBSITE", font=font(FONT_HEAVY, 28), fill=COLORS["white"])

    out = OUT_DIR / "zimbabwe-shipping-ai-poster-real.png"
    poster.convert("RGB").save(out, quality=96)
    print(out)


if __name__ == "__main__":
    main()
