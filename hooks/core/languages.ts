// What the rules read beside Turkish and English: the cues of signals.ts in
// Spanish, German, French, Russian, Chinese and Japanese. Written from what
// each language says for the same things (a hang, a slow page, "from scratch",
// "still broken"), not from the eval prompts, and measured on a set kept apart
// (eval/i18n/held.ts).
//
// Folded the way normalize() folds a prompt: lowercase, Latin letters without
// accents (ñ is n, ä is a, ß is ss), Cyrillic and CJK as written. A cue
// matches at the start of a word; in Chinese and Japanese, which have no
// spaces, it matches anywhere.

export const ELUSIVE_I18N = [
  // es
  'a veces', 'de vez en cuando', 'al azar', 'aleatori', 'se congela', 'se cuelga', 'se queda colgad', 'fuga de memoria',
  'condicion(?:es)? de carrera', 'interbloqueo', 'intermitente', 'causa raiz',
  // de
  'manchmal', 'ab und zu', 'zufallig', 'sporadisch', 'friert', 'hangt sich', 'speicherleck', 'wettlaufsituation', 'unregelmassig',
  'grundursache',
  // fr
  'parfois', 'de temps en temps', 'aleatoire', 'au hasard', 'se fige', 'fuite de memoire', 'condition de course', 'interblocage',
  'intermittent',
  // ru
  'иногда', 'время от времени', 'случайн', 'зависает', 'зависло', 'утечк', 'состояни[а-я]* гонки', 'гонк', 'дедлок', 'взаимн[а-я]* блокиров',
  'плавающ', 'нестабильн', 'периодическ',
  // zh
  '有时', '时不时', '偶尔', '随机', '卡死', '死锁', '竞态', '内存泄漏', '泄漏', '间歇',
  // ja
  'ときどき', 'たまに', '時々', 'ランダム', '固まる', 'フリーズ', 'デッドロック', '競合', 'メモリリーク', 'リーク', '不定期', '断続',
]

// Hard on their own: architecture, concurrency, speed, security.
export const HARD_I18N = [
  // es
  'arquitectura', 'microservicio', 'monolit', 'reestructur', 'multi.?inquilino', 'simultane', 'a la vez', 'al mismo tiempo',
  'concurren', 'rendimiento', 'acelera', 'lent[oa](?![a-z])', 'lentitud', 'latencia', 'optimiz', 'escalab', 'seguridad',
  'vulnerab', 'inyeccion', 'fuerza bruta', 'audit', 'malici', 'malware', 'refactor',
  // de
  'architektur', 'mikroservice', 'monolith', 'umstrukturier', 'refaktorier', 'mandantenfahig', 'gleichzeitig', 'nebenlaufig', 'leistung',
  'langsam', 'beschleunig', 'latenz', 'optimier', 'skalier', 'sicherheit', 'schwachstelle', 'anfallig', 'brute.?force', 'bosartig', 'abgesichert', 'prufe? ihn durch',
  // fr
  'architecture', 'simultane', 'en meme temps', 'multi.?locataire', 'lent(?:e|s|es)?(?![a-z])', 'lenteur', 'accelere',
  'latence', 'securite', 'force brute', 'audite', 'malveillant', 'malicieu', 'met (?:plus )?de temps', 'plus longtemps', 'resiste.t.il',
  // ru
  'архитектур', 'микросервис', 'монолит', 'реструктур', 'рефактор', 'многоарендн', 'одновременн', 'параллельн', 'производительност',
  'медленн', 'тормоз', 'ускор', 'задержк', 'оптимизир', 'масштабир', 'безопасност', 'уязвим', 'инъекц', 'перебор', 'аудит', 'вредонос', 'отрефактор', 'дольше отвечает', 'защищен',
  // zh
  '架构', '微服务', '单体', '重构', '多租户', '并发', '同时(?:编辑|修改|更新|写入|请求|访问|提交)', '性能', '很慢', '太慢', '变慢',
  '提速', '加速', '延迟', '优化', '可扩展', '扩容', '安全', '漏洞', '注入', '暴力破解', '减半', '审计', '审查', '恶意', '响应得越',
  // ja
  'アーキテクチャ', 'マイクロサービス', 'モノリス', 'リファクタ', 'マルチテナント', '同時に', '並行', '並列', 'パフォーマンス', '性能', '遅い',
  '遅く', '高速化', 'レイテンシ', '最適化', 'スケール', 'セキュリティ', '脆弱', 'インジェクション', 'ブルートフォース', '監査', '点検', '悪意', '返事が遅',
]

// Hard only beside another sign: a "why", a design, a comparison.
export const MAYBE_HARD_I18N = [
  // faster: a slow page, or a quick animation
  'faster', 'quicker', 'daha hizli', 'cok hizli', 'mas rapid', 'schneller', 'plus rapide', 'быстрее', '更快', '速く',
  // es
  'por que', 'disena', 'diseno de', 'analiz', 'compar', 'estrategia', 'evalua', 'ventajas', 'desventajas', 'investiga', 'a fondo',
  'hoja de ruta', 'autorizacion', 'autenticacion', 'modelo de permisos', 'alternativa', 'otra forma',
  // de
  'warum', 'weshalb', 'wieso', 'entwirf', 'entwurf', 'analysier', 'vergleich', 'strategie', 'bewert', 'vorteile', 'nachteile',
  'untersuch', 'ausfuhrlich', 'berechtigung', 'authentifizier', 'autorisier', 'alternative',
  // fr
  'pourquoi', 'concois', 'conception', 'analyse', 'compar', 'evalue', 'avantages', 'inconvenients', 'enquete', 'en profondeur',
  'feuille de route', 'autorisation', 'authentification', 'permissions', 'autre facon',
  // ru
  'почему', 'спроектир', 'проектирован', 'проанализир', 'анализ', 'сравни', 'стратег', 'оцени', 'преимуществ', 'недостатк', 'исследуй',
  'подробно', 'авторизац', 'аутентификац', 'права доступа', 'модель прав', 'альтернатив',
  // zh
  '为什么', '为何', '设计', '分析', '比较', '对比', '策略', '评估', '优缺点', '调查', '深入', '路线图', '权限', '认证', '鉴权', '授权', '替代方案',
  // ja
  'なぜ', 'どうして', '設計', '分析', '比較', '戦略', '評価', 'メリット', 'デメリット', '調査', '詳しく', 'ロードマップ', '権限', '認証', '認可', '代替',
]

