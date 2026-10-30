import { FoldGame, DEFAULT_PROBABILITY, DEFAULT_TABLE_PROBABILITY, DEFAULT_DROP_PROBABILITY, DURATIONS } from './game.mjs';
import { PhoneRenderer } from './phone-renderer.mjs';
import { chooseLanguage, messages, LANGUAGE_KEY } from './i18n.mjs';
import { PhysicalFoldControl } from './device-posture.mjs';
import { watchSystemClock } from './screen-clock.mjs';
import { watchFoldableDevice } from './foldable-device.mjs';
import { ThemeController } from './theme.mjs';

const $ = id => document.getElementById(id);
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let phone;
const themeController = new ThemeController({onChange:({preference,resolved})=>{
  document.documentElement.dataset.theme=resolved;
  document.documentElement.dataset.themePreference=preference;
  document.documentElement.style.colorScheme=resolved;
  document.querySelector('meta[name="theme-color"]').setAttribute('content',resolved==='dark'?'#000000':'#eeece3');
  for(const mode of ['dark','light','system']) $('theme-'+mode).setAttribute('aria-pressed',String(preference===mode));
  phone?.setTheme(resolved);
}});
for(const mode of ['dark','light','system']) $('theme-'+mode).addEventListener('click',()=>themeController.setPreference(mode));
window.addEventListener('pagehide',event=>{if(!event.persisted) themeController.destroy();});
let draftProbability = DEFAULT_PROBABILITY;
let draftTableProbability = DEFAULT_TABLE_PROBABILITY;
let draftDropProbability = DEFAULT_DROP_PROBABILITY;
let draftEdited = false;
let previousPhase;
let currentSnapshot;
let physicalControl;
let foldableDevice = false;
let physicalState={availability:'checking',enabled:false};
let preferredLanguage;
try { preferredLanguage = localStorage.getItem(LANGUAGE_KEY); } catch { /* Private mode may disable storage. */ }
if (!['zh','en'].includes(preferredLanguage)) preferredLanguage = undefined;
const browserLanguages = () => navigator.languages?.length ? navigator.languages : [navigator.language];
let language = chooseLanguage(preferredLanguage, browserLanguages());
phone = new PhoneRenderer($('phone-canvas'),language,themeController.snapshot.resolved);
const stopClock = watchSystemClock(date=>phone.updateClock(date));
window.addEventListener('pagehide',event=>{ if(!event.persisted) stopClock(); });

function renderSettingsNote() {
  const t = messages[language];
  const percentage = Number((draftProbability * 100).toFixed(1));
  const tablePercentage = Number((draftTableProbability * 100).toFixed(1));
  const dropPercentage = Number((draftDropProbability * 100).toFixed(1));
  $('settings-note').textContent = draftEdited ? t.draftNote(percentage,tablePercentage,dropPercentage) : t.settingsNote;
}

function renderPhysicalState() {
  $('posture-status').hidden = !foldableDevice;
  $('physical-controls').hidden = !foldableDevice;
  const s=physicalState;
  let state=s.availability;
  if(state === 'available') state=!s.enabled?'disabled':s.hidden?'paused':s.armed?'armed':s.posture==='folded'?'folded':'ready';
  if(s.availability === 'available' && s.enabled && !s.hidden && (currentSnapshot?.onTable || currentSnapshot?.onFloor || ['lifting','liftingFloor'].includes(currentSnapshot?.phase))) state='table';
  if(s.availability === 'available' && s.enabled && ['damaged','gameover'].includes(currentSnapshot?.phase)) state='ended';
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
  $('theme-switch').setAttribute('aria-label',t.themeAria);
  $('language-zh').setAttribute('aria-pressed',String(language === 'zh'));
  $('language-en').setAttribute('aria-pressed',String(language === 'en'));
  $('probability-range').setAttribute('aria-label',t.probabilityAria);
  $('table-probability-range').setAttribute('aria-label',t.tableProbabilityAria);
  $('drop-probability-range').setAttribute('aria-label',t.dropProbabilityAria);
  renderSettingsNote();
  renderPhysicalState();
  phone.setLanguage(language);
  if(currentSnapshot) render(currentSnapshot);
}

