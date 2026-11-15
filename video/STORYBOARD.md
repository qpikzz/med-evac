# ORBITA — 30-секундное демо: сценарий и монтаж

**Команда:** CyberAstro: Nurlana Nurullayeva, Nikita Shvedov, Ayesha Aliyeva, Rəna Rüstəmli
**Челлендж:** Health Monitoring Software for Astronauts on Space Missions

## Идея сторителлинга
Одна сквозная история без переключений между сценариями: **радиация**. Только этот кейс проходит
полный цикл продукта за 30 с:

> проблема (врач в 20 мин) → ежедневный чек-ап → правила ставят «красный» → карта тела показывает, что
> под угрозой → локальный ИИ объясняет (но не решает) → ORBITA готовит отчёт для Земли → врач на Земле отвечает.

Сон, новый аккаунт, симптомы, Mood score и пульс из записи **не используем**: второй сценарий за 30 с
запутает жюри. В левом верхнем углу каждого кадра стоит номер шага (`1 · DAILY CHECK-UP` …), а кадр
оператора помечен `MISSION CONTROL · EARTH`, чтобы было понятно, что сменилась сторона.

## Монтажный лист (таймкоды `raw_screen.mp4`)

| Время в ролике | Кадр | Из записи | Скорость | Голос (EN) |
|---|---|---|---|---|
| 0.0–3.0 | Титул: ORBITA, команда, участники, челлендж | (генерируется) | n/a | *Mars is twenty light-minutes from any doctor. ORBITA watches crew health, fully offline.* |
| 3.0–4.0 | Экран входа (звёзды) | 00:00.5–00:01.5 | 1× | ↑ |
| 4.0–5.0 | Главный экран | 00:12.5–00:13.5 | 1× | ↑ |
| 6.0–9.0 | **1 · Чек-ап:** повышаю радиацию | 02:19.0–02:23.5 | 1.5× | *Fifty-two transparent rules check ten daily vitals against the astronaut's own baseline. Radiation: red.* |
| 9.0–12.0 | **2 · Главная с красным предупреждением** о радиации | 02:25.3–02:28.3 | 1× | ↑ |
| 12.0–14.5 | **3 · Body map** | 02:30.0–02:32.5 | 1× | *The body map shows what's at risk.* |
| 14.5–16.0 | **4 · Ask Local AI:** «Why is my accumulated dose red?» | 02:41.0–02:42.5 | 1× | *A local AI explains why. It never decides.* |
| 16.0–19.0 | Ответ ИИ (ожидание 02:43–02:54 вырезано) | 02:55.0–02:58.0 | 1× | ↑ |
| 19.0–21.5 | **5 · Шаблон для Земли** → отправка | 05:04.0–05:07.75 | 1.5× | *ORBITA drafts a report for the flight surgeon. Mission Control reviews the data and replies.* |
| 21.5–24.0 | **Mission Control · Earth:** Inspect Data | 05:48.0–05:50.5 | 1× | ↑ |
| 24.0–26.5 | **6 · Ответ оператора** у астронавта | 06:32.0–06:34.5 | 1× | ↑ |
| 26.5–29.0 | Финал: Offline · Explainable · Synthetic data + команда и челлендж | (генерируется) | n/a | *Offline. Explainable. Synthetic data.* |

**Итого 28.5 с** (финальная карточка 3 с). На всём ролике: водяной знак, вшитые субтитры, fade 0.5 с.

### Что проверить по своей записи (я видео не смотрел)
Твои таймкоды указаны с точностью до секунды, так что внутри интервалов я выбрал вероятные моменты.
Открой запись и поправь `src` в `SHOTS` (`build_video.py`), если нужно:
- **checkup (02:19–02:23.5):** в кадре должен быть момент, когда вводишь большое значение радиации, в идеале с поднятым полем дозы.
- **alert (02:25.3–02:28.3):** красное предупреждение о радиации полностью видно.
- **draft (05:04–05:07.75):** шаблон и клик «Send». Если клик позже, сдвинь окно.
- **earth (05:48–05:50.5):** Inspect Data с данными астронавта.
- **reply (06:32–06:34.5):** текст ответа оператора читается.

Если меняешь длину кадра, скрипт сам пересчитает таймлайн, предупредит о наложении фраз и не даст выйти за 30 с.

## Как собрать (Mac)
```bash
cd video
cp ~/path/to/recording.mp4 raw_screen.mp4      # твоя запись
# необязательно: music.mp3 (CC0 / YouTube Audio Library), будет на −20 dB
pip install edge-tts && brew install ffmpeg
python3 build_video.py --preview               # быстро проверить тайминг
python3 build_video.py                         # финал → orbita_demo.mp4
```
`--female` даёт голос Aria вместо Christopher. `--skip-tts` пересобирает без интернета, используя уже сгенерированный голос.
Метаданные (`comment`/`description`) с пометкой про ИИ-голос и монтаж прописываются автоматически.

## Описание для YouTube (вставить как есть)
```
ORBITA — Onboard Remote Biometric & Integrated Telemetry Assistant
Team CyberAstro: Nurlana Nurullayeva, Nikita Shvedov, Ayesha Aliyeva, Rəna Rüstəmli
NASA Space Apps Challenge — Challenge: Health Monitoring Software for Astronauts on Space Missions

An offline crew-health assistant for a Mars transit: a daily check-up of 10 indicators, 52 transparent
rules comparing them with the astronaut's own baselines, a layered body map, a local AI (IBM Granite via
Ollama) that explains but never decides, and a draft report for the flight surgeon over a ~20-minute
delayed Earth link. Fully offline. All data is synthetic. Not a medical device.

SI disclosure: the voice-over was generated with SI (edge-tts, Microsoft neural voice); the video was
edited with SI assistance.
Music: <title — author — licence/link>   (or remove this line if no music)
```
Если добавляешь музыку, впиши её и в `SOURCE.md`.