// "should we use X or Y": a choice between options.
export const DECISION_I18N = [
  'debemos usar', 'deberiamos', 'usamos [^?.]{1,30} o ', 'que es mejor', 'cual es mejor',
  'sollen wir', 'sollten wir', 'oder [^?.]{1,25}[?]', 'was ist besser', 'welche[rs]? ist besser',
  'faut.il', 'devons.nous', 'on utilise', 'lequel est meilleur', 'vaut.il mieux',
  'что взять', 'что лучше', 'что выбрать', 'стоит ли', 'или [^?.]{1,25}[?]', 'нужно ли',
  '[^，。？?]{1,15}还是[^，。？?]{1,15}[？?]', '该用', '应该用', '哪个好', '哪个更好',
  'どちら', 'べき', 'それとも',
]

// Asking for a plan.
export const PLANNING_I18N = [
  'haz un plan', 'prepara un plan', 'elabora un plan', 'plan para', 'planifica',
  'mach einen plan', 'erstell einen plan', 'plan fur', 'plane ',
  'fais un plan', 'prepare un plan', 'etablis un plan', 'plan pour', 'planifie',
  'составь план', 'сделай план', 'подготовь план', 'спланируй', 'план [а-я]+ разделени',
  '制定[^。，]{0,20}计划', '做个计划', '做一个计划', '规划', '方案',
  '計画を立て', '計画を作', 'プランを',
]

export const WHY_I18N = [
  'por que', 'el motivo', 'la causa',
  'warum', 'weshalb', 'wieso', 'die ursache',
  'pourquoi', 'la cause',
  'почему', 'причин',
  '为什么', '为何', '原因',
  'なぜ', 'どうして', '理由', '原因',
]

export const HUNT_I18N = [
  'averigu', 'encuentra', 'descubre', 'investiga', 'busca',
  'finde', 'herausfind', 'untersuch', 'such ',
  'trouve', 'cherche', 'decouvre', 'identifie',
  'найди', 'выясни', 'узнай', 'определи', 'разберись',
  '找出', '查一下', '查明', '排查', '调查', '弄清',
  '探して', '調べて', '突き止め', '特定',
]

export const FAILURE_I18N = [
  'falla', 'fallo', 'roto', 'duplicad', 'memoria', 'lento', 'cuelga', 'congela', 'se cae', 'pierde',
  'fehler', 'kaputt', 'doppelt', 'speicher', 'langsam', 'hangt', 'friert', 'abstur', 'verloren',
  'erreur', 'bug', 'casse', 'doublon', 'memoire', 'plante', 'fige',
  'ошибк', 'сломан', 'дублир', 'память', 'завис', 'падает', 'потер',
  '错误', '报错', '出错', '崩溃', '重复', '内存', '卡', '丢失', '失败',
  'エラー', '壊れ', '重複', 'メモリ', '固ま', '落ち', '失われ', '失敗',
]

// A bug told without detail, or a failure.
export const DEBUG_I18N = [
  'no funciona', 'no funciono', 'no anda', 'no sirve', 'esta roto', 'se rompe', 'se rompio', 'falla(?:n)?(?![a-z])', 'fallo(?![a-z])',
  'no carga', 'no responde', 'da error', 'se cae', 'ya no (?:funciona|anda|va)', 'dejo de (?:funcionar|andar)',
  'funktioniert (?:es )?nicht', 'geht (?:es )?nicht', 'ist kaputt', 'kaputt', 'schlagt? fehl', 'schlagen fehl', 'fehlgeschlagen', 'fehler(?![a-z])', 'sturzt ab',
  'ne marche pas', 'ne marche plus', 'ne va plus', 'ne fonctionne (?:pas|plus)', 'ca marche pas', 'est casse', 'casse(?![a-z])', 'echoue', 'erreur', 'plante',
  'не работает', 'не запускается', 'не получается', 'сломан', 'ошибк', 'падает', 'вылетает', 'не открывается', 'перестал[аио]? работать',
  '不行', '用不了', '不能用了', '不能用', '没用', '用不了', '报错', '出错', '错误', '崩溃', '坏了', '失败', '不工作', '不起作用', '有问题', '出问题',
  '動かない', '動かなく', '動きません', '動作しない', 'エラー', '失敗', '壊れ', 'クラッシュ', '落ちる', 'おかしい', 'できない', 'バグ',
]

// "error message", "mensaje de error": text to change, not a failure.
export const ERROR_MESSAGE_PHRASE =
  /error (?:message|text|page|handling)|(?:mensaje|texto|pagina) de error|fehler(?:meldung|text|seite)|(?:message|texte|page) d.erreur|сообщени[а-я]* об ошибке|текст ошибки|错误(?:提示|信息|消息|页)|エラー(?:メッセージ|文|ページ|表示)/g

// What should happen instead.
export const EXPECTED_I18N = [
  'deberia', 'tendria que', 'en lugar de', 'en vez de', 'esperaba', 'se espera',
  'sollte', 'soll ', 'statt', 'anstatt', 'erwartet', 'stattdessen',
  'devrait', 'au lieu de', 'attendu', 'je m attendais',
  'должен', 'должна', 'должно', 'вместо', 'ожида',
  '应该', '应当', '而不是', '预期', '期望', '本该',
  'はず', 'べき', 'ではなく', '代わりに', '期待',
]

