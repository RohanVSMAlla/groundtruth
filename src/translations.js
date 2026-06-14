export const LANGUAGES = {
  en: { name: 'English', dir: 'ltr' },
  ar: { name: 'العربية', dir: 'rtl' },
  zh: { name: '中文', dir: 'ltr' },
  fr: { name: 'Français', dir: 'ltr' },
  ru: { name: 'Русский', dir: 'ltr' },
  es: { name: 'Español', dir: 'ltr' },
}

export const T = {
  appTitle: { en: 'GroundTruth', ar: 'جراوند تروث', zh: 'GroundTruth', fr: 'GroundTruth', ru: 'GroundTruth', es: 'GroundTruth' },
  tagline: {
    en: 'Community crisis damage reporting', ar: 'الإبلاغ المجتمعي عن أضرار الأزمات',
    zh: '社区危机损害报告', fr: 'Signalement communautaire des dommages',
    ru: 'Сообщение об ущербе от кризиса', es: 'Informe comunitario de daños',
  },
  report: { en: 'Report', ar: 'إبلاغ', zh: '报告', fr: 'Signaler', ru: 'Сообщить', es: 'Reportar' },
  dashboard: { en: 'Dashboard', ar: 'لوحة التحكم', zh: '仪表板', fr: 'Tableau de bord', ru: 'Панель', es: 'Panel' },
  reportDamage: { en: 'Report damage', ar: 'الإبلاغ عن الأضرار', zh: '报告损害', fr: 'Signaler les dommages', ru: 'Сообщить об ущербе', es: 'Reportar daños' },
  photo: { en: '1. Photo', ar: '١. صورة', zh: '1. 照片', fr: '1. Photo', ru: '1. Фото', es: '1. Foto' },
  location: { en: '2. Location', ar: '٢. الموقع', zh: '2. 位置', fr: '2. Emplacement', ru: '2. Местоположение', es: '2. Ubicación' },
  captureLocation: { en: 'Capture my location', ar: 'تحديد موقعي', zh: '获取我的位置', fr: 'Capturer ma position', ru: 'Определить местоположение', es: 'Capturar mi ubicación' },
  damageLevel: { en: '3. Damage level', ar: '٣. مستوى الضرر', zh: '3. 损害程度', fr: '3. Niveau de dommage', ru: '3. Уровень ущерба', es: '3. Nivel de daño' },
  minimal: { en: 'Minimal', ar: 'طفيف', zh: '轻微', fr: 'Minime', ru: 'Минимальный', es: 'Mínimo' },
  partial: { en: 'Partial', ar: 'جزئي', zh: '部分', fr: 'Partiel', ru: 'Частичный', es: 'Parcial' },
  destroyed: { en: 'Destroyed', ar: 'مدمر', zh: '损毁', fr: 'Détruit', ru: 'Разрушен', es: 'Destruido' },
  infraType: { en: '4. Infrastructure type', ar: '٤. نوع البنية التحتية', zh: '4. 基础设施类型', fr: '4. Type d\'infrastructure', ru: '4. Тип инфраструктуры', es: '4. Tipo de infraestructura' },
  crisisType: { en: '5. Crisis type', ar: '٥. نوع الأزمة', zh: '5. 危机类型', fr: '5. Type de crise', ru: '5. Тип кризиса', es: '5. Tipo de crisis' },
  select: { en: 'Select...', ar: 'اختر...', zh: '选择...', fr: 'Sélectionner...', ru: 'Выбрать...', es: 'Seleccionar...' },
  debris: { en: 'Debris present at site', ar: 'وجود حطام في الموقع', zh: '现场有碎片', fr: 'Débris présents sur le site', ru: 'На месте есть обломки', es: 'Escombros en el sitio' },
  submit: { en: 'Submit report', ar: 'إرسال البلاغ', zh: '提交报告', fr: 'Envoyer le rapport', ru: 'Отправить отчёт', es: 'Enviar reporte' },
  nearby: { en: 'Already reported nearby', ar: 'تم الإبلاغ عنه بالقرب', zh: '附近已报告', fr: 'Déjà signalé à proximité', ru: 'Уже сообщено поблизости', es: 'Ya reportado cerca' },
  nearbyHint: { en: 'Check the map before reporting to avoid duplicates.', ar: 'تحقق من الخريطة قبل الإبلاغ لتجنب التكرار.', zh: '报告前请查看地图以避免重复。', fr: 'Vérifiez la carte avant de signaler pour éviter les doublons.', ru: 'Проверьте карту перед отправкой, чтобы избежать дубликатов.', es: 'Revise el mapa antes de reportar para evitar duplicados.' },
  coordinatorDashboard: { en: 'Coordinator dashboard', ar: 'لوحة تحكم المنسق', zh: '协调员仪表板', fr: 'Tableau de bord du coordinateur', ru: 'Панель координатора', es: 'Panel del coordinador' },
  buildings: { en: 'Buildings', ar: 'المباني', zh: '建筑物', fr: 'Bâtiments', ru: 'Здания', es: 'Edificios' },
  reports: { en: 'Reports', ar: 'البلاغات', zh: '报告', fr: 'Rapports', ru: 'Отчёты', es: 'Reportes' },
  filterDamage: { en: 'Filter by damage level', ar: 'تصفية حسب مستوى الضرر', zh: '按损害程度筛选', fr: 'Filtrer par niveau', ru: 'Фильтр по уровню', es: 'Filtrar por nivel' },
  allLevels: { en: 'All levels', ar: 'جميع المستويات', zh: '所有级别', fr: 'Tous niveaux', ru: 'Все уровни', es: 'Todos los niveles' },
  online: { en: 'Online', ar: 'متصل', zh: '在线', fr: 'En ligne', ru: 'В сети', es: 'En línea' },
  offline: { en: 'Offline', ar: 'غير متصل', zh: '离线', fr: 'Hors ligne', ru: 'Не в сети', es: 'Sin conexión' },
}

export function tr(key, lang) {
  return T[key]?.[lang] || T[key]?.en || key
}