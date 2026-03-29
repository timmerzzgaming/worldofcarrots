export type Locale = 'en' | 'fr' | 'de' | 'nl' | 'es' | 'zh'

export interface Translations {
  // Home
  subtitle: string
  testYourKnowledge: string
  comingSoon: string

  // Game mode titles & descriptions (keyed by mode id)
  'mode.classic': string
  'mode.classic.desc': string
  'mode.timed': string
  'mode.timed.desc': string
  'mode.marathon': string
  'mode.marathon.desc': string
  'mode.survival': string
  'mode.survival.desc': string
  'mode.practice': string
  'mode.practice.desc': string
  'mode.borderless': string
  'mode.borderless.desc': string
  'mode.flag': string
  'mode.flag.desc': string

  // Categories
  'cat.mapGames': string
  'cat.mapGames.desc': string
  'cat.trivia': string
  'cat.trivia.desc': string
  'cat.challenge': string
  'cat.challenge.desc': string
  'cat.bonus': string
  'cat.bonus.desc': string
  back: string
  gamesAvailable: string
  moreComingSoon: string

  // Home page game cards — Map Games
  'home.guessCountry': string
  'home.guessCountry.desc': string
  'home.guessFlag': string
  'home.guessFlag.desc': string
  'home.nameCountry': string
  'home.nameCountry.desc': string
  'home.silhouette': string
  'home.silhouette.desc': string
  'home.borderNeighbors': string
  'home.borderNeighbors.desc': string
  'home.mapPuzzle': string
  'home.mapPuzzle.desc': string
  'home.explorer': string
  'home.explorer.desc': string
  'home.usStates': string
  'home.usStates.desc': string

  // Home page game cards — Trivia & Quiz
  'home.capitalCities': string
  'home.capitalCities.desc': string
  'home.populationHL': string
  'home.populationHL.desc': string
  'home.areaCompare': string
  'home.areaCompare.desc': string
  'home.currencyMatch': string
  'home.currencyMatch.desc': string
  'home.languageMatch': string
  'home.languageMatch.desc': string
  'home.timeZone': string
  'home.timeZone.desc': string
  'home.quizzes': string
  'home.quizzes.desc': string
  'home.anagram': string
  'home.anagram.desc': string

  // Home page game cards — Challenge Modes
  'home.dailyChallenge': string
  'home.dailyChallenge.desc': string
  'home.streakMode': string
  'home.streakMode.desc': string
  'home.continentSprint': string
  'home.continentSprint.desc': string
  'home.compassMode': string
  'home.compassMode.desc': string
  'home.reverseDistance': string
  'home.reverseDistance.desc': string
  'home.nationalAnthem': string
  'home.nationalAnthem.desc': string
  'home.studyMode': string
  'home.studyMode.desc': string

  // Loading
  loadingGame: string

  // Countdown
  hurryUp: string

  // Game common
  selectMode: string
  chooseChallenge: string
  selectDifficulty: string
  selectRegion: string
  startGame: string
  backToMenu: string
  clearScores: string
  quit: string
  restart: string
  cancel: string
  quitGame: string
  progressLost: string
  allCountries: string
  timer20s: string
  noTimer: string

  // Difficulty labels
  'diff.easy': string
  'diff.medium': string
  'diff.hard': string
  'diff.expert': string
  'diff.easy.desc': string
  'diff.medium.desc': string
  'diff.hard.desc': string
  'diff.expert.desc': string

  // Regions
  'region.World': string
  'region.Africa': string
  'region.Americas': string
  'region.Asia': string
  'region.Europe': string
  'region.Oceania': string

  // Question card
  find: string
  of: string

  // Feedback
  correct: string
  wrong: string
  youClicked: string
  answer: string
  pts: string

  // Scoreboard
  score: string
  found: string
  lives: string
  progress: string
  time: string
  streak: string