// When it happens: "cuando", "wenn", "quand".
export const WHEN_I18N =
  '(?:^|[^a-z0-9])(?:cuando|al (?:abrir|hacer|pulsar|entrar|cargar)|despues de|mientras|wenn|nachdem|sobald|beim|wahrend|quand|lorsque|apres|des que|pendant)(?![a-z])|когда|после|пока|при |的时候|时候|之后|如果|ときに|とき|たら|した後|場合'

export const FRUSTRATION_I18N = [
  'sigue (?:roto|sin funcionar|igual|fallando|mal)', 'otra vez', 'de nuevo (?:no|el mismo|falla)', 'no funciono', 'no funciona', 'no sirvio',
  'no sirve', 'mismo error', 'todavia (?:no|falla|roto)', 'aun (?:no|falla|roto)', 'no ha funcionado', 'sigue sin', 'no es lo que', 'no es eso',
  'immer noch', 'noch immer', 'nicht geklappt', 'hat nicht funktioniert', 'funktioniert nicht', 'geht nicht', 'kaputt', 'derselbe fehler',
  'gleiche fehler', 'schon wieder', 'wieder nicht', 'nach wie vor', 'das ist nicht was',
  'toujours (?:casse|pas|le meme|pareil)', 'ne marche (?:pas|toujours)', 'ne fonctionne (?:pas|toujours)', 'encore (?:casse|une fois|rate|pareil)',
  'meme erreur', 'ca marche pas', 'ca ne marche', 'pas marche', 'ce n est pas ce que',
  'все? ещ[её]', 'опять', 'снова не', 'не работает', 'не помогло', 'не получилось', 'та же ошибка', 'сломано', 'по.прежнему', 'не то',
  '还是(?:不行|坏|有问题|没|不对|一样)', '仍然', '依然', '又(?:报错|出错|不行|坏了|失败)', '不行', '没用', '不管用', '没有用', '同样的错误', '不对',
  '没成功', '没效果',
  'まだ(?:壊れ|動かない|動いてない|直って|だめ|ダメ|エラー)', 'また(?:エラー|だめ|ダメ|動かない)', '動かない', '直っていない', 'うまくいかな',
  '同じエラー', '効かな', '変わらない', 'だめ', 'ダメ', 'やっぱり',
]

// A short go-ahead, in three groups by how a word ends: Latin ones end at a
// letter's end, Cyrillic ones before a Cyrillic letter, Chinese and Japanese
// ones before a space or the end (they have no spaces inside).
export const ACK_LATIN =
  'si|vale|dale|adelante|sigue|continua|listo|perfecto|gracias|hazlo|aplicalo|de acuerdo|claro|bien|ja|weiter|mach weiter|mach es so|genau|gut|danke|klar|einverstanden|passt|oui|d accord|vas y|continue|parfait|merci|bien sur|applique|c est bon'
export const ACK_CYRILLIC = 'да|ок|хорошо|давай|продолжай|ладно|спасибо|применяй|согласен|отлично'
export const ACK_CJK = '好的|好|可以|继续|行|没问题|谢谢|确认|对|嗯|是的|接着|はい|わかった|了解|お願いします|続けて|いいよ|ありがとう|進めて|オーケー'

export const GREETING_I18N =
  'hola|buenos dias|buenas tardes|buenas noches|buenas|hallo|moin|servus|guten (?:tag|morgen|abend)|bonjour|bonsoir|salut|coucou|привет|здравствуй(?:те)?|добрый (?:день|вечер|утро)|你好|您好|嗨|こんにちは|おはよう|こんばんは|やあ'

// "from scratch", "complete", "end to end".
export const SCOPE_I18N = [
  'desde cero', 'de cero', 'completo', 'completa', 'de principio a fin', 'de punta a punta',
  'von grund auf', 'vollstandig', 'komplett', 'von anfang bis ende',
  'de zero', 'depuis zero', 'complet', 'de bout en bout',
  'с нуля', 'полност', 'целиком', 'полноценн', 'под ключ', 'от начала до конца',
  '从零', '从头', '完整', '端到端', '全套',
  'ゼロから', '一から', '完全な', '丸ごと', '一式',
]

// Failing again and again: days, weeks, nothing works.
export const REPEATED_FAILURE_I18N = [
  'llevamos (?:[0-9]+|dos|tres|cuatro|una|un|varios|unos) (?:dias|semanas|semana|meses|mes|horas)', 'desde hace (?:[0-9]+|dos|tres|una|un|varios) (?:dias|semanas|semana|meses|mes|horas)',
  'nada funciona', 'cada intento', 'una y otra vez', 'ya probamos todo', 'de una vez por todas',
  'seit (?:[0-9]+|zwei|drei|vier|einer|einem|mehreren|ein paar) (?:tagen|wochen|woche|monaten|monat|stunden)', 'immer wieder', 'jeder versuch', 'nichts hilft',
  'nichts funktioniert', 'alles versucht', 'endgultig',
  'depuis (?:[0-9]+|deux|trois|quatre|une|un|plusieurs) (?:jours|semaines|semaine|mois|heures)', 'voila (?:[0-9]+|deux|trois|une|un) (?:jours|semaines|semaine|mois)',
  'rien ne marche', 'rien ne fonctionne', 'chaque tentative', 'encore et encore', 'definitivement',
  'ca fait (?:[0-9]+|une|deux|trois|plusieurs) (?:jours?|semaines?|mois)',
  'уже (?:[0-9]+ |два |две |три |четыре |несколько )?(?:дн|недел|месяц|час)', 'две недели', 'три дня', 'неделю', 'ничего не помогает', 'каждая попытка',
  'каждое исправление', 'снова и снова', 'раз и навсегда',
  '(?:[0-9]+|两|二|三|几|一) ?(?:天|周|个星期|个月)[^。，]{0,12}(?:想|试|尝试|修|解决|折腾)', '(?:试|尝试|修|折腾)[^。，]{0,10}(?:[0-9]+|两|二|三|几|一) ?(?:天|周|个星期|个月)',
  '什么办法都', '彻底解决', '每次(?:尝试|修|改)', '一次又一次', '试了又试', '到处都坏', '反复',
  '(?:[0-9]+|二|三|一|数) ?(?:日|週間|か月|ヶ月|カ月)[^。、]{0,12}(?:やって|試し|直そう|直し|直せ|直らな|修正|解決できな|取り組)', '試すたびに', '直すたびに', '何度も', '何をしても', '格闘', '悩まされ', '苦戦',
  '何をやっても', '根本から',
]

