# Landing vector art

Token-driven decorative SVGs for the Kettles marketing page. Every component accepts standard SVG props, has no fixed rendered dimensions, and can be sized with `className` or other SVG attributes.

| Component | Landing placement | Purpose |
| --- | --- | --- |
| `HeroBackdrop` | Hero | A full-bleed soft wash and asymmetric contour lines behind the headline and product preview. |
| `SteamMotif` | Hero and small brand moments | The signature rising steam curl. Its `steam-motif__plume`, `steam-motif__curl`, and `steam-motif__droplet` classes are stable animation hooks. |
| `FocusRingArt` | Timer / focus section | A restrained progress ring that represents a task-linked focus brew. |
| `TaskStackArt` | Task workflow section | Staggered task cards moving from selection to completion. |
| `CalendarGridArt` | Calendar / scheduling section | A cropped weekly grid with a few deliberately protected focus blocks. |
| `ReportSparkArt` | Weekly report / analytics section | A readable report panel that connects logged time to an upward weekly story. |
| `SectionDivider` | Between major landing sections | A shallow steam-like wave for transitioning between surface tones without a hard horizontal break. |

## Steam animation example

`SteamMotif` does not prescribe motion, so the landing page can coordinate it with the rest of the reveal system. Animate only transforms and opacity, and include a reduced-motion fallback.

```css
.steam-motif__curl {
  animation: steam-drift 4s ease-in-out infinite alternate;
}

.steam-motif__curl--right {
  animation-delay: -2s;
}

@keyframes steam-drift {
  from {
    opacity: 0.55;
    transform: translateY(3px) scaleX(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(-3px) scaleX(1.02);
  }
}

@media (prefers-reduced-motion: reduce) {
  .steam-motif__curl {
    animation: none;
  }
}
```
