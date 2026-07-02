"""
Export panorâmico: renderiza todos os slides de uma vez (viewport 2940px),
depois clipa 7 fatias do mesmo frame. Bordas adjacentes são pixels contíguos
— garante transição perfeita no swipe do Instagram.
"""
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright

INPUT_HTML   = Path(r"C:\Users\Renan\Desktop\RR\instagram\post02-carousel.html")
OUTPUT_DIR   = Path(r"C:\Users\Renan\Desktop\RR\instagram\post02-slides")
OUTPUT_DIR.mkdir(exist_ok=True)

TOTAL_SLIDES = 7
SLIDE_W      = 420
SLIDE_H      = 525
SCALE        = 1080 / 420
PANORAMIC_W  = SLIDE_W * TOTAL_SLIDES  # 2940px

async def export():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page(
            viewport={"width": PANORAMIC_W, "height": SLIDE_H},
            device_scale_factor=SCALE,
        )

        url = INPUT_HTML.resolve().as_uri()
        await page.goto(url, wait_until="networkidle")
        await page.wait_for_timeout(3500)

        await page.evaluate(f"""() => {{
            document.querySelectorAll('.ig-header,.ig-dots,.ig-actions,.ig-caption')
                .forEach(el => el.style.display = 'none');

            const frame = document.querySelector('.ig-frame');
            frame.style.cssText = 'width:{PANORAMIC_W}px;height:{SLIDE_H}px;border-radius:0;box-shadow:none;overflow:hidden;margin:0;padding:0;';

            const vp = document.querySelector('.carousel-viewport');
            vp.style.width    = '{PANORAMIC_W}px';
            vp.style.height   = '{SLIDE_H}px';
            vp.style.overflow = 'visible';
            vp.style.cursor   = 'default';

            const track = document.querySelector('.carousel-track');
            track.style.transition = 'none';
            track.style.transform  = 'translateX(0)';

            document.body.style.cssText = 'padding:0;margin:0;display:block;overflow:hidden;background:#07070F;';
        }}""")
        await page.wait_for_timeout(400)

        for i in range(TOTAL_SLIDES):
            out = OUTPUT_DIR / f"slide_{i+1:02d}.png"
            await page.screenshot(
                path=str(out),
                clip={"x": i * SLIDE_W, "y": 0, "width": SLIDE_W, "height": SLIDE_H}
            )
            print(f"  slide {i+1}/{TOTAL_SLIDES} -> {out.name}")

        await browser.close()
        print(f"\nPronto! {TOTAL_SLIDES} PNGs em: {OUTPUT_DIR}")

asyncio.run(export())
