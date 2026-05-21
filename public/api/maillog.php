<?php
/* ============================================================
 *  Простой просмотрщик leads.log из браузера.
 *  URL: https://кинопремиядв.рф/api/maillog.php?key=dvkino2026
 *
 *  Показывает последние 50 заявок с пометкой ✓SENT / ✗FAIL,
 *  чтобы оператор мог проверить статус доставки писем без FTP.
 *  Простой токен в URL — защита от случайных глаз.
 * ============================================================ */

const VIEWER_KEY = 'dvkino2026';     // меняйте если хотите другой токен в URL
const LOG_FILE   = __DIR__ . '/leads.log';
const LIMIT      = 50;

header('Content-Type: text/html; charset=utf-8');

if (($_GET['key'] ?? '') !== VIEWER_KEY) {
    http_response_code(403);
    echo '<h1>403 Forbidden</h1>';
    echo '<p>Добавьте к URL ?key=&lt;ваш-токен&gt;</p>';
    exit;
}

$lines = is_file(LOG_FILE) ? file(LOG_FILE, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) : [];
$lines = array_reverse(array_slice($lines, -LIMIT));
$total = is_file(LOG_FILE) ? count(file(LOG_FILE, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES)) : 0;

$sentCount = 0; $failCount = 0;
foreach ($lines as $l) {
    if (strpos($l, '✓SENT') !== false) $sentCount++;
    elseif (strpos($l, '✗FAIL') !== false) $failCount++;
}

?><!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<title>Заявки · ДВ Кинопремия</title>
<style>
  body { font: 14px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
         margin: 32px auto; max-width: 1100px; padding: 0 20px; color: #1c1915; }
  h1 { margin: 0 0 8px; font-size: 22px; }
  .meta { color: #666; margin-bottom: 24px; font-size: 13px; }
  .stats { display: flex; gap: 16px; margin-bottom: 24px; }
  .stat { padding: 12px 18px; border-radius: 8px; border: 1px solid #e5e1d8; }
  .stat b { font-size: 20px; display: block; }
  .stat.ok b { color: #2d7a3d; }
  .stat.fail b { color: #c0392b; }
  .stat.tot b { color: #1c1915; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th, td { padding: 8px 10px; border-bottom: 1px solid #eee; text-align: left; vertical-align: top; }
  th { background: #faf8f3; font-weight: 600; }
  tr:hover { background: #fcfbf7; }
  .ok { color: #2d7a3d; font-weight: 600; }
  .fail { color: #c0392b; font-weight: 600; }
  .empty { color: #999; }
  .note { background: #fff7e6; border-left: 3px solid #d99d47; padding: 12px 16px;
          margin: 24px 0; border-radius: 4px; color: #4a3f2c; }
</style>
</head>
<body>

<h1>Журнал заявок — ДВ Кинопремия</h1>
<p class="meta">Всего записей: <?=$total?> · Показаны последние <?=count($lines)?> (новые сверху)</p>

<div class="stats">
  <div class="stat ok"><b><?=$sentCount?></b>письма отправлены</div>
  <div class="stat fail"><b><?=$failCount?></b>не удалось отправить</div>
  <div class="stat tot"><b><?=$total?></b>всего заявок</div>
</div>

<?php if ($failCount > 0): ?>
<div class="note">
  <strong>⚠️ Есть неотправленные письма.</strong>
  Проверьте конфиг почты в reg.ru (SPF/DKIM, наличие почтового ящика noreply@).
  Сами заявки сохранены в этом логе — данные не потеряны.
</div>
<?php endif; ?>

<table>
<tr>
  <th style="width:140px">Дата</th>
  <th style="width:120px">IP</th>
  <th style="width:80px">Статус</th>
  <th>Имя · контакты · фильм</th>
</tr>
<?php if (!$lines): ?>
<tr><td colspan="4" class="empty">Заявок пока нет.</td></tr>
<?php else: foreach ($lines as $l):
  // [21.05.2026 16:37:58] 95.188.219.118 ✓SENT → Имя | email | tel | title
  if (!preg_match('/^\[([^\]]+)\]\s+(\S+)\s+(\S+)(?:\s+→\s+(.*))?$/u', $l, $m)) {
      // старый формат без статуса
      preg_match('/^\[([^\]]+)\]\s+(\S+)\s+(.*)$/u', $l, $m);
      $m[3] = '—';
      $m[4] = $m[3] ?? '';
  }
  $isOk = isset($m[3]) && strpos($m[3], '✓') !== false;
  $isFail = isset($m[3]) && strpos($m[3], '✗') !== false;
  $statusClass = $isOk ? 'ok' : ($isFail ? 'fail' : '');
  $rest = $m[4] ?? '';
?>
<tr>
  <td><?=htmlspecialchars($m[1] ?? '')?></td>
  <td><?=htmlspecialchars($m[2] ?? '')?></td>
  <td class="<?=$statusClass?>"><?=htmlspecialchars($m[3] ?? '—')?></td>
  <td><?=htmlspecialchars($rest)?></td>
</tr>
<?php endforeach; endif; ?>
</table>

<p class="meta" style="margin-top:32px">
  Полный лог: <code>/api/leads.log</code> (через файловый менеджер)
</p>

</body>
</html>
