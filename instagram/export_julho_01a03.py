"""
Export dos 3 primeiros posts de julho/2026.
- Feed unico (post01, post03): 1 PNG 1080x1350 (postNN.png)
- Carrossel (post02): export panoramico, 5 fatias contiguas (slide_01..05.png)
"""
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright

BASE = Path(r"C:\Users\Renan\Desktop\RR\instagram\julho-2026")

SLIDE_W = 420
SLIDE_H = 525
SCALE = 1080 / 420  # -> 2.571 => saida 1080x1350


async def export_feed(page, html: Path, out_dir: Path, out_name: str):
    out_dir.mkdir(exist_ok=True)
    await page.goto(html.resolve().as_uri(), wait_until="networkidle")
    await page.wait_for_timeout(3000)
    # Isola so a area da imagem 4:5, esconde chrome do IG
    await page.evaluate("""() => {
        document.querySelectorAll('.ig-header,.ig-actions,.ig-caption')
            .forEach(el => el.style.display = 'none');
        const frame = document.querySelector('.ig-frame');
        frame.style.cssText = 'width:420px;height:525px;border-radius:0;box-shadow:none;margin:0;padding:0;overflow:hidden;';
        document.body.style.cssText = 'padding:0;margin:0;display:block;overflow:hidden;background:#07070F;';
    }""")
    await page.wait_for_timeout(300)
    out = out_dir / out_name
    await page.screenshot(path=str(out), clip={"x": 0, "y": 0, "width": SLIDE_W, "height": SLIDE_H})
    print(f"  feed -> {out.relative_to(BASE)}")


async def export_carousel(page, html: Path, out_dir: Path, total: int):
    out_dir.mkdir(exist_ok=True)
    pano_w = SLIDE_W * total
    await page.set_viewport_size({"width": pano_w, "height": SLIDE_H})
    await page.goto(html.resolve().as_uri(), wait_until="networkidle")
    await page.wait_for_timeout(3500)
    await page.evaluate(f"""() => {{
        document.querySelectorAll('.ig-header,.ig-dots,.ig-actions,.ig-caption')
            .forEach(el => el.style.display = 'none');
        const frame = document.querySelector('.ig-frame');
        frame.style.cssText = 'width:{pano_w}px;height:{SLIDE_H}px;border-radius:0;box-shadow:none;overflow:hidden;margin:0;padding:0;';
        const vp = document.querySelector('.carousel-viewport');
        vp.style.width='{pano_w}px'; vp.style.height='{SLIDE_H}px'; vp.style.overflow='visible'; vp.style.cursor='default';
        const track = document.querySelector('.carousel-track');
        track.style.transition='none'; track.style.transform='translateX(0)';
        document.body.style.cssText='padding:0;margin:0;display:block;overflow:hidden;background:#07070F;';
    }}""")
    await page.wait_for_timeout(400)
    for i in range(total):
        out = out_dir / f"slide_{i+1:02d}.png"
        await page.screenshot(path=str(out), clip={"x": i * SLIDE_W, "y": 0, "width": SLIDE_W, "height": SLIDE_H})
        print(f"  carrossel {i+1}/{total} -> {out.relative_to(BASE)}")


async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        # Feeds unicos
        page = await browser.new_page(viewport={"width": SLIDE_W, "height": SLIDE_H}, device_scale_factor=SCALE)
        print("Post 01 (feed unico):")
        await export_feed(page, BASE / "post01-humanizacao.html", BASE / "post01-slides", "post01.png")
        print("Post 03 (feed unico):")
        await export_feed(page, BASE / "post03-objecao-preco.html", BASE / "post03-slides", "post03.png")
        await page.close()
        # Carrossel
        page2 = await browser.new_page(viewport={"width": SLIDE_W * 5, "height": SLIDE_H}, device_scale_factor=SCALE)
        print("Post 02 (carrossel 5 slides):")
        await export_carousel(page2, BASE / "post02-pesquisa-google.html", BASE / "post02-slides", 5)
        await page2.close()
        await browser.close()
        print("\nPronto.")

asyncio.run(main())
