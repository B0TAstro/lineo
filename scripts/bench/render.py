"""Dev bench: the video with what the detector found (grey rings) and the ball's path (yellow
where it is detected, orange where it is only predicted), to judge the tracking by eye.

    python scripts/bench/render.py <video> <track.json> <out.mp4> [--crop x,y,width,height]

<track.json> comes from scripts/bench/track.cjs. Same --crop as for detect.py.
"""

import json
import sys

import cv2
import numpy as np

TRAIL = 20


def main():
    path, track_path, out = sys.argv[1], sys.argv[2], sys.argv[3]
    crop = None
    if '--crop' in sys.argv:
        crop = [int(v) for v in sys.argv[sys.argv.index('--crop') + 1].split(',')]
    track = json.load(open(track_path))
    width, height = track['width'], track['height']
    frames = track['frames']
    rank = {frame['t']: i for i, frame in enumerate(frames)}
    rate = len(frames) / max(1e-3, frames[-1]['t'] - frames[0]['t'])
    writer = cv2.VideoWriter(out, cv2.VideoWriter_fourcc(*'avc1'), rate, (width, height))

    cap = cv2.VideoCapture(path)
    while True:
        ok, bgr = cap.read()
        if not ok:
            break
        i = rank.get(round(cap.get(cv2.CAP_PROP_POS_MSEC) / 1000, 4))
        if i is None:
            continue
        if crop:
            x, y, w, h = crop
            bgr = bgr[y : y + h, x : x + w]
        step = max(1, round(max(bgr.shape[:2]) / max(width, height)))
        picture = np.ascontiguousarray(bgr[::step, ::step][:height, :width])
        for blob in frames[i]['candidates']:
            cv2.circle(picture, (int(blob['x']), int(blob['y'])), 5, (200, 200, 200), 1, cv2.LINE_AA)
        previous = None
        for frame in frames[max(0, i - TRAIL) : i + 1]:
            ball = frame['ball']
            point = (round(ball['x']), round(ball['y'])) if ball else None
            if point and previous:
                cv2.line(picture, previous, point, (0, 200, 255), 2, cv2.LINE_AA)
            previous = point
        ball = frames[i]['ball']
        if ball:
            color = (0, 255, 255) if ball['state'] == 'detected' else (0, 140, 255)
            cv2.circle(picture, (round(ball['x']), round(ball['y'])), 14, color, 2, cv2.LINE_AA)
        writer.write(picture)
    writer.release()
    print(f'{out}: {len(frames)} frames at {rate:.1f} per second')


main()