// Moving a thing from one stack to another.
export const MIGRATION_I18N = new RegExp(
  [
    'migr',
    '(?:^|[^a-z])(?:pasa|pasar|traslada|trasladar|porta|reescribe|reescribir)[^.?!]{0,60}(?: de )[^.?!]{1,40}(?: a | hacia )',
    '(?:^|[^a-z])(?:umzieh|umstell|portier|verschieb)',
    ' von [^.?!]{1,40} auf [^.?!]{1,40} um(?![a-z])',
    '(?:^|[^a-z])(?:deplace|passe|bascule|reecris|porte|convertis)[^.?!]{0,60}(?: de | d.)[^.?!]{1,40} vers ',
    'перенес|мигрир|миграц|перепи[сш][^.?!]{0,50} с [^.?!]{1,40} на ',
    '迁移|移植|重写|改写',
    '移行|書き直',
  ].join('|'),
)

// The whole of something: for a move that is the whole app.
export const WHOLE_I18N = [
  'toda la', 'todo el', 'todos los', 'todas las', 'entero', 'entera', 'proyecto', 'aplicacion',
  'ganze', 'gesamte', 'alle ', 'komplett', 'projekt', 'anwendung', 'codebasis',
  'tout le', 'toute la', 'tous les', 'toutes les', 'entier', 'projet', 'application',
  'весь ', 'вся ', 'все ', 'всё ', 'целиком', 'проект', 'приложени', 'фронтенд', 'бэкенд',
  '整个', '全部', '所有', '项目', '应用',
  '全体', 'すべて', '全て', 'プロジェクト', 'アプリ',
]

export const DESIGN_I18N = [
  'disena', 'disenar', 'diseno de', 'entwirf', 'entwerfen', 'konzipier', 'concois', 'concevoir', 'спроектир', 'разработай архитектуру', '设计', '設計',
]

export const SYSTEM_I18N = [
  'sistema', 'esquema', 'base de datos', 'arquitectura', 'modelo de permisos', 'modelo de datos', 'permisos',
  'schema', 'datenbank', 'architektur', 'berechtigung', 'rollen', 'modell',
  'systeme', 'base de donnees', 'permissions', 'modele',
  'систем', 'схем', 'баз[аы] данных', 'прав доступа', 'модел', 'права',
  '系统', '架构', '数据库', '权限', '模型', '表结构',
  'システム', 'スキーマ', 'データベース', 'アーキテクチャ', '権限', 'モデル',
]

// The chores: commit message, typo, rename, format.
export const TRIVIAL_I18N = [
  'mensaje de commit', 'errata', 'renombra', 'formatea (?:el|la|este|esta|los|las) (?:archivo|codigo|fichero)', 'sangria',
  'commit.?nachricht', 'tippfehler', 'benenne', 'umbenenn', 'formatiere (?:die|den|das|diese[nr]?) (?:datei|code)', 'einruck',
  'message de commit', 'faute de frappe', 'coquille', 'renomme', 'formate (?:le|la|ce|cette|les) (?:fichier|code)', 'indentation',
  'сообщени[а-я]* коммит', 'коммит', 'опечатк', 'переименуй', 'отформатируй (?:файл|код)', 'отступ',
  '提交信息', '提交消息', '错别字', '拼写错误', '重命名', '格式化(?:代码|文件)', '缩进',
  'コミットメッセージ', '誤字', 'タイポ', '名前を変え', 'リネーム', '(?:コード|ファイル)を整形', 'インデント',
]

// Questions about code in view.
export const QUESTION_I18N = [
  'que hace', 'que es ', 'que significa', 'explica', 'resume(?![a-z])', 'cuantos', 'cuantas', 'donde esta', 'cual es el archivo',
  'was macht', 'was ist', 'was bedeutet', 'erklar', 'zusammenfass', 'wie viele', 'wo ist', 'welche datei',
  'que fait', 'qu est', 'que signifie', 'explique', 'resume(?![a-z])', 'combien', 'ou est', 'quel fichier',
  'что делает', 'что такое', 'что значит', 'объясни', 'кратко', 'сколько', 'где находится', 'какой файл',
  '是做什么', '做什么的', '是什么', '什么意思', '解释', '总结', '多少', '在哪', '哪个文件', '有哪些',
  '何をし', '何ですか', 'どういう', '説明', '要約', 'いくつ', 'どこ', 'どのファイル', 'ありますか',
]

export const LIST_I18N = [
  'lista', 'muestra', 'enumera',
  'liste', 'zeig',
  'montre', 'affiche',
  'перечисли', 'покажи', 'выведи',
  '列出', '显示', '展示',
  '一覧', '表示', '見せて', 'リスト',
]

export const INFO_I18N = [
  'archivo', 'carpeta', 'variable', 'comentario', 'rama', 'dependencia', 'paquete', 'ruta', 'funcion', 'clase',
  'datei', 'ordner', 'verzeichnis', 'skript', 'kommentar', 'abhangigkeit', 'umgebungsvariable', 'funktion', 'klasse',
  'fichier', 'dossier', 'repertoire', 'commentaire', 'branche', 'dependance', 'paquet', 'fonction', 'classe',
  'файл', 'папк', 'каталог', 'переменн', 'скрипт', 'комментар', 'ветк', 'зависимост', 'пакет', 'маршрут', 'функци', 'класс',
  '文件', '文件夹', '目录', '变量', '脚本', '注释', '分支', '依赖', '路由', '函数',
  'ファイル', 'フォルダ', 'ディレクトリ', '変数', 'スクリプト', 'コメント', 'ブランチ', '依存', 'パッケージ', 'ルート', '関数', 'クラス',
]

