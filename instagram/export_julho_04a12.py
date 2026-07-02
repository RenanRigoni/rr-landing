"""
Export dos posts 04-12 de julho/2026.
- Feeds unicos: 1 PNG 1080x1350 (postNN.png)
- Carrosseis: export panoramico, 5 fatias contiguas (slide_01..05.png)
"""
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright

BASE = Path(r"C:\Users\Renan\Desktop\RR\instagram\julho-2026")
SLIDE_W = 420
SLIDE_H = 525
SCALE = 1080 / 420

FEEDS = [
    ("post05-2h-manha.html", "post05-slides", "post05.png"),
    ("post06-google-meu-negocio.html", "post06-slides", "post06.png"),
    ("post08-custo-invisibilidade.html", "post08-slides", "post08.png"),
    ("post10-vagas-julho.html", "post10-slides", "post10.png"),
    ("post12-encerramento.html", "post12-slides", "post12.png"),
]
CAROUSELS = [
    ("post04-com-vs-sem-site.html", "post04-slides"),
    ("post07-faq.html", "post07-slides"),
    ("post09-segmentacao.html", "post09-slides"),
    ("post11-do-brief-ao-site.html", "post11-slides"),
]


async def export_feed(page, html: Path, out_dir: Path, out_name: str):
    out_dir.mkdir(exist_ok=True)
    await page.goto(html.resolve().as_uri(), wait_until="networkidle")
    await page.wait_for_timeout(3000)
    await page.evaluate("""() => {
        document.querySelectorAll('.ig-header,.ig-actions,.ig-caption').forEach(el => el.style.display = 'none');
        const frame = document.querySelector('.ig-frame');
        frame.style.cssText = 'width:420px;height:525px;border-radius:0;box-shadow:none;margin:0;padding:0;overflow:hidden;';
        document.body.style.cssText = 'padding:0;margin:0;display:block;overflow:hidden;background:#07070F;';
    }""")
    await page.wait_for_timeout(300)
    await page.screenshot(path=str(out_dir / out_name), clip={"x": 0, "y": 0, "width": SLIDE_W, "height": SLIDE_H})
    print(f"  feed -> {out_dir.name}/{out_name}")


async def export_carousel(page, html: Path, out_dir: Path, total: int = 5):
    out_dir.mkdir(exist_ok=True)
    pano_w = SLIDE_W * total
    await page.set_viewport_size({"width": pano_w, "height": SLIDE_H})
    await page.goto(html.resolve().as_uri(), wait_until="networkidle")
    await page.wait_for_timeout(3500)
    await page.evaluate(f"""() => {{
        document.querySelectorAll('.ig-header,.ig-dots,.ig-actions,.ig-caption').forEach(el => el.style.display = 'none');
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
        await page.screenshot(path=str(out_dir / f"slide_{i+1:02d}.png"), clip={"x": i * SLIDE_W, "y": 0, "width": SLIDE_W, "height": SLIDE_H})
    print(f"  carrossel -> {out_dir.name}/ ({total} slides)")


async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page(viewport={"width": SLIDE_W, "height": SLIDE_H}, device_scale_factor=SCALE)
        print("Feeds unicos:")
        for html, folder, name in FEEDS:
            await export_feed(page, BASE / html, BASE / folder, name)
        await page.close()
        page2 = await browser.new_page(viewport={"width": SLIDE_W * 5, "height": SLIDE_H}, device_scale_factor=SCALE)
        print("Carrosseis:")
        for html, folder in CAROUSELS:
            await export_carousel(page2, BASE / html, BASE / folder)
        await page2.close()
        await browser.close()
        print("\nPronto.")

asyncio.run(main())
