export const LANGUAGE_KEY = 'fold-phone-language';

export function chooseLanguage(saved, languages = []) {
  if (saved === 'zh' || saved === 'en') return saved;
  for (const language of languages) {
    const base = String(language).toLowerCase().split(/[-_]/)[0];
    if (base === 'zh' || base === 'en') return base;
  }
  return 'en';
}

export const messages = {
  zh: {
    title: '开合之间', subtitle: '再折一次，应该也没事吧。',
    scoreLabel: '当前得分', scoreUnit: '分', healthy: '屏幕状态良好', broken: '屏幕已损坏',
    fold: '开合', replay: '重玩', resultFirst: '啊哦，屏幕坏了，', resultSecond: '需要花￥7998才能修好……',
    resultLabel: '本次得分', settings: '测试设置', failureChance: '故障概率',
    putDown: '放在桌子上', pickUp: '拿起来', foldChanceShort: '开合', tableChanceShort: '放桌',
    tableProbabilityLabel: '放桌时的故障概率', tableProbabilityAria: '放桌故障概率百分比',
    drop: '跌落', dropProbabilityLabel: '跌落时的故障概率', dropProbabilityAria: '跌落故障概率百分比',
    probabilityLabel: '展开时的故障概率', probabilityAria: '故障概率百分比',
    apply: '应用并重新开始', languageAria: '界面语言',
    themeDark: '深色', themeLight: '浅色', themeSystem: '跟随系统', themeAria: '显示模式',
    physicalFoldLabel: '真机开合控制（实验）',
    physicalFoldHelp: '保持内屏页面可见，半折后再展开触发一轮开合；完全合拢可能使检测暂停。',
    postureStates: {
      checking: '正在检查折叠姿态支持…',
      insecure: '真机开合需要 HTTPS；当前可使用按钮或 Enter。',
      unsupported: '浏览器未提供折叠姿态，请使用按钮或 Enter。',
      error: '无法读取折叠姿态，请使用按钮或 Enter。',
      disabled: '真机开合已关闭，可在测试设置中开启。',
      paused: '页面返回前台后恢复姿态检测。',
      table: '拿起手机后可恢复真机开合。',
      ended: '重玩后可恢复真机开合。',
      ready: '姿态检测已启用：在支持的折叠屏上半折后再展开。',
      folded: '请先展开手机，再半折一次。',
      armed: '已检测到半折，请展开手机完成一轮。'
    },
    instruction: '开合 +1 分 · 放桌 +2 分 · 跌落 +20 分。Enter 快捷开合。',
    floorInstruction: '跌落后完好，+20 分。拿起来后可继续选择玩法。',
    droppingInstruction: '正在跌落…',
    tableInstruction: '安全放下，+2 分。拿起来后可继续选择玩法。',
    placingInstruction: '正在放到桌面上…', liftingInstruction: '正在拿起手机…',
    gameoverInstruction: '点击屏幕内的「重玩」再试一次。',
    settingsNote: '下一局生效。放桌最低2%，跌落最低20%。',
    draftNote: (fold,table,drop) => `下一局：开合 ${fold}%，放桌 ${table}%，跌落 ${drop}%。`,
    readyAnnouncement: score => `当前 ${score} 分，可以开合、放桌或跌落。`,
    tableAnnouncement: score => `安全放到桌面，加2分。当前 ${score} 分，请先拿起来。`,
    floorAnnouncement: score => `跌落后屏幕完好，加20分。当前 ${score} 分，请先拿起来。`,
    failedAnnouncement: score => `啊哦，屏幕坏了，需要花￥7998才能修好…… 本次得分 ${score} 分。`,
    device: phase => `像素风折叠屏手机，${phase}`,
    phases: { ready:'展开就绪', folding:'正在折叠', closed:'已合拢', unfolding:'正在展开', placing:'正在放下', onTable:'已放在桌面', lifting:'正在拿起', dropping:'正在跌落', onFloor:'已落在地面', liftingFloor:'正在拿起', damaged:'屏幕故障', gameover:'游戏结束' }
  },
  en: {
    title: 'One More Fold', subtitle: 'One more fold. What could go wrong?',
    scoreLabel: 'Score', scoreUnit: 'pts', healthy: 'Screen healthy', broken: 'Screen damaged',
    fold: 'Fold / Unfold', replay: 'Play again', resultFirst: 'Oops, the screen broke.', resultSecond: 'It will cost $999 to repair…',
    resultLabel: 'Final score', settings: 'Test settings', failureChance: 'failure chance',
    putDown: 'Put on table', pickUp: 'Pick up', foldChanceShort: 'Fold', tableChanceShort: 'Table',
    tableProbabilityLabel: 'Failure chance when placing on table', tableProbabilityAria: 'Table failure chance in percent',
    drop: 'Drop', dropProbabilityLabel: 'Failure chance when dropped', dropProbabilityAria: 'Drop failure chance in percent',
    probabilityLabel: 'Failure chance when unfolding', probabilityAria: 'Failure chance in percent',
    apply: 'Apply & restart', languageAria: 'Interface language',
    themeDark: 'Dark', themeLight: 'Light', themeSystem: 'System', themeAria: 'Appearance',
    physicalFoldLabel: 'Physical fold control (experimental)',
    physicalFoldHelp: 'Keep this page visible on the inner display. Half-fold, then unfold to trigger one game cycle. Closing fully may pause detection.',
    postureStates: {
      checking: 'Checking device posture support…',
      insecure: 'Physical folding needs HTTPS. The button and Enter still work.',
      unsupported: 'This browser provides no posture signal. Use the button or Enter.',
      error: 'Cannot read device posture. Use the button or Enter.',
      disabled: 'Physical fold control is off. Enable it in test settings.',
      paused: 'Posture detection resumes when this page is visible.',
      table: 'Pick up the phone to resume physical fold control.',
      ended: 'Play again to resume physical fold control.',
      ready: 'Posture detection is on: half-fold and unfold a supported device.',
      folded: 'Unfold the phone first, then half-fold it again.',
      armed: 'Half-fold detected. Unfold the phone to complete a cycle.'
    },
    instruction: 'Fold +1 · Table +2 · Drop +20. Press Enter to fold.',
    floorInstruction: 'Survived the drop: +20 points. Pick it up to choose an action.',
    droppingInstruction: 'Dropping the phone…',
    tableInstruction: 'Safely placed: +2 points. Pick it up to choose either action again.',
    placingInstruction: 'Placing the phone on the table…', liftingInstruction: 'Picking up the phone…',
    gameoverInstruction: 'Select “Play again” on the screen to try again.',
    settingsNote: 'Applies next game. Minimum risk: table 2%, drop 20%.',
    draftNote: (fold,table,drop) => `Next game: fold ${fold}%, table ${table}%, drop ${drop}%.`,
    readyAnnouncement: score => `${score} points. Ready to fold, place on the table or drop.`,
    tableAnnouncement: score => `Safely placed, 2 points earned. Total: ${score}. Pick it up to continue.`,
    floorAnnouncement: score => `Survived the drop, 20 points earned. Total: ${score}. Pick it up to continue.`,
    failedAnnouncement: score => `Oops, the screen broke. It will cost $999 to repair. Final score: ${score} points.`,
    device: phase => `Pixel foldable phone, ${phase}`,
    phases: { ready:'Ready', folding:'Folding', closed:'Folded', unfolding:'Unfolding', placing:'Putting down', onTable:'On the table', lifting:'Picking up', dropping:'Dropping', onFloor:'On the floor', liftingFloor:'Picking up', damaged:'Screen failure', gameover:'Game over' }
  }
};
