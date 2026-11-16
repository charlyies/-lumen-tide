# lumen-tide

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/charly/lumen-tide/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/charly/lumen-tide/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

**Lumen Tide** — a bioluminescent deep-sea arcade game. You are a Lumen Jelly, a glowing
jellyfish drifting through the dark deep sea. Catch the golden plankton orbs and chain them
into combos up to **x5**. Dodge the void eels that swim in sine waves and the drifting ink
clouds. Three lives, rising levels, and three power-ups: a **shield bubble** (one free hit),
a **magnet** (orbs fly to you for 8s), and a **starburst** (clears every enemy on screen).

## Run it

```sh
node serve.ts
# then open http://localhost:8080
```

## How to play

- **Move:** mouse (the jelly chases your pointer), WASD, or arrow keys
- **Start / restart:** Space, Enter, or click
- **Pause:** P or Esc
- **Mute:** M

## Goal

Score as much as you can. Every 15 orbs raises the level: the tide quickens, eels swim
faster and spawn more often. Golden orbs are rare and worth 50 points each (times your
combo). Lose all 3 lives and the light fades — then dive again and beat your best.

## Tech

- Pure HTML5 Canvas + vanilla ES modules — no libraries, no network requests, no assets.
  Everything (including sound, synthesised with WebAudio) is generated in code.
- Fixed 1/60 s simulation, seeded RNG: `?seed=N` replays the same spawn pattern, and
  `?shot=start|play|end` stages deterministic screenshot scenes.

## License

MIT — see [LICENSE](LICENSE).

---

<sub>Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>
