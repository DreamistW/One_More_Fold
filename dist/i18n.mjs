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
