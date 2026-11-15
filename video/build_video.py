#!/usr/bin/env python3
"""ORBITA — 30-second demo video builder (NASA Space Apps).

Put next to this script:
    raw_screen.mp4   — your full screen recording (≈10.5 min)
    music.mp3        — optional background music (licensed / CC0 / SI-generated)

Run:
    pip install edge-tts          # once, needs internet for the voice
    brew install ffmpeg           # once
    python3 build_video.py        # → orbita_demo.mp4  (≤ 30.0 s)

Flags:
    --skip-tts      reuse vo_*.mp3 already in ./build (no internet needed)
    --female        use en-US-AriaNeural instead of en-US-ChristopherNeural
    --preview       fast low-quality encode to check timing

To fine-tune, edit only SHOTS / VOICE below. Timecodes are of raw_screen.mp4.
"""
import argparse, json, os, shutil, subprocess, sys, textwrap

HERE = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(HERE, "raw_screen.mp4")
MUSIC = os.path.join(HERE, "music.mp3")
OUT = os.path.join(HERE, "orbita_demo.mp4")
WORK = os.path.join(HERE, "build")

W, H, FPS = 1920, 1080, 30
MAX_LEN = 30.0

TEAM = "CyberAstro"
MEMBERS = ["Nurlana Nurullayeva", "Nikita Shvedov", "Ayesha Aliyeva", "Rəna Rüstəmli"]
CHALLENGE = "Health Monitoring Software for Astronauts on Space Missions"
WATERMARK = "SI-assisted video · SI-generated voice-over · Synthetic data"
METADATA_COMMENT = ("Voice-over generated with SI (edge-tts, Microsoft neural voice). "
                    "Video edited with SI assistance. Synthetic data. "
                    f"Team {TEAM}: " + ", ".join(MEMBERS) + f". Challenge: {CHALLENGE}.")

# ---------------------------------------------------------------------------
# SHOTS — one continuous story: the radiation case, end to end.
#   kind "card": generated title/end card
#   kind "clip": (src_start, src_end) in raw_screen.mp4, speed ≤ 1.5
#   chip: small step label in the top-left corner (helps the jury follow)
# ---------------------------------------------------------------------------
SHOTS = [
    dict(id="title",   kind="card", dur=3.0),
    dict(id="login",   kind="clip", src=("00:00.5", "00:02.0"), speed=1.0, chip="Astronaut · offline login"),
    dict(id="home",    kind="clip", src=("00:12.5", "00:14.0"), speed=1.0, chip="Astronaut · home"),
    dict(id="checkup", kind="clip", src=("02:19.0", "02:23.5"), speed=1.5, chip="1 · Daily check-up"),
    dict(id="alert",   kind="clip", src=("02:25.3", "02:28.3"), speed=1.0, chip="2 · Rules flag radiation"),
    dict(id="body",    kind="clip", src=("02:30.0", "02:32.5"), speed=1.0, chip="3 · Body map"),
    dict(id="ask",     kind="clip", src=("02:41.0", "02:42.5"), speed=1.0, chip="4 · Local AI explains"),
    dict(id="answer",  kind="clip", src=("02:55.0", "02:58.0"), speed=1.0, chip="4 · Local AI explains"),
    dict(id="draft",   kind="clip", src=("05:04.0", "05:07.75"), speed=1.5, chip="5 · Report to Earth"),
    dict(id="earth",   kind="clip", src=("05:48.0", "05:50.5"), speed=1.0, chip="Mission Control · Earth"),
    dict(id="reply",   kind="clip", src=("06:32.0", "06:34.5"), speed=1.0, chip="6 · Flight surgeon replies"),
    dict(id="end",     kind="card", dur=2.5),
]