// Build and add verbs.
export const ADD_I18N = [
  'construye', 'crea ', 'desarrolla', 'implementa', 'escribe', 'anade', 'agrega',
  'bau ', 'baue', 'erstell', 'entwickl', 'implementier', 'schreib', 'fug',
  'construis', 'cree ', 'developpe', 'implemente', 'ecris', 'ajoute',
  'создай', 'построй', 'разработай', 'реализуй', 'напиши', 'добавь',
  '做一个', '做个', '写一个', '写个', '搭一个', 'сделай ', '开发', '实现', '创建', '构建', '编写', '添加', '加一个',
  '作って', '開発', '実装', '作成', '構築', '書いて', '追加',
]

// Words that join the parts of a request.
export const JOINERS = /\s(?:ve|and|ile|y|e|und|et|и)\s|[，、；;]|[和与及]|および/g

// "how do we stop X", "how do we handle X": a design question, not a small ask.
export const PREVENT_I18N = [
  'how (?:do|can|should|would) (?:we|i) (?:prevent|avoid|stop|handle|deal with|solve)', 'nasil (?:engelle|onle|coz|ele al)',
  'como (?:lo )?(?:evitamos|evitar|prevenimos|prevenir|manejamos|manejar|resolvemos|solucionamos|impedimos|impedir)',
  'wie (?:verhindern|vermeiden|losen|behandeln|handhaben)',
  'comment (?:l.?|le |la )?(?:empecher|eviter|prevenir|gerer|resoudre|on gere|on evite)',
  'как (?:это )?(?:предотвратить|избежать|не допустить|обработать|решить|не дать)',
  '怎么(?:防止|避免|处理|解决|阻止)', '如何(?:防止|避免|处理|解决|阻止)', '要不要', '是否要',
  'どう(?:防|対処|解決|避け)',
]

// Moving the whole of a thing to another stack: "move the whole app from X to Y",
// "tüm uygulamayı ... geçir", "pasa toda la aplicación a ...".
export const MOVE_WHOLE = new RegExp(
  [
    '(?:move|switch|port|shift|transition|migrate|convert|rewrite)[^.?!]{0,25}(?:whole|entire|all (?:the|our|of)|everything)',
    // Replacing a part everywhere in the product: only when the whole is named.
    '(?:replace|swap out)[^.?!]{0,90}(?:across|throughout|in) the (?:whole|entire) (?:product|app|application|project|codebase|system)',
    '(?:sustituye|reemplaza)[^.?!]{0,90}(?:en|por) (?:todo el|toda la) (?:producto|aplicacion|proyecto|codigo|sistema)',
    '(?:ersetze|tausch)[^.?!]{0,90}im (?:ganzen|gesamten) (?:produkt|projekt|system|code)',
    '(?:remplace|substitue)[^.?!]{0,90}dans (?:tout le|toute la) (?:produit|application|projet|code|systeme)',
    '(?:замени|заменить)[^.?!]{0,90}во (?:всём|всем) (?:продукте|проекте|приложении|коде)',
    '(?:替换|换成|取代)[^。，]{0,30}整个(?:产品|项目|系统|应用|代码)|在整个(?:产品|项目|系统|应用|代码)[^。，]{0,10}(?:替换|换成|取代)',
    '(?:tum|butun) (?:urun|uygulama|proje|sistem|kod tabani)[a-z]*[^.?!]{0,80}(?:degistir|yerine|gecir|tasi)',
    '(?:move|switch|port|shift|transition)[^.?!]{0,25}(?:the app|the project|the codebase|the backend|the frontend)[^.?!]{0,30}from [^.?!]{1,40} to ',
    '(?:tum|butun)[^.?!]{0,30}(?:gecir|tasi|cevir|donustur|yeniden yaz)',
    '(?:pasa|pasar|traslada|trasladar|lleva|llevar|migra|migrar|porta|portar|cambia|cambiar|reescribe|reescribir)[^.?!]{0,20}(?:toda|todo|todos|todas|entera|entero)',
    '(?:ganze|ganzen|gesamte|gesamten|komplette)[^.?!]{0,50} auf [^.?!]{1,40} um(?![a-z])',
    '(?:passe|migre|porte|bascule|convertis|deplace|reecris)[^.?!]{0,20}(?:tout|toute|tous|toutes|entier|entiere)',
    '(?:переведи|перенеси|перепиши|мигрируй|перейди|перевести|перенести|переписать|мигрировать|перейти|переехать)[^.?!]{0,30}(?:весь|вся|все|всё|целиком|полностью|проект)',
    '(?:upgrade)[^.?!]{0,25}(?:whole|entire|all (?:the|our|of)|everything)',
    '(?:整个|全部|所有)[^。，]{0,45}(?:迁移|重写|移植|升级)',
    '(?:整个|全部|所有)(?:前端|后端|项目|应用|产品|系统|代码库)[^。，]{0,25}(?:改成|换成|切换|转换)',
    '(?:全体|すべて|全て|丸ごと)[^。、]{0,30}(?:移行|書き直)',
    '(?:製品|プロジェクト|アプリ|システム|コード)全体[^。、]{0,40}(?:置き換|変え)',
  ].join('|'),
)

// Moving part of a thing: "from X to Y" in the languages where the cue is a pattern.
export const MOVE_FROM_TO = new RegExp(
  ['从[^。，？?]{1,40}(?:改成|换成|迁移到|切换到|改为)', '[^。、？?]{1,30}から[^。、？?]{1,30}に(?:移|変え|切り替え|置き換)'].join('|'),
)

