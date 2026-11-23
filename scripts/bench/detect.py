"""Dev bench: the app's ball detector, replayed on a video on the Mac.

Same steps as src/features/ball-tracking/native/OpenCvDetector.ts (keep the two in step), with
the settings the app uses on that court, read from the repo (scripts/bench/config.cjs). Writes
what the detector finds in each frame, for scripts/bench/track.cjs.

    python scripts/bench/detect.py <video> <candidates.json>
        [--court place,surface] [--crop x,y,width,height]

--court: where the video was filmed, as the host says it when creating a session
(indoor | outdoor, then grass | hard | clay). Without it: outdoor,hard, the app's default.
--crop: the picture inside a screen recording. Needs node, opencv-python-headless and numpy
(python3 -m venv .venv-bench && .venv-bench/bin/pip install opencv-python-headless numpy).
"""

import json
import os
import subprocess
import sys

import cv2
import numpy as np

# The app's default court (sports/tennis/matchSetup.ts)
DEFAULT_COURT = 'outdoor,hard'
# logic/framesToCompare.ts
NEAR_ENOUGH = 0.9


def court_config(court):
    """The settings of a court, from logic/ballConfigFor.ts: no setting is copied here."""
    script = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'config.cjs')
    done = subprocess.run(['node', script, court], capture_output=True, text=True)
    if done.returncode != 0:
        sys.exit(done.stderr.strip() or f'node {script} failed')
    return json.loads(done.stdout)


def frames_to_compare(times, centre, span):
    """logic/framesToCompare.ts"""
    if centre == 0:
        return 'none'
    at = times[centre]
    if times[-1] - at < span * NEAR_ENOUGH:
        return 'wait'

    def closest_to(wanted, start, end):
        best = start
        for i in range(start, end + 1):
            if abs(times[i] - wanted) < abs(times[best] - wanted):
                best = i
        return best

    return closest_to(at - span, 0, centre - 1), closest_to(at + span, centre + 1, len(times) - 1)


def boxes(mask):
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    return [cv2.boundingRect(c) for c in contours]


def ball_blobs(blobs, movers, width, config):
    """logic/candidates.ts"""
    small = [m for m in movers if max(m[2], m[3]) <= config['maxMoverSide'] * width]
    candidates = []
    for bx, by, bw, bh in blobs:
        side = max(bw, bh)
        if bw * bh < config['minBallPixels'] or side > config['maxBallSide'] * width:
            continue
        x, y = bx + bw / 2, by + bh / 2
        if any(m[0] <= x <= m[0] + m[2] and m[1] <= y <= m[1] + m[3] for m in small):
            candidates.append({'x': x, 'y': y, 'r': side / 2})
    return candidates


class Detector:
    """native/OpenCvDetector.ts"""

    def __init__(self, config):
        self.config = config
        dilate = config['motionDilate']
        self.kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (dilate, dilate))
        self.history = []
        self.next = 0

    def detect(self, bgr, t):
        config = self.config
        blue, green, red = cv2.split(bgr)
        gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
        soft = cv2.GaussianBlur(gray, (config['blurSize'], config['blurSize']), 0)
        if self.history:
            change = cv2.absdiff(soft, self.history[-1]['soft']).mean()
            if change < config['repeatThreshold']:
                return []
        yellow = cv2.subtract(cv2.min(green, red), blue)
        _, not_skin = cv2.threshold(
            cv2.subtract(red, green), config['maxRedOverGreen'], 255, cv2.THRESH_BINARY_INV
        )
        self.history.append(
            {'t': t, 'gray': gray, 'soft': soft, 'yellow': yellow, 'not_skin': not_skin}
        )

        found = []
        while self.next < len(self.history):
            times = [h['t'] for h in self.history]
            pair = frames_to_compare(times, self.next, config['motionSpanS'])
            if pair == 'wait':
                break
            centre = self.history[self.next]
            found.append(
                {'t': centre['t'], 'candidates': [] if pair == 'none' else self.search(centre, *pair)}
            )
            self.next += 1
        # Frames too old to be compared with again (one before the next to judge always stays)
        if self.next < len(self.history):
            oldest = self.history[self.next]['t'] - 2 * config['motionSpanS']
            while self.next > 1 and self.history[0]['t'] < oldest:
                self.history.pop(0)
                self.next -= 1
        return found

    def search(self, centre, before, after):
        config = self.config
        before, after = self.history[before], self.history[after]

        def passing(channel, by):
            more = cv2.min(
                cv2.subtract(centre[channel], before[channel]),
                cv2.subtract(centre[channel], after[channel]),
            )
            return cv2.threshold(more, by, 255, cv2.THRESH_BINARY)[1]

        ball = cv2.bitwise_and(
            passing('gray', config['brighterBy']), passing('yellow', config['yellowerBy'])
        )
        ball = cv2.bitwise_and(ball, centre['not_skin'])
        _, motion = cv2.threshold(
            cv2.absdiff(centre['soft'], before['soft']),
            config['motionThreshold'],
            255,
            cv2.THRESH_BINARY,
        )
        motion = cv2.dilate(motion, self.kernel)
        return ball_blobs(boxes(ball), boxes(motion), centre['gray'].shape[1], config)


def main():
    path, out = sys.argv[1], sys.argv[2]
    crop = None
    if '--crop' in sys.argv:
        crop = [int(v) for v in sys.argv[sys.argv.index('--crop') + 1].split(',')]
    court = DEFAULT_COURT
    if '--court' in sys.argv:
        court = sys.argv[sys.argv.index('--court') + 1]
    config = court_config(court)
    cap = cv2.VideoCapture(path)
    detector = Detector(config)
    frames = []
    size = None
    while True:
        ok, bgr = cap.read()
        if not ok:
            break
        t = cap.get(cv2.CAP_PROP_POS_MSEC) / 1000
        if crop:
            x, y, w, h = crop
            bgr = bgr[y : y + h, x : x + w]
        # As modules/clip-frames: one pixel out of `step`, no averaging
        step = max(1, round(max(bgr.shape[:2]) / config['maxSide']))
        picture = np.ascontiguousarray(bgr[::step, ::step])
        size = picture.shape[1], picture.shape[0]
        frames += detector.detect(picture, round(t, 4))

    with open(out, 'w') as f:
        json.dump({'width': size[0], 'height': size[1], 'court': court, 'frames': frames}, f)
    counts = [len(f['candidates']) for f in frames]
    print(
        f'{court}: {len(frames)} frames of {size[0]}x{size[1]}, blobs per frame: '
        f'mean {np.mean(counts):.1f}, 9 in 10 under {np.percentile(counts, 90):.0f}, '
        f'most {max(counts)}'
    )


main()