function render({ phase, score, probability, tableProbability, onTable, dropProbability, onFloor }) {
  currentSnapshot = { phase, score, probability, tableProbability, onTable, dropProbability, onFloor };
  const t = messages[language];
  const folded = phase === 'folding' || phase === 'closed';
  const moving = folded || phase === 'unfolding';
  const broken = phase === 'damaged' || phase === 'gameover';
  if(broken) phone.pauseClock();
  if(phase === 'folding') phone.moveTo(1,reducedMotion.matches?0:DURATIONS.fold);
  if(phase === 'unfolding') phone.moveTo(0,reducedMotion.matches?0:DURATIONS.unfold);
  $('stage').classList.toggle('is-folded',folded);
  $('stage').classList.toggle('is-table-view',onTable);
  $('stage').classList.toggle('is-floor-view',onFloor);
  $('stage').classList.toggle('is-lifting-floor',phase === 'liftingFloor');
  $('stage').classList.toggle('is-lifting',phase === 'lifting');
  $('device').classList.toggle('is-moving',moving);
  $('screen-ui').classList.toggle('is-folding',moving);
  $('device').classList.toggle('is-shaking',phase === 'damaged' && !reducedMotion.matches);
  $('damage').hidden = !broken;
  $('result').hidden = phase !== 'gameover';
  $('fold').disabled = phase !== 'ready';
  $('table-action').disabled = phase !== 'ready' && phase !== 'onTable';
  const pickup = phase === 'onTable' || phase === 'lifting';
  $('table-label').textContent = pickup ? t.pickUp : t.putDown;
  $('table-icon').textContent = pickup ? '↑' : '↓';
  $('table-reward').textContent = pickup ? '' : '+2';
  $('drop-action').disabled = phase !== 'ready' && phase !== 'onFloor';
  const pickupFloor = phase === 'onFloor' || phase === 'liftingFloor';
  $('drop-label').textContent = pickupFloor ? t.pickUp : t.drop;
  $('drop-icon').textContent = pickupFloor ? '↑' : '⇣';
  $('drop-reward').textContent = pickupFloor ? '' : '+20';
  $('score').textContent = String(score).padStart(3,'0');
  $('final-score').textContent = String(score);
  $('phase-label').textContent = t.phases[phase];
  $('health-label').textContent = broken ? t.broken : t.healthy;
  $('health-light').parentElement.classList.toggle('is-broken',broken);
  $('active-probability').textContent = String(Number((probability*100).toFixed(1)));
  $('active-table-probability').textContent = String(Number((tableProbability*100).toFixed(1)));
  $('active-drop-probability').textContent = String(Number((dropProbability*100).toFixed(1)));
  $('device-description').setAttribute('aria-label',t.device(t.phases[phase]));
  $('instruction').textContent = broken ? t.gameoverInstruction : phase === 'onFloor' ? t.floorInstruction : phase === 'dropping' ? t.droppingInstruction : phase === 'onTable' ? t.tableInstruction : phase === 'placing' ? t.placingInstruction : ['lifting','liftingFloor'].includes(phase) ? t.liftingInstruction : t.instruction;
  if(phase === 'ready') $('announcement').textContent = t.readyAnnouncement(score);
  else if(phase === 'onTable') $('announcement').textContent = t.tableAnnouncement(score);
  else if(phase === 'onFloor') $('announcement').textContent = t.floorAnnouncement(score);
  else if(phase !== 'gameover') $('announcement').textContent = t.phases[phase];
  if(phase === 'gameover') {
    $('announcement').textContent = t.failedAnnouncement(score);
    if(previousPhase !== 'gameover') $('replay').focus({preventScroll:true});
  }
  previousPhase = phase;
  renderPhysicalState();
}

applyLanguage(language);
const game = new FoldGame({onChange:render,wait:ms => {
  if(currentSnapshot.phase === 'folding' || currentSnapshot.phase === 'unfolding') return phone.finished;
  return new Promise(resolve=>setTimeout(resolve,ms));
}});
physicalControl=new PhysicalFoldControl({canPlay:()=>game.phase === 'ready',
  onCycle:()=>fold(),onState:state=>{physicalState=state;renderPhysicalState();}});
const stopFoldableDetection=watchFoldableDevice(detected=>{
  foldableDevice=detected;renderPhysicalState();
});
window.addEventListener('pagehide',event=>{if(!event.persisted) stopFoldableDetection();});
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

function configureDurations() {
  game.durations = reducedMotion.matches ? {fold:120,hold:0,unfold:120,shake:0,place:0,lift:0,drop:0,floorLift:0} : { ...DURATIONS };
}
function fold() {
  if(game.phase !== 'ready') return;
  physicalControl?.reset();
  configureDurations();
  void game.cycle();
}
$('fold').addEventListener('click',fold);
$('table-action').addEventListener('click',()=>{
  if(game.phase !== 'ready' && game.phase !== 'onTable') return;
  physicalControl?.reset();
  configureDurations();
  if(game.phase === 'onTable') void game.pickUp();
  else void game.putDown();
});
$('drop-action').addEventListener('click',()=>{
  if(game.phase !== 'ready' && game.phase !== 'onFloor') return;
  physicalControl?.reset();
  configureDurations();
  if(game.phase === 'onFloor') void game.pickUp();
  else void game.drop();
});
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
  $('stage').classList.add('is-resetting');
  game.reset(draftProbability,draftTableProbability,draftDropProbability);
  void $('stage').offsetWidth;
  $('stage').classList.remove('is-resetting');
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
function updateTableDraft(source) {
  if(source === 'range') $('table-probability').value = $('table-probability-range').value;
  if(!$('table-probability').validity.valid) return;
  const value = Number($('table-probability').value);
  draftTableProbability = value/100;
  draftEdited = true;
  $('table-probability-range').value = String(value);
  renderSettingsNote();
}
$('table-probability').addEventListener('input',()=>updateTableDraft('number'));
$('table-probability-range').addEventListener('input',()=>updateTableDraft('range'));
function updateDropDraft(source) {
  if(source === 'range') $('drop-probability').value = $('drop-probability-range').value;
  if(!$('drop-probability').validity.valid) return;
  const value = Number($('drop-probability').value);
  draftDropProbability = value/100;
  draftEdited = true;
  $('drop-probability-range').value = String(value);
  renderSettingsNote();
}
$('drop-probability').addEventListener('input',()=>updateDropDraft('number'));
$('drop-probability-range').addEventListener('input',()=>updateDropDraft('range'));
$('settings-form').addEventListener('submit',event => {
  event.preventDefault();
  if(!$('settings-form').reportValidity()) return;
  updateDraft('number');
  updateTableDraft('number');
  updateDropDraft('number');
  restart();
});
