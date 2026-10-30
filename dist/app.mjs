import { FoldGame, DEFAULT_PROBABILITY, DURATIONS } from './game.mjs';
import { PhoneRenderer } from './phone-renderer.mjs';
import { chooseLanguage, messages, LANGUAGE_KEY } from './i18n.mjs';
import { PhysicalFoldControl } from './device-posture.mjs';

const $ = id => document.getElementById(id);
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let draftProbability = DEFAULT_PROBABILITY;
let draftEdited = false;
let previousPhase;
let currentSnapshot;
let physicalControl;
let physicalState={availability:'checking',enabled:false};
let preferredLanguage;
try { preferredLanguage = localStorage.getItem(LANGUAGE_KEY); } catch { /* Private mode may disable storage. */ }
if (!['zh','en'].includes(preferredLanguage)) preferredLanguage = undefined;
const browserLanguages = () => navigator.languages?.length ? navigator.languages : [navigator.language];
let language = chooseLanguage(preferredLanguage, browserLanguages());
const phone = new PhoneRenderer($('phone-canvas'),language);

function renderSettingsNote() {
  const t = messages[language];
  const percentage = Number((draftProbability * 100).toFixed(1));
  $('settings-note').textContent = draftEdited ? t.draftNote(percentage) : t.settingsNote;
}

function renderPhysicalState() {
  const s=physicalState;
  let state=s.availability;
  if(state === 'available') state=!s.enabled?'disabled':s.hidden?'paused':s.armed?'armed':s.posture==='folded'?'folded':'ready';
  $('posture-status').textContent=messages[language].postureStates[state];
  $('physical-fold').checked=s.enabled;
  $('physical-fold').disabled=s.availability !== 'available';
}

function applyLanguage(next) {
  language = next;
  const t = messages[language];
  document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en';
  document.title = t.title;
  for (const element of document.querySelectorAll('[data-i18n]')) element.textContent = t[element.dataset.i18n];
  $('language-switch').setAttribute('aria-label',t.languageAria);
  $('language-zh').setAttribute('aria-pressed',String(language === 'zh'));
  $('language-en').setAttribute('aria-pressed',String(language === 'en'));
  $('probability-range').setAttribute('aria-label',t.probabilityAria);
  renderSettingsNote();
  renderPhysicalState();
  phone.setLanguage(language);
  if(currentSnapshot) render(currentSnapshot);
}

function render({ phase, score, probability }) {
  currentSnapshot = { phase, score, probability };
  const t = messages[language];
  const folded = phase === 'folding' || phase === 'closed';
  const moving = folded || phase === 'unfolding';
  const broken = phase === 'damaged' || phase === 'gameover';
  if(phase === 'folding') phone.moveTo(1,reducedMotion.matches?0:DURATIONS.fold);
  if(phase === 'unfolding') phone.moveTo(0,reducedMotion.matches?0:DURATIONS.unfold);
  $('stage').classList.toggle('is-folded',folded);
  $('device').classList.toggle('is-moving',moving);
  $('screen-ui').classList.toggle('is-folding',moving);
  $('device').classList.toggle('is-shaking',phase === 'damaged' && !reducedMotion.matches);
  $('damage').hidden = !broken;
  $('result').hidden = phase !== 'gameover';
  $('fold').disabled = phase !== 'ready';
  $('score').textContent = String(score).padStart(3,'0');
  $('final-score').textContent = String(score);
  $('phase-label').textContent = t.phases[phase];
  $('health-label').textContent = broken ? t.broken : t.healthy;
  $('health-light').parentElement.classList.toggle('is-broken',broken);
  $('active-probability').textContent = String(Number((probability*100).toFixed(1)));
  $('device-description').setAttribute('aria-label',t.device(t.phases[phase]));
  $('instruction').textContent = broken ? t.gameoverInstruction : t.instruction;
  if(phase === 'ready') $('announcement').textContent = t.readyAnnouncement(score);
  else if(phase !== 'gameover') $('announcement').textContent = t.phases[phase];
  if(phase === 'gameover') {
    $('announcement').textContent = t.failedAnnouncement(score);
    if(previousPhase !== 'gameover') $('replay').focus({preventScroll:true});
  }
  previousPhase = phase;
}

applyLanguage(language);
const game = new FoldGame({onChange:render,wait:ms => {
  if(currentSnapshot.phase === 'folding' || currentSnapshot.phase === 'unfolding') return phone.finished;
  return new Promise(resolve=>setTimeout(resolve,ms));
}});
physicalControl=new PhysicalFoldControl({canPlay:()=>game.phase === 'ready',
  onCycle:()=>fold(),onState:state=>{physicalState=state;renderPhysicalState();}});
$('physical-fold').addEventListener('change',()=>physicalControl.setEnabled($('physical-fold').checked));

for (const code of ['zh','en']) $('language-'+code).addEventListener('click',() => {
  preferredLanguage = code;
  try { localStorage.setItem(LANGUAGE_KEY,code); } catch { /* Selection still works for this visit. */ }
  applyLanguage(code);
});
window.addEventListener('languagechange',() => {
  if(!preferredLanguage) applyLanguage(chooseLanguage(undefined,browserLanguages()));
});

$('settings-toggle').addEventListener('click',() => {
  const open = $('settings-toggle').getAttribute('aria-expanded') !== 'true';
  $('settings-toggle').setAttribute('aria-expanded',String(open));
  $('settings').classList.toggle('is-open',open);
  $('settings-panel').setAttribute('aria-hidden',String(!open));
  $('settings-panel').inert = !open;
});

function fold() {
  physicalControl?.reset();
  game.durations = reducedMotion.matches ? {fold:120,hold:0,unfold:120,shake:0} : { ...DURATIONS };
  void game.cycle();
}
$('fold').addEventListener('click',fold);
document.addEventListener('keydown',event => {
  if(event.key !== 'Enter' || event.isComposing || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
  // Keep native Enter behaviour for settings, editing, and the replay button.
  const control = event.target.closest('input, textarea, select, button, a, summary, [contenteditable]:not([contenteditable="false"])');
  if(control && control !== $('fold')) return;
  event.preventDefault();
  if(event.repeat || game.phase !== 'ready') return;
  fold();
});

function restart() {
  physicalControl?.reset();
  phone.reset();
  game.reset(draftProbability);
  $('fold').focus({preventScroll:true});
}

$('replay').addEventListener('click',restart);
function updateDraft(source) {
  if(source === 'range') $('probability').value = $('probability-range').value;
  if(!$('probability').validity.valid) return;
  const value = Number($('probability').value);
  draftProbability = value/100;
  draftEdited = true;
  $('probability-range').value = String(value);
  renderSettingsNote();
}
$('probability').addEventListener('input',()=>updateDraft('number'));
$('probability-range').addEventListener('input',()=>updateDraft('range'));
$('settings-form').addEventListener('submit',event => {
  event.preventDefault();
  if(!$('settings-form').reportValidity()) return;
  updateDraft('number');
  restart();
});
