from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
files = [ROOT / "public" / "logo.png"]
files.extend(sorted((ROOT / "public" / "lovable-uploads").glob("*.png")))

cell_w, cell_h = 300, 235
cols = 5
rows = (len(files) + cols - 1) // cols
sheet = Image.new("RGB", (cell_w * cols, cell_h * rows), "white")
draw = ImageDraw.Draw(sheet)

for idx, file in enumerate(files):
    image = Image.open(file).convert("RGB")
    original_size = image.size
    image.thumbnail((cell_w - 24, cell_h - 54))
    x = (idx % cols) * cell_w + (cell_w - image.width) // 2
    y = (idx // cols) * cell_h + 8
    sheet.paste(image, (x, y))
    tx = (idx % cols) * cell_w + 10
    ty = (idx // cols) * cell_h + cell_h - 40
    draw.text((tx, ty), file.name[:34], fill=(0, 0, 0))
    draw.text((tx, ty + 18), f"{original_size[0]}x{original_size[1]}", fill=(70, 70, 70))

out = ROOT / "poster-output" / "zimship-assets-contact.jpg"
out.parent.mkdir(parents=True, exist_ok=True)
sheet.save(out, quality=92)
print(out)