# ---------------------------------------------------------------------------
# VOICE — each line starts at the beginning of shot `at` (+ offset seconds).
# The script warns if a line runs into the next one.
# ---------------------------------------------------------------------------
VOICE = [
    dict(at="title",   off=0.3, text="Mars is twenty light-minutes from any doctor. ORBITA watches crew health, fully offline."),
    dict(at="checkup", off=0.1, text="Fifty-two transparent rules check ten daily vitals against the astronaut's own baseline. Radiation: red."),
    dict(at="body",    off=0.1, text="The body map shows what's at risk."),
    dict(at="ask",     off=0.1, text="A local AI explains why. It never decides."),
    dict(at="draft",   off=0.1, text="ORBITA drafts a report for the flight surgeon. Mission Control reviews the data and replies."),
    dict(at="end",     off=0.1, text="Offline. Explainable. Ready for Mars."),
]

FONT_CANDIDATES = [
    "/System/Library/Fonts/Supplemental/Arial Unicode.ttf",
    "/Library/Fonts/Arial Unicode.ttf",
    "/System/Library/Fonts/Supplemental/Arial.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
]
BOLD_CANDIDATES = [
    "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
] + FONT_CANDIDATES

BG = "0x070B1A"
ACCENT = "0x7FD3FF"


def pick(cands):
    for c in cands:
        if os.path.exists(c):
            return c
    sys.exit("No usable font found — add a .ttf path to FONT_CANDIDATES.")


def tc(s):
    """'mm:ss.s' → seconds"""
    m, sec = s.split(":")
    return int(m) * 60 + float(sec)


def run(cmd, **kw):
    r = subprocess.run(cmd, cwd=WORK, **kw)
    if r.returncode:
        sys.exit(f"Command failed: {' '.join(map(str, cmd))}")
    return r


def duration(path):
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                          "-of", "json", path], capture_output=True, text=True).stdout
    return float(json.loads(out)["format"]["duration"])


def write(name, text):
    with open(os.path.join(WORK, name), "w", encoding="utf-8") as f:
        f.write(text)
    return name


def dt(textfile, font, size, x, y, color="white", extra=""):
    return (f"drawtext=fontfile='{font}':textfile={textfile}:expansion=none:"
            f"fontsize={size}:fontcolor={color}:x={x}:y={y}{extra}")


def shot_len(s):
    if s["kind"] == "card":
        return s["dur"]
    a, b = map(tc, s["src"])
    return round((b - a) / s["speed"], 3)


def enc_args(preview):
    return (["-c:v", "libx264", "-preset", "ultrafast" if preview else "medium",
             "-crf", "28" if preview else "18", "-pix_fmt", "yuv420p", "-r", str(FPS)])


def make_card(s, font, bold, preview):
    name = f"shot_{s['id']}.mp4"
    if s["id"] == "title":
        write("t_big.txt", "ORBITA")
        write("t_sub.txt", "Onboard Remote Biometric & Integrated Telemetry Assistant")
        write("t_team.txt", f"Team {TEAM}")
        write("t_members.txt", "  ·  ".join(MEMBERS))
        write("t_ch.txt", f"Challenge: {CHALLENGE}")
        write("t_event.txt", "NASA Space Apps Challenge")
        vf = ",".join([
            dt("t_big.txt", bold, 150, "(w-tw)/2", 190, ACCENT),
            dt("t_sub.txt", font, 40, "(w-tw)/2", 370, "0xC8D3E8"),
            dt("t_team.txt", bold, 64, "(w-tw)/2", 490),
            dt("t_members.txt", font, 40, "(w-tw)/2", 590),
            dt("t_ch.txt", font, 42, "(w-tw)/2", 700, ACCENT),
            dt("t_event.txt", font, 32, "(w-tw)/2", 775, "0x8A95AD"),
        ])
    else:
        write("e_big.txt", "ORBITA")
        write("e_tag.txt", "Offline  ·  Explainable  ·  Synthetic data")
        write("e_team.txt", f"Team {TEAM}  —  " + ", ".join(MEMBERS))
        write("e_ch.txt", f"Challenge: {CHALLENGE}")
        vf = ",".join([
            dt("e_big.txt", bold, 140, "(w-tw)/2", 280, ACCENT),
            dt("e_tag.txt", font, 56, "(w-tw)/2", 480),
            dt("e_team.txt", font, 38, "(w-tw)/2", 640, "0xC8D3E8"),
            dt("e_ch.txt", font, 38, "(w-tw)/2", 710, "0xC8D3E8"),
        ])
    run(["ffmpeg", "-y", "-loglevel", "error", "-f", "lavfi",
         "-i", f"color=c={BG}:s={W}x{H}:d={s['dur']}:r={FPS}", "-vf", vf,
         *enc_args(preview), name])
    return name


