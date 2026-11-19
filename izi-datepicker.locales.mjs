/*!
 * iZiDatePicker locale pack - interface strings for 10 languages (ar de es fr it pt ru tr zh ja).
 * Month / weekday / AM-PM / digit names do NOT live here: for the Gregorian calendar they come from the browser's Intl data.
 * Strings not listed fall back to English. Machine-assisted translations: native-speaker review is welcome.
 *
 *   load izi-datepicker.js, then this file (script tags or imports), then:
 *   new iZiDatePicker('#d', { calendar: 'gregorian', locale: 'de' })
 */
import iZiDatePicker from './izi-datepicker.mjs';
const factory = function (JDP) {
  'use strict';
  // key order: today clear confirm cancel prevMonth nextMonth month year hour minute second start end time week dialog rangePlaceholder pickEnd selected cleared invalid prevYear nextYear years prevYears nextYears presetsLabel
  const KEYS = 'today clear confirm cancel prevMonth nextMonth month year hour minute second start end time week dialog rangePlaceholder pickEnd selected cleared invalid prevYear nextYear years prevYears nextYears presetsLabel'.split(' ');
  const PKEYS = 'today yesterday tomorrow last7 last30 thisWeek lastWeek thisMonth lastMonth thisYear lastYear'.split(' ');
  const D = {
    ar: ['اليوم|مسح|تأكيد|إلغاء|الشهر السابق|الشهر التالي|الشهر|السنة|الساعة|الدقيقة|الثانية|البداية|النهاية|الوقت|الأسبوع|اختيار التاريخ|اختر نطاقًا|اختر تاريخ النهاية|تم الاختيار|تم مسح الاختيار|تاريخ غير صالح|السنة السابقة|السنة التالية|السنوات|السنوات السابقة|السنوات التالية|نطاقات سريعة', 'اليوم|أمس|غدًا|آخر 7 أيام|آخر 30 يومًا|هذا الأسبوع|الأسبوع الماضي|هذا الشهر|الشهر الماضي|هذه السنة|السنة الماضية', 'آخر {n} يومًا|الـ {n} يومًا القادمة', 'dddd، D MMMM YYYY'],
    de: ['Heute|Löschen|Bestätigen|Abbrechen|Vorheriger Monat|Nächster Monat|Monat|Jahr|Stunde|Minute|Sekunde|Beginn|Ende|Zeit|Woche|Datum wählen|Zeitraum wählen|Wählen Sie das Enddatum|ausgewählt|Auswahl gelöscht|Ungültiges Datum|Vorheriges Jahr|Nächstes Jahr|Jahre|Frühere Jahre|Spätere Jahre|Schnellauswahl', 'Heute|Gestern|Morgen|Letzte 7 Tage|Letzte 30 Tage|Diese Woche|Letzte Woche|Dieser Monat|Letzter Monat|Dieses Jahr|Letztes Jahr', 'Letzte {n} Tage|Nächste {n} Tage', 'dddd, D. MMMM YYYY'],
    es: ['Hoy|Borrar|Confirmar|Cancelar|Mes anterior|Mes siguiente|Mes|Año|Hora|Minuto|Segundo|Inicio|Fin|Hora|Semana|Elegir fecha|Elegir un rango|Ahora elige la fecha final|seleccionado|Selección borrada|Fecha no válida|Año anterior|Año siguiente|Años|Años anteriores|Años siguientes|Rangos rápidos', 'Hoy|Ayer|Mañana|Últimos 7 días|Últimos 30 días|Esta semana|Semana pasada|Este mes|Mes pasado|Este año|Año pasado', 'Últimos {n} días|Próximos {n} días', 'dddd, D [de] MMMM [de] YYYY'],
    fr: ["Aujourd'hui|Effacer|Confirmer|Annuler|Mois précédent|Mois suivant|Mois|Année|Heure|Minute|Seconde|Début|Fin|Heure|Semaine|Choisir une date|Choisir une période|Choisissez maintenant la date de fin|sélectionné|Sélection effacée|Date invalide|Année précédente|Année suivante|Années|Années précédentes|Années suivantes|Plages rapides", "Aujourd'hui|Hier|Demain|7 derniers jours|30 derniers jours|Cette semaine|Semaine dernière|Ce mois-ci|Mois dernier|Cette année|Année dernière", '{n} derniers jours|{n} prochains jours', 'dddd D MMMM YYYY'],
    it: ["Oggi|Cancella|Conferma|Annulla|Mese precedente|Mese successivo|Mese|Anno|Ora|Minuto|Secondo|Inizio|Fine|Ora|Settimana|Scegli la data|Scegli un intervallo|Ora scegli la data finale|selezionato|Selezione cancellata|Data non valida|Anno precedente|Anno successivo|Anni|Anni precedenti|Anni successivi|Intervalli rapidi", "Oggi|Ieri|Domani|Ultimi 7 giorni|Ultimi 30 giorni|Questa settimana|Settimana scorsa|Questo mese|Mese scorso|Quest'anno|Anno scorso", 'Ultimi {n} giorni|Prossimi {n} giorni', 'dddd D MMMM YYYY'],
    pt: ['Hoje|Limpar|Confirmar|Cancelar|Mês anterior|Próximo mês|Mês|Ano|Hora|Minuto|Segundo|Início|Fim|Hora|Semana|Escolher data|Escolher um intervalo|Agora escolha a data final|selecionado|Seleção limpa|Data inválida|Ano anterior|Próximo ano|Anos|Anos anteriores|Próximos anos|Intervalos rápidos', 'Hoje|Ontem|Amanhã|Últimos 7 dias|Últimos 30 dias|Esta semana|Semana passada|Este mês|Mês passado|Este ano|Ano passado', 'Últimos {n} dias|Próximos {n} dias', 'dddd, D [de] MMMM [de] YYYY'],
    ru: ['Сегодня|Очистить|Подтвердить|Отмена|Предыдущий месяц|Следующий месяц|Месяц|Год|Час|Минута|Секунда|Начало|Конец|Время|Неделя|Выбор даты|Выберите период|Теперь выберите конечную дату|выбрано|Выбор очищен|Неверная дата|Предыдущий год|Следующий год|Годы|Предыдущие годы|Следующие годы|Быстрый выбор', 'Сегодня|Вчера|Завтра|Последние 7 дней|Последние 30 дней|Эта неделя|Прошлая неделя|Этот месяц|Прошлый месяц|Этот год|Прошлый год', 'Последние {n} дн.|Следующие {n} дн.', 'dddd, D MMMM YYYY'],
    tr: ['Bugün|Temizle|Onayla|İptal|Önceki ay|Sonraki ay|Ay|Yıl|Saat|Dakika|Saniye|Başlangıç|Bitiş|Saat|Hafta|Tarih seç|Aralık seç|Şimdi bitiş tarihini seçin|seçildi|Seçim temizlendi|Geçersiz tarih|Önceki yıl|Sonraki yıl|Yıllar|Önceki yıllar|Sonraki yıllar|Hızlı aralıklar', 'Bugün|Dün|Yarın|Son 7 gün|Son 30 gün|Bu hafta|Geçen hafta|Bu ay|Geçen ay|Bu yıl|Geçen yıl', 'Son {n} gün|Sonraki {n} gün', 'D MMMM YYYY dddd'],
    zh: ['今天|清除|确认|取消|上个月|下个月|月|年|时|分|秒|开始|结束|时间|周|选择日期|选择日期范围|请选择结束日期|已选择|已清除选择|日期无效|上一年|下一年|年份|更早的年份|更晚的年份|快捷范围', '今天|昨天|明天|最近7天|最近30天|本周|上周|本月|上月|今年|去年', '最近{n}天|未来{n}天', 'YYYY年M月D日 dddd'],
    ja: ['今日|クリア|確定|キャンセル|前の月|次の月|月|年|時|分|秒|開始|終了|時刻|週|日付を選択|期間を選択|終了日を選択してください|選択しました|選択をクリアしました|無効な日付|前の年|次の年|年|前の年代|次の年代|クイック範囲', '今日|昨日|明日|過去7日間|過去30日間|今週|先週|今月|先月|今年|昨年', '過去{n}日間|今後{n}日間', 'YYYY年M月D日 dddd']
  };
  const pack = {};
  for (const lang in D) {
    const [ui, pr, tpl, pf] = D[lang], u = ui.split('|'), p = pr.split('|'), t = tpl.split('|');
    const o = { previewFormat: pf, presetLast: t[0], presetNext: t[1], presets: {} };
    KEYS.forEach((k, i) => { o[k] = u[i]; });
    PKEYS.forEach((k, i) => { o.presets[k] = p[i]; });
    JDP.registerLocale(lang, o);
    pack[lang] = o;
  }
  return pack;
};
export const pack = factory(iZiDatePicker);
export default pack;
