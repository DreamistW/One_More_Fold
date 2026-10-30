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
    scoreLabel: '成功开合', scoreUnit: '次', healthy: '屏幕状态良好', broken: '屏幕已损坏',
    fold: '开合', replay: '重玩', resultFirst: '啊哦，屏幕坏了，', resultSecond: '需要花￥7998才能修好……',
    resultLabel: '本次成功开合', settings: '测试设置', failureChance: '故障概率',
    probabilityLabel: '展开时的故障概率', probabilityAria: '故障概率百分比',
    apply: '应用并重新开始', languageAria: '界面语言',
    physicalFoldLabel: '真机开合控制（实验）',
    physicalFoldHelp: '保持内屏页面可见，半折后再展开触发一轮开合；完全合拢可能使检测暂停。',
    postureStates: {
      checking: '正在检查折叠姿态支持…',
      insecure: '真机开合需要 HTTPS；当前可使用按钮或 Enter。',
      unsupported: '浏览器未提供折叠姿态，请使用按钮或 Enter。',
      error: '无法读取折叠姿态，请使用按钮或 Enter。',
      disabled: '真机开合已关闭，可在测试设置中开启。',
      paused: '页面返回前台后恢复姿态检测。',
      ready: '姿态检测已启用：在支持的折叠屏上半折后再展开。',
      folded: '请先展开手机，再半折一次。',
      armed: '已检测到半折，请展开手机完成一轮。'
    },
    instruction: '点击或按 Enter，折叠再展开。每成功一轮，得 1 分。',
    gameoverInstruction: '点击屏幕内的「重玩」再试一次。',
    settingsNote: '调整后下一局生效。0% 永不损坏，100% 必定损坏。',
    draftNote: value => `下一局故障概率：${value}%。0% 永不损坏，100% 必定损坏。`,
    readyAnnouncement: score => `成功开合 ${score} 次，可以继续开合。`,
    failedAnnouncement: score => `啊哦，屏幕坏了，需要花￥7998才能修好…… 本次成功开合 ${score} 次。`,
    device: phase => `像素风折叠屏手机，${phase}`,
    phases: { ready:'展开就绪', folding:'正在折叠', closed:'已合拢', unfolding:'正在展开', damaged:'屏幕故障', gameover:'游戏结束' }
  },
  en: {
    title: 'One More Fold', subtitle: 'One more fold. What could go wrong?',
    scoreLabel: 'Successful cycles', scoreUnit: '', healthy: 'Screen healthy', broken: 'Screen damaged',
    fold: 'Fold / Unfold', replay: 'Play again', resultFirst: 'Oops, the screen broke.', resultSecond: 'It will cost $999 to repair…',
    resultLabel: 'Successful cycles', settings: 'Test settings', failureChance: 'failure chance',
    probabilityLabel: 'Failure chance when unfolding', probabilityAria: 'Failure chance in percent',
    apply: 'Apply & restart', languageAria: 'Interface language',
    physicalFoldLabel: 'Physical fold control (experimental)',
    physicalFoldHelp: 'Keep this page visible on the inner display. Half-fold, then unfold to trigger one game cycle. Closing fully may pause detection.',
    postureStates: {
      checking: 'Checking device posture support…',
      insecure: 'Physical folding needs HTTPS. The button and Enter still work.',
      unsupported: 'This browser provides no posture signal. Use the button or Enter.',
      error: 'Cannot read device posture. Use the button or Enter.',
      disabled: 'Physical fold control is off. Enable it in test settings.',
      paused: 'Posture detection resumes when this page is visible.',
      ready: 'Posture detection is on: half-fold and unfold a supported device.',
      folded: 'Unfold the phone first, then half-fold it again.',
      armed: 'Half-fold detected. Unfold the phone to complete a cycle.'
    },
    instruction: 'Click or press Enter to fold and unfold. Each successful cycle earns 1 point.',
    gameoverInstruction: 'Select “Play again” on the screen to try again.',
    settingsNote: 'Changes apply next game. 0% never fails; 100% always fails.',
    draftNote: value => `Next game: ${value}% failure chance. 0% never fails; 100% always fails.`,
    readyAnnouncement: score => `${score} successful cycles. Ready to fold again.`,
    failedAnnouncement: score => `Oops, the screen broke. It will cost $999 to repair. ${score} successful cycles.`,
    device: phase => `Pixel foldable phone, ${phase}`,
    phases: { ready:'Ready to fold', folding:'Folding', closed:'Folded', unfolding:'Unfolding', damaged:'Screen failure', gameover:'Game over' }
  }
};
