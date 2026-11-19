#!/usr/bin/env python3
"""Assemble assets/demo.gif from the frames written by `node tools/screenshots.mjs` (assets/_frames/*.png).  Needs Pillow:  pip install pillow"""
import glob, os
from PIL import Image
root = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets')
files = sorted(glob.glob(os.path.join(root, '_frames', '*.png')))
if not files: raise SystemExit('no frames: run `node tools/screenshots.mjs` first')
ims = [Image.open(f).convert('RGB') for f in files]
scale = min(1, 720 / ims[0].width)
ims = [i.resize((int(i.width * scale), int(i.height * scale)), Image.LANCZOS) for i in ims]
pal = [i.quantize(colors=128, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE) for i in ims]
dur = [90] * len(pal); dur[5] = 700; dur[-1] = 2200          # pause before the drag starts and at the end
pal[0].save(os.path.join(root, 'demo.gif'), save_all=True, append_images=pal[1:], duration=dur, loop=0, optimize=True, disposal=2)
print('wrote assets/demo.gif', os.path.getsize(os.path.join(root, 'demo.gif')) // 1024, 'KB')