// What makes a page slow: times that should be shorter.
export const SLOW_I18N = [
  'startup time', 'start.?up time', 'load(?:ing)? time', 'response time', 'boot time', 'cold start', 'takes? [0-9]+ (?:second|sec|minute)', 'halve the',
  'acilis sure', 'yariya', 'saniye(?:de|ye)? (?:aciliyor|yukleniyor|suruyor|cevap)',
  'tiempo de (?:arranque|carga|respuesta|inicio)', 'tarda(?:n)? [0-9]+',
  'startzeit', 'ladezeit', 'antwortzeit', 'dauert [0-9]+', 'braucht [0-9]+ sekunden', 'halbier',
  'temps de (?:demarrage|chargement|reponse)', 'met [0-9]+ secondes', 'prend [0-9]+', 'diviser par deux',
  'врем[а-я]* (?:запуска|загрузки|отклика|ответа)', 'грузится [0-9]+',
  '启动时间', '加载时间', '响应时间', '要 ?[0-9]+ ?秒', '[0-9]+ ?秒才',
  '起動時間', '読み込み時間', '応答時間', '[0-9]+ ?秒かかる',
]

// Named causes: a leak, a query that runs once per row.
export const CAUSE_I18N = [
  'n ?\\+ ?1', 'leak', 'heap', 'la fuga', 'una fuga', 'fuga(?![a-z])', 'fuite', 'das leck', 'leck(?![a-z])', 'мультиарендн', 'мультитенант',
]

// What a feature is made of, in the other languages.
export const FEATURE_I18N = [
  'progreso', 'subida', 'subir ', 'formulario', 'campo', 'boton', 'exporta', 'pagina', 'busqueda', 'buscador', 'filtr', 'paginacion', 'validacion',
  'valida(?:r|lo)?(?![a-z])', 'correo', 'notificacion', 'indicador', 'cache', 'carrito', 'pago', 'informe', 'panel', 'endpoint', 'contrasena',
  'calendario', 'modo oscuro', 'idioma',
  'fortschritt', 'hochlad', 'formular', 'feld', 'button', 'schaltflache', 'export', 'seite', 'suche', 'suchfeld', 'filter', 'paginierung', 'validier',
  'e-?mail', 'benachrichtigung', 'ladeindikator', 'warenkorb', 'zahlung', 'bericht', 'dashboard', 'passwort', 'kalender', 'dark.?mode',
  'progression', 'telecharg', 'formulaire', 'champ', 'bouton', 'page', 'recherche', 'filtre', 'pagination', 'validation', 'valide', 'notification',
  'panier', 'paiement', 'rapport', 'tableau de bord', 'mot de passe', 'calendrier', 'mode sombre',
  'прогресс', 'загрузк', 'форм', 'поле', 'кнопк', 'экспорт', 'страниц', 'поиск', 'фильтр', 'пагинац', 'валидац', 'письм', 'уведомлен', 'индикатор',
  'кэш', 'корзин', 'платеж', 'платёж', 'отчет', 'отчёт', 'панел', 'пароль', 'календар', 'тёмн', 'темн',
  '进度', '上传', '表单', '字段', '按钮', '导出', '页面', '搜索', '筛选', '过滤', '分页', '校验', '验证', '邮件', '通知', '加载动画', '缓存', '购物车',
  '支付', '报表', '仪表盘', '接口', '密码', '日历', '深色模式',
  '進捗', 'アップロード', 'フォーム', '欄', 'ボタン', 'エクスポート', '書き出', 'ページ', '検索', '絞り込', 'フィルタ', 'ページネーション', 'バリデーション',
  '入力チェック', 'メール', '通知', '読み込み中', 'キャッシュ', 'カート', '決済', 'レポート', 'ダッシュボード', 'エンドポイント', 'パスワード',
  'カレンダー', 'ダークモード',
]

// Writing tests: "escribe tests", "schreib Tests", "写单元测试".
export const TEST_WRITE_I18N = [
  '(?:escribe|crea|anade|agrega|haz)[^.?!]{0,30}(?:tests?|pruebas)',
  '(?:schreib|erstell|fug)[^.?!]{0,30}tests?',
  '(?:ecris|cree|ajoute)[^.?!]{0,30}tests?',
  'напиши[^.?!]{0,30}тест',
  '(?:写|编写)[^。，]{0,10}测试', '测试用例',
  'テストを(?:書|作|追加)', 'テスト[^。、]{0,6}書いて',
]

// Asking how to set up the work, and for a plan to follow, in the other languages.
export const STRUCTURE_I18N = [
  'como deberiamos (?:organizar|estructurar|disenar|plantear)', 'propon(?:me)? un plan', 'un plan(?![a-z])',
  'wie sollten wir', 'schlag (?:einen )?plan vor', 'einen plan',
  'comment (?:organiser|structurer|concevoir)', 'propose un plan', 'un plan(?![a-z])',
  'как нам (?:организовать|структурировать|построить)', 'предложи план', 'план действий',
  '怎么(?:组织|设计|划分)', '该怎么(?:组织|设计|划分)', '给出[^。，]{0,4}(?:方案|计划)', '一个计划',
  'どう(?:構成|設計|整理|分け)', '計画を提案', 'プランを提案',
]

export const MONEY_I18N =['pago', 'zahlung', 'paiement', 'платеж', 'платёж', 'оплат', '支付', '付款', '決済', '支払']

export const INTEGRATION_I18N = ['integracion', 'integra(?:r|lo)?(?![a-z])', 'integrier', 'integration', 'интеграц', '集成', '对接', '統合', '連携']