def make_clip(s, preview):
    name = f"shot_{s['id']}.mp4"
    a, b = map(tc, s["src"])
    vf = (f"setpts=(PTS-STARTPTS)/{s['speed']},"
          f"scale={W}:{H}:force_original_aspect_ratio=decrease,"
          f"pad={W}:{H}:(ow-iw)/2:(oh-ih)/2:color=black,fps={FPS},setsar=1")
    run(["ffmpeg", "-y", "-loglevel", "error", "-ss", f"{a:.3f}", "-t", f"{b - a:.3f}",
         "-i", RAW, "-an", "-vf", vf, "-t", f"{shot_len(s):.3f}", *enc_args(preview), name])
    return name


def tts(i, text, voice):
    name = f"vo_{i}.mp3"
    exe = shutil.which("edge-tts")
    cli = [exe] if exe else [sys.executable, "-m", "edge_tts"]
    run([*cli, "--voice", voice, "--rate=+0%", "--text", text, "--write-media", name])
    return name


def split_cues(text, start, dur):
    """Sentence-level subtitle cues, timed proportionally to length."""
    parts, buf = [], ""
    for word in text.split():
        buf += (" " if buf else "") + word
        if word.endswith((".", "!", "?")):
            parts.append(buf); buf = ""
    if buf:
        parts.append(buf)
    total = sum(len(p) for p in parts)
    cues, t = [], start
    for p in parts:
        d = dur * len(p) / total
        cues.append((t, t + d, p)); t += d
    return cues


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--skip-tts", action="store_true")
    ap.add_argument("--female", action="store_true")
    ap.add_argument("--preview", action="store_true")
    args = ap.parse_args()

    if not shutil.which("ffmpeg"):
        try:  # pip3 install static-ffmpeg  (no Homebrew needed)
            import static_ffmpeg
            static_ffmpeg.add_paths()
        except ImportError:
            pass
    if not args.skip_tts:
        try:
            import edge_tts  # noqa: F401
        except ImportError:
            sys.exit("edge-tts not installed: pip3 install edge-tts")
    for tool in ("ffmpeg", "ffprobe"):
        if not shutil.which(tool):
            sys.exit(f"'{tool}' not found. See the header of this script.")
    if not os.path.exists(RAW):
        sys.exit(f"Missing {RAW}")
    os.makedirs(WORK, exist_ok=True)
    font, bold = pick(FONT_CANDIDATES), pick(BOLD_CANDIDATES)
    voice = "en-US-AriaNeural" if args.female else "en-US-ChristopherNeural"

    # 1) timeline
    starts, t = {}, 0.0
    for s in SHOTS:
        starts[s["id"]] = t
        t += shot_len(s)
    total = round(t, 3)
    print(f"Timeline: {total:.2f} s")
    for s in SHOTS:
        print(f"  {starts[s['id']]:6.2f}  {s['id']:8s} {shot_len(s):5.2f}s  {s.get('chip', '')}")
    if total > MAX_LEN:
        sys.exit(f"Too long: {total:.2f} s > {MAX_LEN} s — shorten SHOTS.")

    # 2) video shots
    files = [make_card(s, font, bold, args.preview) if s["kind"] == "card"
             else make_clip(s, args.preview) for s in SHOTS]
    write("concat.txt", "".join(f"file '{f}'\n" for f in files))
    run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0",
         "-i", "concat.txt", "-c", "copy", "video_raw.mp4"])

    # 3) voice
    vo, cues = [], []
    for i, v in enumerate(VOICE):
        f = f"vo_{i}.mp3" if args.skip_tts else tts(i, v["text"], voice)
        if not os.path.exists(os.path.join(WORK, f)):
            sys.exit(f"Missing build/{f} (run without --skip-tts)")
        st = starts[v["at"]] + v["off"]
        d = duration(os.path.join(WORK, f))
        nxt = starts[VOICE[i + 1]["at"]] + VOICE[i + 1]["off"] if i + 1 < len(VOICE) else total - 0.3
        flag = "OK" if st + d <= nxt else f"!! overlaps by {st + d - nxt:.2f}s — shorten text"
        print(f"  VO{i} {st:5.2f}–{st + d:5.2f}  {flag}")
        vo.append((f, st))
        cues += split_cues(v["text"], st, d)

    # 4) final pass: chips, subtitles, watermark, fades, audio, metadata
    vf = []
    for s in SHOTS:
        if s.get("chip"):
            a = starts[s["id"]]; b = a + shot_len(s)
            n = write(f"chip_{s['id']}.txt", s["chip"].upper())
            vf.append(dt(n, bold, 30, 40, 36, "white",
                         f":box=1:boxcolor=0x0B1430@0.80:boxborderw=14:enable='between(t,{a:.3f},{b:.3f})'"))
    for k, (a, b, text) in enumerate(cues):
        n = write(f"sub_{k}.txt", "\n".join(textwrap.wrap(text, 52)))
        vf.append(dt(n, font, 44, "(w-tw)/2", "h-th-120", "white",
                     f":line_spacing=10:box=1:boxcolor=black@0.62:boxborderw=18:"
                     f"enable='between(t,{a:.3f},{b:.3f})'"))
    write("wm.txt", WATERMARK)
    vf.append(dt("wm.txt", font, 26, "w-tw-30", "h-th-28", "white@0.75",
                 ":box=1:boxcolor=black@0.35:boxborderw=8"))
    vf.append(f"fade=t=in:st=0:d=0.5,fade=t=out:st={total - 0.5:.3f}:d=0.5")

    cmd = ["ffmpeg", "-y", "-loglevel", "error", "-i", "video_raw.mp4"]
    for f, _ in vo:
        cmd += ["-i", f]
    has_music = os.path.exists(MUSIC)
    if has_music:
        cmd += ["-stream_loop", "-1", "-i", MUSIC]
    af = []
    for k, (_, st) in enumerate(vo, start=1):
        ms = int(st * 1000)
        af.append(f"[{k}:a]aresample=48000,adelay={ms}|{ms}[v{k}]")
    mix = "".join(f"[v{k}]" for k in range(1, len(vo) + 1))
    n_in = len(vo)
    if has_music:
        m = len(vo) + 1
        af.append(f"[{m}:a]aresample=48000,volume=-20dB,atrim=0:{total}[mus]")
        mix += "[mus]"; n_in += 1
    af.append(f"{mix}amix=inputs={n_in}:normalize=0:duration=longest,"
              f"apad,atrim=0:{total},afade=t=in:st=0:d=0.4,"
              f"afade=t=out:st={total - 0.6:.3f}:d=0.6[aout]")
    cmd += ["-filter_complex", ";".join(af), "-vf", ",".join(vf),
            "-map", "0:v", "-map", "[aout]", *enc_args(args.preview),
            "-c:a", "aac", "-b:a", "192k", "-t", f"{total:.3f}",
            "-metadata", f"title=ORBITA — Team {TEAM} — NASA Space Apps Challenge",
            "-metadata", f"comment={METADATA_COMMENT}",
            "-metadata", f"description={METADATA_COMMENT}",
            "-movflags", "+faststart", OUT]
    run(cmd)

    final = duration(OUT)
    print(f"\n{OUT}\nDuration: {final:.2f} s  {'OK' if final <= MAX_LEN else '!! TOO LONG'}")
    if not has_music:
        print("(no music.mp3 found — built with voice only)")


if __name__ == "__main__":
    main()