  // Results
  gameOver: string
  perfect: string
  youSurvived: string
  flagMaster: string
  newHighScore: string
  enterName: string
  save: string
  highScores: string
  answerDetails: string
  home: string
  playAgain: string
  noScoresYet: string
  'stat.found': string
  'stat.accuracy': string
  'stat.score': string
  'stat.attempted': string
  'stat.completed': string
  'stat.time': string
  'stat.survived': string
  'stat.identified': string
  'stat.correct': string
  'found.suffix': string

  // Flag game
  guessTheFlag: string
  flagSubtitle: string
  clickCountryOnMap: string
  flagUnavailable: string
  'hint.revealContinent': string
  'hint.eliminateLookalikes': string
  'hint.narrowDown': string
  hint: string
  hints: string
  skip: string
  skipped: string
  hintEarned: string

  // Flag how it works
  howItWorks: string
  'flag.hintsExplain': string
  'flag.livesExplain': string
  'flag.hintOrder': string

  // Continents (for hint display)
  'continent.Africa': string
  'continent.Asia': string
  'continent.Europe': string
  'continent.North America': string
  'continent.South America': string
  'continent.Oceania': string

  // Difficulty speech bubbles (click-country & flag modes use {pool} placeholder)
  'speech.classic': string
  'speech.timed': string
  'speech.marathon': string
  'speech.survival': string
  'speech.practice': string
  'speech.borderless': string
  'speech.flag': string
  'speech.distance.easy': string
  'speech.distance.medium': string
  'speech.distance.hard': string
  'speech.distance.expert': string

  // Distance mode
  'mode.distance': string
  'mode.distance.desc': string
  'home.distance': string
  'home.distance.desc': string
  distanceMode: string
  distanceSubtitle: string
  whereIs: string
  totalDistance: string
  distanceMaster: string
  km: string
  mi: string
  'stat.totalDist': string
  'stat.bestGuess': string
  'stat.worstGuess': string
  'stat.avgDist': string
  pinOnMap: string

  // US States mode
  usStatesMode: string
  usStatesSubtitle: string
  'us.region.All': string
  'us.region.Northeast': string
  'us.region.Southeast': string
  'us.region.Midwest': string
  'us.region.Southwest': string
  'us.region.West': string
  'us.diff.easy.desc': string
  'us.diff.medium.desc': string
  'us.diff.hard.desc': string
  'us.diff.expert.desc': string
  'us.allStates': string
  'us.speech.classic': string
  'us.speech.timed': string
  'us.speech.marathon': string
  'us.speech.survival': string
  'us.speech.practice': string

  // Auth
  'auth.welcome': string
  'auth.welcomeDesc': string
  'auth.createAccount': string
  'auth.signIn': string
  'auth.signUp': string
  'auth.signOut': string
  'auth.continueAsGuest': string
  'auth.nickname': string
  'auth.nicknameLength': string
  'auth.nicknameChars': string
  'auth.email': string
  'auth.invalidEmail': string
  'auth.chooseAvatar': string
  'auth.sendMagicLink': string
  'auth.checkEmail': string
  'auth.magicLinkSent': string
  'auth.credits': string
  'auth.guestBannerTitle': string
  'auth.guestBannerDesc': string
  'auth.playingAsGuest': string
  'auth.forgotPassword': string
  'auth.forgotTitle': string
  'auth.forgotDesc': string
  'auth.recoverySent': string
  'auth.recoveryNickname': string
  'auth.resetCheckEmail': string
  'auth.sendRecovery': string

  // Credits
  'credits.earned': string
  'credits.base': string
  'credits.perCorrect': string
  'credits.starBonus': string
  'credits.streakBonus': string
  'credits.perfectBonus': string
  'credits.noHintsBonus': string
  'credits.speedBonus': string
  'credits.total': string
  'credits.signUpToEarn': string
  'credits.buyHint': string
  'credits.notEnough': string

  // XP & Ranking
  'xp.earned': string
  'xp.levelUp': string
  'xp.level': string
  'rank.novice': string
  'rank.explorer': string
  'rank.navigator': string
  'rank.cartographer': string
  'rank.geographer': string
  'rank.atlas': string
  'rank.globeMaster': string
  'rank.worldScholar': string
  'rank.geoMaster': string