// A fault that comes and goes, or shows on some devices only, said by a ratio or a place.
export const ELUSIVE_MORE = [
  'one (?:in|out of) (?:ten|[0-9]+)', '1 in [0-9]+', 'only on some (?:devices|phones|machines)', 'on some (?:samsung|android|iphone|huawei)', 'on some devices',
  'bazi cihazlarda', 'on denemede bir',
  'una de cada (?:diez|[0-9]+)', 'solo en algunos (?:dispositivos|moviles|equipos)',
  'jedes (?:zehnte|[0-9]+\.?) mal', 'nur auf (?:manchen|einigen)', 'auf manchen [^.?!]{0,15}geraten',
  'une fois sur (?:dix|[0-9]+)', 'sur certains (?:appareils|telephones)',
  'раз из десяти|один раз из|только на некоторых', 'на некоторых [а-я]*(?:телефон|устройств)',
  '十次[^，。]{0,3}一次', '[0-9]+ ?次[^，。]{0,3}一次', '部分[^，。]{0,6}(?:手机|设备|机型)',
  '[0-9]+ ?回に ?[0-9]+ ?回', '十回に一度', '一部の(?:端末|機種|デバイス)',
]

// Slowness told by size or place: a bottleneck, millions of rows, minutes or hours.
export const HARD_MORE = [
  'bottleneck', '(?:million|billion) (?:rows|records)', 'millions of (?:rows|records)', 'taking (?:minutes|hours)', 'takes (?:minutes|hours)',
  'stolen', 'rotate (?:them|the |tokens?|keys?|secrets?)', 'upgrade (?:the )?(?:whole|entire)',
  'dar bogaz', 'milyon (?:satir|kayit)',
  'cuello de botella', 'tardan? (?:minutos|horas)', 'millones de (?:filas|registros)',
  'flaschenhals|engpass', 'millionen (?:datensatz|zeilen|eintrag)', 'dauert [^.?!]{0,25}(?:sekunden|minuten|stunden)',
  'goulot', 'millions de (?:lignes|enregistrements)', 'prend maintenant', 'mettait [0-9]+', 'heures alors que',
  'узк[а-я]* мест', 'миллион[а-я]* (?:строк|записей)',
  '瓶颈', '(?:万|亿)行', '要 ?[0-9]+ ?多秒', '(?:几十|四十)秒',
  'ボトルネック', '時間かか', '終わらなく', 'データ増加',
]

// Not knowing the cause, suspecting, fearing: a weak sign of a hunt; and the
// words of a login check in the languages whose lists stay weak on them.
export const MAYBE_HARD_MORE = [
  'not sure', 'no idea why', 'don.?t know (?:why|if|whether)', 'i suspect', 'worried', 'afraid',
  'emin degilim', 'nedenini bilmiyorum', 'supheleniyorum', 'endiseliyim',
  'no se si', 'no se por que', 'sospecho', 'temo(?![a-z])', 'no estoy segur', 'no entiendo por que', 'contrasena', 'token', 'jwt', 'sesion',
  'ich weiss nicht', 'nicht sicher', 'ich vermute', 'ich furchte', 'woran es liegt', 'verstehe nicht warum', 'passwort', 'passworter', 'token', 'jwt', 'sitzung',
  'je ne sais pas', 'je crains', 'je soupconne', 'pas sur', 'je ne comprends pas pourquoi', 'mots? de passe', 'token', 'jwt', 'session',
  'не знаю', 'не понимаю', 'подозреваю', 'боюсь', 'не уверен', 'непонятно', 'в ч[её]м дело', 'парол', 'токен', 'jwt', 'сесси',
  '不知道', '不确定', '怀疑', '担心', '不明白', '不清楚', '搞不懂', '怎么回事', '密码', '令牌', 'token', 'jwt', '会话', '鉴权',
  '分からない', 'わからない', '不明', '怖い', '心配', 'っぽい', '疑', 'パスワード', 'トークン', 'jwt', 'セッション',
]

// Failing for the third, fourth or fifth time.
export const REPEATED_MORE = [
  '(?:third|fourth|fifth|3rd|4th|5th) (?:time|attempt|try)', 'for the (?:third|fourth|fifth) time',
  '(?:ucuncu|dorduncu|besinci) (?:kez|deneme)',
  '(?:tercera|cuarta|quinta) (?:vez|intento)', 'por (?:tercera|cuarta|quinta) vez',
  'zum (?:dritten|vierten|funften) mal', '(?:dritten|vierten|funften) versuch',
  '(?:troisieme|quatrieme|cinquieme) (?:fois|tentative)', 'pour la (?:troisieme|quatrieme|cinquieme) fois',
  '(?:трет|четв[её]рт|пят)[а-я]* (?:попытк|раз)', 'в который раз',
  '第[三四五六七八九十]次(?:尝试|修|试|了)', '第 ?[3-9] ?次(?:尝试|修|试|了)',
  '[3-9] ?回目[^。]{0,8}(?:お願い|依頼|試|修正|直)', '(?:三|四|五)回目[^。]{0,8}(?:お願い|依頼|試|修正|直)',
]

// What to do first and what next: a plan of steps, said in each language.
export const SEQUENCE = new RegExp(
  [
    '(?:^|[^a-z0-9])(?:first|then|after that|next)(?![a-z])',
    '(?:^|[^a-z0-9])(?:once|sonra|ardindan|ilk olarak|once(?= )|asama asama)',
    '(?:^|[^a-z0-9])(?:primero|luego|despues|despues de|por etapas|por fases)',
    '(?:^|[^a-z0-9])(?:zuerst|erst|dann|danach|schrittweise|in schritten)',
    '(?:^|[^a-z0-9])(?:d abord|puis|ensuite|etape par etape|par etapes)',
    '(?:^|[^а-яё])(?:сначала|потом|затем|поэтапно|по этапам|по шагам|начни с)',
    '先|然后|接着|分步骤|分批|逐步',
    'まず|その後|次に|段階的|順番に|最初から',
  ].join('|'),
)

