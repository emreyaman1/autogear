"""Renders demo.html to out/demo.gif and out/demo.mp4; the README shows a copy of the GIF.

  python docs/demo/render.py            all frames, then the GIF and the MP4
  python docs/demo/render.py 1.5 7 18   only these moments, as PNGs, to look at

Needs Python with playwright, Microsoft Edge (or Chrome) and ffmpeg on the PATH.
The animation is a function of time (demo.html), so every frame is exact.
"""
import pathlib, subprocess, sys, tempfile

from playwright.sync_api import sync_playwright

HERE = pathlib.Path(__file__).resolve().parent
OUT = HERE / 'out'
FPS = 12


def open_page(play):
    browser = play.chromium.launch(channel='msedge')
    page = browser.new_page(viewport={'width': 1280, 'height': 720})
    page.goto((HERE / 'demo.html').as_uri())
    return browser, page


def main():
    OUT.mkdir(exist_ok=True)
    with sync_playwright() as play:
        browser, page = open_page(play)
        duration = page.evaluate('window.DURATION')
        if len(sys.argv) > 1:
            for moment in sys.argv[1:]:
                page.evaluate(f'render({float(moment)})')
                page.screenshot(path=str(OUT / f'frame-{moment}.png'))
            browser.close()
            return
        frames = pathlib.Path(tempfile.mkdtemp(prefix='autogear-frames-'))
        total = int(duration * FPS)
        for i in range(total):
            page.evaluate(f'render({i / FPS})')
            page.screenshot(path=str(frames / f'{i:04d}.png'))
        browser.close()
    pattern = str(frames / '%04d.png')
    palette = str(frames / 'palette.png')
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-framerate', str(FPS), '-i', pattern, '-vf', 'scale=960:-1:flags=lanczos,palettegen=stats_mode=diff', palette], check=True)
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-framerate', str(FPS), '-i', pattern, '-i', palette, '-lavfi', 'scale=960:-1:flags=lanczos[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=4', str(OUT / 'demo.gif')], check=True)
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-framerate', str(FPS), '-i', pattern, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', str(OUT / 'demo.mp4')], check=True)
    print('frames', total, 'in', frames)


main()