  // Daily Login
  'daily.welcome': string
  'daily.streakCount': string
  'daily.claim': string
  'daily.claimed': string

  // Achievements
  'ach.games10': string
  'ach.games10.desc': string
  'ach.games50': string
  'ach.games50.desc': string
  'ach.games100': string
  'ach.games100.desc': string
  'ach.games500': string
  'ach.games500.desc': string
  'ach.perfectClassic': string
  'ach.perfectClassic.desc': string
  'ach.perfectMarathon': string
  'ach.perfectMarathon.desc': string
  'ach.stars10': string
  'ach.stars10.desc': string
  'ach.stars50': string
  'ach.stars50.desc': string
  'ach.stars100': string
  'ach.stars100.desc': string
  'ach.masterAfrica': string
  'ach.masterAfrica.desc': string
  'ach.masterEurope': string
  'ach.masterEurope.desc': string
  'ach.masterAsia': string
  'ach.masterAsia.desc': string
  'ach.masterAmericas': string
  'ach.masterAmericas.desc': string
  'ach.masterOceania': string
  'ach.masterOceania.desc': string
  'ach.streak7': string
  'ach.streak7.desc': string
  'ach.streak30': string
  'ach.streak30.desc': string
  'ach.level10': string
  'ach.level10.desc': string
  'ach.level25': string
  'ach.level25.desc': string
  'ach.level50': string
  'ach.level50.desc': string
  'ach.dailyFirst': string
  'ach.dailyFirst.desc': string
  'ach.allModes': string
  'ach.allModes.desc': string
  'ach.distancePerfect': string
  'ach.distancePerfect.desc': string
  'ach.speedDemon': string
  'ach.speedDemon.desc': string

  // Carrot Bonus game
  'carrotBonus.title': string
  'carrotBonus.subtitle': string
  'carrotBonus.carrots': string
  'carrotBonus.coins': string
  'carrotBonus.feed': string
  'carrotBonus.instruction': string
  'carrotBonus.jackpotHint': string
  'carrotBonus.youWon': string
  'carrotBonus.jackpot': string
  'carrotBonus.playAgain': string
  'carrotBonus.notEnoughCarrots': string
  'carrotBonus.loginRequired': string
  'carrotBonus.totalStats': string
  'carrotBonus.plays': string
  'carrotBonus.won': string
  'home.carrotBonus': string
  'home.carrotBonus.desc': string

  // Sticker Album
  'stickerAlbum.title': string
  'stickerAlbum.subtitle': string
  'stickerAlbum.mapView': string
  'stickerAlbum.listView': string
  'stickerAlbum.loginRequired': string
  'home.stickerAlbum': string
  'home.stickerAlbum.desc': string

  // Multiplayer
  'mp.multiplayer': string
  'mp.multiMix': string
  'mp.createLobby': string
  'mp.joinByCode': string
  'mp.joinCode': string
  'mp.openLobbies': string
  'mp.noLobbies': string
  'mp.players': string
  'mp.spectate': string
  'mp.spectating': string
  'mp.lobby': string
  'mp.ready': string
  'mp.notReady': string
  'mp.start': string
  'mp.waiting': string
  'mp.kick': string
  'mp.invite': string
  'mp.copyCode': string
  'mp.codeCopied': string
  'mp.duration': string
  'mp.minutes': string
  'mp.public': string
  'mp.private': string
  'mp.chat': string
  'mp.sendMessage': string
  'mp.typeMessage': string
  'mp.round': string
  'mp.score': string
  'mp.correct': string
  'mp.wrong': string
  'mp.timeUp': string
  'mp.gameOver': string
  'mp.finalScores': string
  'mp.winner': string
  'mp.playAgain': string
  'mp.loginRequired': string
  'mp.lobbyFull': string
  'mp.hostLeft': string
  'mp.kicked': string
  'mp.ping': string
}