// A hole in access control, a desync, a profiler named: hard whatever the rest says.
export const HARD_MORE2 = [
  'access control', 'authorization check', 'someone else.s (?:invoice|order|account|data)', 'other users.? (?:data|invoices|orders|accounts)', 'desync', 'out of sync',
  'pprof', 'profiler', 'heap dump', 'flame ?graph', 'valgrind', 'strace', 'core dump', 'goroutine',
  'yetki(?:siz| kontrol)', 'acik(?:lari)? kapat', 'baskasinin (?:fatura|siparis|hesab|veri)',
  'control de acceso', 'desincroniz', 'ver (?:los )?(?:pedidos|facturas|datos) de (?:otros|otro)',
  'zugriffskontrolle', 'berechtigungsprufung', 'fremde (?:rechnungen|daten|konten)', 'desynchron',
  'controle d.acces', 'desynchronis', 'les (?:factures|commandes|donnees) d.autres',
  'чужи[ех] (?:заказ|счет|данн)', 'проверк[аи] прав', 'рассинхрон', 'десинхрон',
  '别人的(?:订单|账单|数据)', '越权', '权限校验', '不同步', '同步问题',
  '他人の(?:注文|請求書|データ)', '権限チェック', '認可', '同期(?:が)?ずれ',
]

// "tried it three times": a count of failed tries.
export const REPEATED_MORE2 = [
  'tried (?:two|three|four|five|[0-9]+) times', '(?:three|four|five|[0-9]+) times (?:already|now)',
  '(?:iki|uc|dort|bes|[0-9]+) kez (?:denedik|denendi|duzelt)',
  '(?:intentamos|probamos|intentado|probado|arreglar|arreglado|corregido|corregir)[^.?!]{0,30}(?:dos|tres|cuatro|cinco|[0-9]+) veces',
  '(?:dritte[nr]?|vierte[nr]?|funfte[nr]?) (?:versuch|mal)', 'schon (?:zwei|drei|vier|funf|[0-9]+) ?mal (?:versucht|probiert|repariert)',
  '(?:essaye|tente|corrige)[^.?!]{0,20}(?:deux|trois|quatre|cinq|[0-9]+) fois',
  '(?:два|три|четыре|пять|[0-9]+) раз[а]? (?:пытал|правил|исправля|чини)',
  '(?:试了|修了|改了)(?:两|三|四|五|[0-9]+) ?(?:次|遍)',
  '(?:二|三|四|五|[0-9]+) ?回(?:修正|試し|直し|やって)',
]

// A close read of written work to find what is wrong in it: "revisa", "relis",
// "перечитай", "见直し"; said alone, it is a review.
export const REVIEW_I18N = [
  'revis(?:a|ar|alo|ala|en|ad)(?![a-z])', 'repas(?:a|ar|alo)(?![a-z])', 'relee',
  'uberpruf', 'durchsehen', 'durchgehen', 'gegenlesen', 'korrekturlesen', 'korrektur lesen',
  'relis', 'relire', 'relisez', 'passe[rz]? en revue', 'revois', 'revoir', 'reviser',
  'перечитай', 'перечитать', 'вычитай', 'вычитать', 'просмотри', 'пересмотри', 'ревью',
  '审查', '审阅', '校对', '复查', '过一遍', '检查一遍',
  '読み直', '見直', '精査', '校正', 'レビュー', 'チェックし直',
]

// A read or a check, which a word of care ("de nuevo", "genau") makes a review.
export const READ_I18N = [
  'lee(?:lo|la|r)?(?![a-z])', 'comprueba', 'verifica',
  'lies(?![a-z])', 'lesen', 'prufe?(?![a-z])', 'kontrollier',
  'lis(?![a-z])', 'lire', 'verifie[rz]?(?![a-z])', 'controle[rz]?(?![a-z])',
  'прочитай', 'прочти', 'проверь', 'проверить',
  '读', '阅读', '检查', '看一遍',
  '読ん', '読み', '確認', 'チェック',
]

export const CLOSELY_I18N = [
  'de nuevo', 'otra vez', 'con (?:cuidado|detalle)', 'detenidamente', 'desde el principio', 'linea por linea', 'a fondo',
  'nochmal', 'noch einmal', 'erneut', 'genau', 'grundlich', 'sorgfaltig', 'von vorne', 'zeile fur zeile',
  'a nouveau', 'encore', 'attentivement', 'soigneusement', 'en detail', 'depuis le debut', 'ligne par ligne',
  'внимательно', 'тщательно', 'подробно', 'снова', 'ещё раз', 'еще раз', 'заново', 'с начала', 'построчно',
  '仔细', '认真', '重新', '从头', '再', '逐行',
  'もう一度', '再度', 'じっくり', '丁寧に', '細かく', '最初から', '一行ずつ',
]

export const TO_FIX_I18N = [
  'corrig', 'arregl', 'error', 'errata', 'fallo', 'problema', 'detalle',
  'korrigier', 'beheb', 'fehler', 'problem', 'kleinigkeit',
  'corrige', 'faute', 'erreur', 'probleme', 'detail',
  'исправ', 'ошибк', 'опечат', 'проблем', 'недочет', 'недочёт',
  '修改', '修正', '改正', '错误', '错', '问题', '细节',
  '直し', '直す', '修正', '誤り', '間違', 'ミス', '問題', '細か',
]

// Work to carry out beside a question cue: run it, measure it, install it.
export const RUN_I18N = [
  'ejecut', 'mide(?![a-z])', 'instala(?![a-z])',
  'fuhr(?:e)? [a-z ]{0,30}aus', 'miss(?![a-z])', 'installier',
  'execute(?![a-z])', 'lance(?![a-z])', 'mesure(?![a-z])', 'installe(?![a-z])',
  'запусти', 'измерь', 'установи',
  '运行', '跑一下', '测量', '安装',
  '実行', '測定', 'インストール',
]
