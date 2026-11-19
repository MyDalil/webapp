/** Styles de l’accueil équipe et du contrôle : variables du thème Payload, cases sobres sur une grille régulière. */
export const ADMIN_CSS = `
.ae { margin-bottom: calc(var(--base) * 1.5); }
.ae-head { display: flex; align-items: center; gap: 12px; margin-bottom: var(--base); }
.ae-head img { width: 36px; height: 36px; display: block; }
.ae-head h2 { margin: 0; font-size: 1.15rem; }
.ae-head p { margin: 0; color: var(--theme-elevation-600); font-size: .9rem; }
.ae-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px; }
.ae-card { display: grid; align-content: start; gap: 8px; min-width: 0; padding: 14px 16px; border: 1px solid var(--theme-elevation-150); border-radius: var(--style-radius-m, 8px); background: var(--theme-elevation-0); color: var(--theme-text); text-decoration: none; }
a.ae-card:hover, a.ae-card:focus-visible { border-color: var(--theme-elevation-400); }
a.ae-card:focus-visible, .ae-rows a:focus-visible { outline: 2px solid var(--theme-success-500); outline-offset: 2px; }
.ae-card h3 { margin: 0; font-size: .82rem; font-weight: 600; color: var(--theme-elevation-600); text-transform: uppercase; letter-spacing: .04em; }
.ae-num { font-size: 1.6rem; font-weight: 700; line-height: 1.1; font-variant-numeric: tabular-nums; }
.ae-num.is-zero { color: var(--theme-elevation-400); }
.ae-rows { list-style: none; margin: 0; padding: 0; display: grid; gap: 2px; }
.ae-rows a { display: flex; justify-content: space-between; gap: 8px; padding: 4px 0; color: inherit; text-decoration: none; font-size: .92rem; }
.ae-rows a:hover span { text-decoration: underline; }
.ae-rows b { font-variant-numeric: tabular-nums; }
.ae-rows b.is-zero { color: var(--theme-elevation-400); font-weight: 500; }
.ae-act { display: flex; align-items: center; gap: 10px; font-weight: 600; }
.ae-act svg { width: 20px; height: 20px; flex: none; }
.ae-card small { color: var(--theme-elevation-600); font-size: .84rem; line-height: 1.4; }
.ae-help summary { cursor: pointer; }
.ae-help ol { margin: 6px 0 0; padding-inline-start: 18px; font-size: .86rem; color: var(--theme-elevation-700); display: grid; gap: 4px; }
.ae-links { display: grid; gap: 2px; padding: 8px 0; }
.ae-links a { display: block; padding: 4px 0; color: var(--theme-text); text-decoration: none; font-size: .95rem; }
.ae-links a:hover { text-decoration: underline; }
.ct-list { list-style: none; margin: 0; padding: 0; border: 1px solid var(--theme-elevation-150); border-radius: var(--style-radius-m, 8px); }
.ct-list > li { padding: 12px 16px; border-top: 1px solid var(--theme-elevation-100); }
.ct-list > li:first-child { border-top: 0; }
.ct-row { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 4px 16px; }
.ct-row span { display: inline-flex; align-items: center; gap: 8px; }
.ct-dot { width: 10px; height: 10px; border-radius: 50%; background: var(--theme-success-500); flex: none; }
.ct-dot.is-alert { background: var(--theme-warning-500, #d97706); }
.ct-sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
.ct-row b { font-variant-numeric: tabular-nums; overflow-wrap: anywhere; }
.ct-list details { margin-top: 6px; font-size: .86rem; color: var(--theme-elevation-700); }
.ct-list details ul { margin: 6px 0 0; padding-inline-start: 18px; display: grid; gap: 2px; overflow-wrap: anywhere; }
.vl-what { display: inline-flex; flex-wrap: wrap; align-items: baseline; gap: 4px 10px; min-width: 0; }
.vl-what a { color: var(--theme-text); font-weight: 600; overflow-wrap: anywhere; }
.vl-kind { font-size: .75rem; font-weight: 600; text-transform: uppercase; letter-spacing: .04em; color: var(--theme-elevation-600); }
.vl-date { font-size: .8rem; color: var(--theme-elevation-500); }
.vl-act { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
.vl-note { min-width: 0; width: 180px; padding: 5px 8px; border: 1px solid var(--theme-elevation-150); border-radius: var(--style-radius-s, 4px); background: var(--theme-input-bg, var(--theme-elevation-0)); color: var(--theme-text); font-size: .85rem; }
.vl-btn { padding: 5px 12px; border: 1px solid var(--theme-success-500); border-radius: var(--style-radius-s, 4px); background: var(--theme-success-500); color: #fff; font-weight: 600; font-size: .85rem; cursor: pointer; }
.vl-btn.is-secondary { background: transparent; color: var(--theme-text); border-color: var(--theme-elevation-300); }
.vl-btn:disabled { opacity: .6; cursor: progress; }
.vl-btn:focus-visible, .vl-note:focus-visible, .vl-open:focus-visible { outline: 2px solid var(--theme-success-500); outline-offset: 2px; }
.vl-open { color: var(--theme-text); font-size: .9rem; }
.vl-msg { font-size: .82rem; color: var(--theme-success-600, var(--theme-text)); }
.vl-msg.is-error { color: var(--theme-error-500, #b91c1c); }
@media (max-width: 600px) { .vl-note { width: 100%; } }
.rb-row { align-items: center; padding: 6px 0; }
.rb-row b { font-weight: 600; }
.rb-sub { margin-inline-start: 8px; color: var(--theme-elevation-500); font-size: .8rem; }
.rb-cats { display: grid; padding-inline-start: 18px; }
.rb-switch { display: inline-flex; align-items: center; gap: 8px; min-height: 32px; padding: 4px 6px; border: 0; background: none; color: var(--theme-text); font-size: .85rem; cursor: pointer; }
.rb-switch:disabled { cursor: not-allowed; opacity: .7; }
.rb-switch:focus-visible { outline: 2px solid var(--theme-success-500); outline-offset: 2px; border-radius: var(--style-radius-s, 4px); }
.rb-knob { position: relative; width: 34px; height: 20px; flex: none; border-radius: 10px; background: var(--theme-elevation-300); transition: background .15s; }
.rb-knob::after { content: ''; position: absolute; top: 2px; inset-inline-start: 2px; width: 16px; height: 16px; border-radius: 50%; background: #fff; transition: transform .15s; }
.rb-switch.is-on .rb-knob { background: var(--theme-success-500); }
.rb-switch.is-on .rb-knob::after { transform: translateX(14px); }
[dir='rtl'] .rb-switch.is-on .rb-knob::after { transform: translateX(-14px); }
.rb-state { min-width: 6.5em; text-align: start; font-variant-numeric: tabular-nums; }
.rb-message { display: grid; gap: 6px; margin-bottom: 8px; }
.rb-message label { font-weight: 600; }
.rb-message small { color: var(--theme-elevation-600); font-size: .84rem; }
.rb-input { width: min(420px, 100%); }
@media (prefers-reduced-motion: reduce) { .rb-knob, .rb-knob::after { transition: none; } }
@media (max-width: 600px) { .ae-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; } .ae-card { padding: 12px; } .ae-num { font-size: 1.35rem; } .ae-wide { grid-column: 1 / -1; } }
`
