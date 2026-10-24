# Sons de révélation des grandes raretés (24 octobre 2026)

Demande du propriétaire : les sons Hyper rare, Mythique et Secrète sont trop fades. Prompts ElevenLabs (Sound Effects), en anglais.
À l'arrivée : remplacer `assets/sfx/reveal-hr.mp3`, `reveal-m.mp3`, `reveal-s.mp3` (source gardée dans `store/sfx/reveal-<x>-source.mp3`, silence de début coupé, crête à −3 dB, fondu de sortie), régler `SAMPLE_GAIN` dans `js/ui/sound.js` si besoin. Le jeu baisse déjà la musique pendant ces sons (`duck`) et joue avant eux `suspense` / `suspensebig`.

- Hyper rare : durée 3 s, influence du prompt ≈ 70 %.
- Mythique : durée 5 s, influence ≈ 70 %.
- Secrète : durée 7 s, influence ≈ 75 %.
