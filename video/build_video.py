#!/usr/bin/env python3
"""ORBITA — 30-second demo video builder (NASA Space Apps).

Put next to this script:
    raw_screen.mp4   — your full screen recording (≈10.5 min)
    logo.png         — team logo with transparent background (optional)
    music.mp3        — optional background music (licensed / CC0 / SI-generated)

Run:
    pip3 install static-ffmpeg edge-tts   # once (or: brew install ffmpeg)
    python3 build_video.py                # → orbita_demo.mp4  (28.5 s)

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
LOGO = os.path.join(HERE, "logo.png")
OUT = os.path.join(HERE, "orbita_demo.mp4")
WORK = os.path.join(HERE, "build")

W, H, FPS = 1920, 1080, 30
MAX_LEN = 28.5          # hard limit is 30.0 — keep a safety margin
VOICE_RATES = ["+5%", "+10%", "+15%", "+20%"]   # tried in order until it fits

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
# Lengths × 30 fps should be whole frames (multiples of 0.1 s are fine).
# ---------------------------------------------------------------------------
SHOTS = [
    dict(id="title",   kind="card", dur=2.8),
    dict(id="login",   kind="clip", src=("00:00.5", "00:01.7"), speed=1.0, chip="Astronaut · offline login"),
    dict(id="home",    kind="clip", src=("00:12.5", "00:13.8"), speed=1.0, chip="Astronaut · home"),
    dict(id="checkup", kind="clip", src=("02:19.0", "02:23.5"), speed=1.5, chip="1 · Daily check-up"),
    dict(id="alert",   kind="clip", src=("02:25.3", "02:28.0"), speed=1.0, chip="2 · Rules flag radiation"),
    dict(id="body",    kind="clip", src=("02:30.0", "02:32.3"), speed=1.0, chip="3 · Body map"),
    dict(id="ask",     kind="clip", src=("02:41.0", "02:42.3"), speed=1.0, chip="4 · Local AI explains"),
    dict(id="answer",  kind="clip", src=("02:55.0", "02:57.7"), speed=1.0, chip="4 · Local AI explains"),
    dict(id="draft",   kind="clip", src=("05:04.0", "05:07.75"), speed=1.5, chip="5 · Report to Earth"),
    dict(id="earth",   kind="clip", src=("05:48.0", "05:50.3"), speed=1.0, chip="Mission Control · Earth"),
    dict(id="reply",   kind="clip", src=("06:32.0", "06:34.4"), speed=1.0, chip="6 · Flight surgeon replies"),
    dict(id="end",     kind="card", dur=4.0),
]

# ---------------------------------------------------------------------------
# VOICE — each line starts at shot `at` (+ off), but never before the previous
# line has finished (+0.15 s gap). The last line must end ≥ 0.8 s before the end.
# ---------------------------------------------------------------------------
VOICE = [
    dict(at="title",   off=0.3, text="Mars is twenty minutes from any doctor. ORBITA guards crew health offline."),
    dict(at="checkup", off=0.1, text="Fifty-two rules compare daily vitals with the astronaut's own baseline. Radiation: red."),
    dict(at="body",    off=0.1, text="The body map shows the risk."),
    dict(at="ask",     off=0.1, text="Local AI explains. It never decides."),
    dict(at="draft",   off=0.1, text="ORBITA drafts a report, and Earth replies."),
    dict(at="end",     off=0.2, text="Offline. Explainable. Ready for Mars."),
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

ACCENT = "0x8FB8FF"     # logo blue-violet
SOFT = "0x9FB3D9"
WHITE = "0xEEF3FF"


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


def fade_in(delay, dur=0.45):
    return f":alpha='min(1,max(0,(t-{delay})/{dur}))'"


def shot_len(s):
    if s["kind"] == "card":
        return s["dur"]
    a, b = map(tc, s["src"])
    return round((b - a) / s["speed"], 3)


def enc_args(preview):
    return (["-c:v", "libx264", "-preset", "ultrafast" if preview else "medium",
             "-crf", "28" if preview else "18", "-pix_fmt", "yuv420p", "-r", str(FPS)])


# ------------------------------------------------------------------ cards ---
def make_background(name, cx, cy):
    """Deep-space still: navy gradient + soft glow behind the logo + stars."""
    g = f"exp(-((X-{cx})*(X-{cx})+(Y-{cy})*(Y-{cy}))/(2*430*430))"
    v = f"(1-0.35*Y/H)"
    run(["ffmpeg", "-y", "-loglevel", "error", "-f", "lavfi", "-i", f"color=black:s={W}x{H}",
         "-frames:v", "1", "-vf",
         f"format=rgb24,geq=r='{v}*(5+34*{g})':g='{v}*(8+48*{g})':b='{v}*(20+105*{g})'",
         "glow.png"])
    run(["ffmpeg", "-y", "-loglevel", "error", "-f", "lavfi", "-i", f"color=black:s={W}x{H}",
         "-frames:v", "1", "-vf",
         "format=gray,noise=alls=100:allf=u,lut=y='if(gt(val,251),255,0)',"
         "gblur=sigma=0.8,lut=y='min(255,val*2.2)',format=rgb24", "stars.png"])
    run(["ffmpeg", "-y", "-loglevel", "error", "-i", "glow.png", "-i", "stars.png",
         "-filter_complex", "[1]colorchannelmixer=rr=0.75:gg=0.82:bb=1.0[s];"
         "[0][s]blend=all_mode=screen", "-frames:v", "1", name])
    return name


def make_card(s, font, bold, preview):
    name = f"shot_{s['id']}.mp4"
    d = s["dur"]
    has_logo = os.path.exists(LOGO)
    if s["id"] == "title":
        lx, ly, ls = 210, 290, 470                      # logo box
        bg = make_background("bg_title.png", lx + ls // 2, ly + ls // 2)
        tx = 760 if has_logo else "(w-tw)/2"
        write("t_big.txt", "ORBITA")
        write("t_sub.txt", "Onboard Remote Biometric & Integrated Telemetry Assistant")
        write("t_team.txt", f"TEAM {TEAM.upper()}")
        write("t_m1.txt", f"{MEMBERS[0]}  ·  {MEMBERS[1]}")
        write("t_m2.txt", f"{MEMBERS[2]}  ·  {MEMBERS[3]}")
        write("t_chl.txt", "CHALLENGE")
        write("t_ch1.txt", "Health Monitoring Software for Astronauts")
        write("t_ch2.txt", "on Space Missions")
        write("t_ev.txt", "NASA Space Apps Challenge")
        text = [
            dt("t_big.txt", bold, 150, tx, 200, WHITE, fade_in(0.15)),
            dt("t_sub.txt", font, 31, tx, 375, SOFT, fade_in(0.3)),
            f"drawbox=x={tx if has_logo else 900}:y=438:w=120:h=4:color={ACCENT}@0.95:t=fill:enable='gte(t,0.4)'",
            dt("t_team.txt", bold, 44, tx, 472, ACCENT, fade_in(0.45)),
            dt("t_m1.txt", font, 36, tx, 540, WHITE, fade_in(0.55)),
            dt("t_m2.txt", font, 36, tx, 590, WHITE, fade_in(0.6)),
            dt("t_chl.txt", bold, 24, tx, 676, SOFT, fade_in(0.7)),
            dt("t_ch1.txt", font, 40, tx, 712, WHITE, fade_in(0.75)),
            dt("t_ch2.txt", font, 40, tx, 762, WHITE, fade_in(0.8)),
            dt("t_ev.txt", font, 26, tx, 836, SOFT, fade_in(0.9)),
        ]
    else:
        ls = 300
        lx, ly = (W - ls) // 2, 95
        bg = make_background("bg_end.png", W // 2, ly + ls // 2)
        write("e_big.txt", "ORBITA")
        write("e_tag.txt", "Offline   ·   Explainable   ·   Ready for Mars")
        write("e_team.txt", f"Team {TEAM}  —  " + ", ".join(MEMBERS))
        write("e_ch.txt", f"Challenge: {CHALLENGE}")
        write("e_ev.txt", "NASA Space Apps Challenge  ·  Synthetic data  ·  Not a medical device")
        y0 = 420 if has_logo else 300
        text = [
            dt("e_big.txt", bold, 120, "(w-tw)/2", y0, WHITE, fade_in(0.15)),
            dt("e_tag.txt", font, 50, "(w-tw)/2", y0 + 160, ACCENT, fade_in(0.35)),
            f"drawbox=x=(iw-120)/2:y={y0 + 250}:w=120:h=4:color={ACCENT}@0.95:t=fill:enable='gte(t,0.5)'",
            dt("e_team.txt", font, 32, "(w-tw)/2", y0 + 285, WHITE, fade_in(0.6)),
            dt("e_ch.txt", font, 32, "(w-tw)/2", y0 + 333, WHITE, fade_in(0.7)),
            dt("e_ev.txt", font, 25, "(w-tw)/2", y0 + 395, SOFT, fade_in(0.8)),
        ]
    # slow drift of the starfield + logo fade-in + text
    drift = (f"[0]scale={W + 64}:{H + 36},crop={W}:{H}:x='32+32*sin(t/{d}*1.6)':y='18*t/{d}'"
             f",setsar=1[b]")
    inputs = ["-loop", "1", "-framerate", str(FPS), "-t", str(d), "-i", bg]
    if has_logo:
        inputs += ["-loop", "1", "-framerate", str(FPS), "-t", str(d), "-i", LOGO]
        fc = (f"{drift};[1]scale={ls}:{ls},format=rgba,fade=t=in:st=0:d=0.6:alpha=1[l];"
              f"[b][l]overlay={lx}:{ly}[v];[v]" + ",".join(text) + "[o]")
    else:
        fc = f"{drift};[b]" + ",".join(text) + "[o]"
    run(["ffmpeg", "-y", "-loglevel", "error", *inputs, "-filter_complex", fc,
         "-map", "[o]", "-t", str(d), *enc_args(preview), name])
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


def tts(i, text, voice, rate):
    name = f"vo_{i}.mp3"
    exe = shutil.which("edge-tts")
    cli = [exe] if exe else [sys.executable, "-m", "edge_tts"]
    run([*cli, "--voice", voice, f"--rate={rate}", "--text", text, "--write-media", name])
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
    if not os.path.exists(LOGO):
        print("(no logo.png found — cards without logo)")

    # 1) timeline
    starts, t = {}, 0.0
    for s in SHOTS:
        starts[s["id"]] = t
        t += shot_len(s)
    total = round(t, 3)
    print(f"Timeline: {total:.2f} s")
    for s in SHOTS:
        print(f"  {starts[s['id']]:6.2f}  {s['id']:8s} {shot_len(s):5.2f}s  {s.get('chip', '')}")
    if total > MAX_LEN + 1e-6:
        sys.exit(f"Too long: {total:.2f} s > {MAX_LEN} s — shorten SHOTS.")

    # 2) voice (first, so a timing problem stops the build early)
    def layout(durs):
        out, prev = [], 0.0
        for i, (v, d) in enumerate(zip(VOICE, durs)):
            st = max(starts[v["at"]] + v["off"], prev + 0.15 if i else 0.0)
            prev = st + d
            out.append(st)
        return out, prev

    for rate in ([None] if args.skip_tts else VOICE_RATES):
        files = []
        for i, v in enumerate(VOICE):
            f = f"vo_{i}.mp3" if args.skip_tts else tts(i, v["text"], voice, rate)
            if not os.path.exists(os.path.join(WORK, f)):
                sys.exit(f"Missing build/{f} (run without --skip-tts)")
            files.append(f)
        durs = [duration(os.path.join(WORK, f)) for f in files]
        vstarts, prev_end = layout(durs)
        ok = prev_end <= total - 0.8
        print(f"Voice rate {rate or '(existing)'}: speech {sum(durs):.1f} s, ends at {prev_end:.2f} s"
              f"  {'OK' if ok else '— too long'}")
        if ok:
            break
    vo, cues = [], []
    for v, f, st, d in zip(VOICE, files, vstarts, durs):
        print(f"  VO {st:5.2f}–{st + d:5.2f}  {v['text']}")
        vo.append((f, st))
        cues += split_cues(v["text"], st, d)
    if not ok:
        print(f"!! Voice ends at {prev_end:.2f} s, too close to the end ({total:.2f} s). "
              f"Shorten a VOICE line.")

    # 3) video shots
    files = [make_card(s, font, bold, args.preview) if s["kind"] == "card"
             else make_clip(s, args.preview) for s in SHOTS]
    write("concat.txt", "".join(f"file '{f}'\n" for f in files))
    run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0",
         "-i", "concat.txt", "-c", "copy", "video_raw.mp4"])

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
    vf.append(dt("wm.txt", font, 28, "w-tw-30", "h-th-26", "white@0.9",
                 ":box=1:boxcolor=black@0.5:boxborderw=9"))
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
              f"apad,atrim=0:{total},afade=t=in:st=0:d=0.3,"
              f"afade=t=out:st={total - 0.5:.3f}:d=0.5[aout]")
    cmd += ["-filter_complex", ";".join(af), "-vf", ",".join(vf),
            "-map", "0:v", "-map", "[aout]", *enc_args(args.preview),
            "-c:a", "aac", "-b:a", "192k", "-t", f"{total:.3f}",
            "-metadata", f"title=ORBITA — Team {TEAM} — NASA Space Apps Challenge",
            "-metadata", f"comment={METADATA_COMMENT}",
            "-metadata", f"description={METADATA_COMMENT}",
            "-movflags", "+faststart", OUT]
    run(cmd)

    final = duration(OUT)
    print(f"\n{OUT}\nDuration: {final:.2f} s  {'OK' if final <= 30.0 else '!! TOO LONG'}")
    if not ok:
        print("!! Voice timing warning above — the last words may be cut.")
    if not has_music:
        print("(no music.mp3 found — built with voice only)")


if __name__ == "__main__":
    main()
