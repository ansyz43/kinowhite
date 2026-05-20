<?php
/* ============================================================
 *  Дальневосточная Кинопремия — приём заявок
 *  Совместимо с shared-хостингом reg.ru (PHP 7.4+ / 8.x).
 *
 *  Сценарий:
 *    - Astro собирает сайт в dist/ и копирует public/ как есть.
 *    - На reg.ru этот файл будет доступен по адресу /api/lead.php
 *    - Принимает POST (JSON или form-urlencoded) с полями заявки
 *      и шлёт письмо на MAIL_TO через стандартный mail().
 *    - Параллельно пишет лог в /api/leads.log (тот же каталог),
 *      чтобы заявки не потерялись, если SMTP упал.
 *
 *  Куда падают письма: dvfilmaward2026@mail.ru
 *  Откуда уходят: noreply@<домен сайта> — авто-определяется по $_SERVER['HTTP_HOST'].
 *  При необходимости — поменяйте константу MAIL_FROM ниже на нужный mailbox
 *  (например info@dvkinopremiya.ru — после привязки домена в панели reg.ru).
 * ============================================================ */

declare(strict_types=1);

/* ---------- НАСТРОЙКИ ---------- */
const MAIL_TO       = 'dvfilmaward2026@mail.ru';
const MAIL_FROM     = '';                    // оставить пустым → auto noreply@<host>
const MAIL_FROM_NAME= 'Сайт ДВ Кинопремии';
const RATE_LIMIT_SEC= 30;                    // не чаще 1 заявки за 30 сек с одного IP
const LOG_FILE      = __DIR__ . '/leads.log';

/* ---------- УТИЛЫ ---------- */
function json_out(int $code, array $body): void {
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($body, JSON_UNESCAPED_UNICODE);
    exit;
}

function client_ip(): string {
    foreach (['HTTP_CF_CONNECTING_IP','HTTP_X_REAL_IP','HTTP_X_FORWARDED_FOR','REMOTE_ADDR'] as $k) {
        if (!empty($_SERVER[$k])) {
            $ip = trim(explode(',', $_SERVER[$k])[0]);
            if (filter_var($ip, FILTER_VALIDATE_IP)) return $ip;
        }
    }
    return '0.0.0.0';
}

function mime_subject(string $s): string {
    return '=?UTF-8?B?' . base64_encode($s) . '?=';
}

function safe(string $s, int $max = 500): string {
    $s = trim($s);
    if (function_exists('mb_substr')) {
        $s = mb_substr($s, 0, $max, 'UTF-8');
    } else {
        $s = substr($s, 0, $max);
    }
    return $s;
}

function escape_html(string $s): string {
    return htmlspecialchars($s, ENT_QUOTES | ENT_HTML5, 'UTF-8');
}

/* ---------- ВХОД ---------- */
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(204);
    exit;
}
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    json_out(405, ['ok' => false, 'error' => 'Method not allowed']);
}

/* JSON или form-urlencoded — принимаем оба */
$raw = file_get_contents('php://input') ?: '';
$data = [];
if ($raw !== '' && stripos($_SERVER['CONTENT_TYPE'] ?? '', 'application/json') !== false) {
    $parsed = json_decode($raw, true);
    if (is_array($parsed)) $data = $parsed;
}
if (!$data) {
    $data = $_POST ?: [];
}

/* honeypot — боты заполнят, пользователи не видят */
if (!empty($data['company'])) {
    json_out(200, ['ok' => true]);  // молча принимаем
}

/* ---------- ВАЛИДАЦИЯ ---------- */
$name   = safe((string)($data['name']   ?? ''), 120);
$email  = safe((string)($data['email']  ?? ''), 160);
$phone  = safe((string)($data['phone']  ?? ''), 60);
$title  = safe((string)($data['title']  ?? $data['film_title'] ?? ''), 200);
$year   = safe((string)($data['year']   ?? $data['film_year']  ?? ''), 8);
$format = safe((string)($data['format'] ?? $data['film_format']?? ''), 80);
$region = safe((string)($data['region'] ?? $data['film_region']?? ''), 120);
$role   = safe((string)($data['role']   ?? $data['contact_role']?? ''), 80);
$link   = safe((string)($data['link']   ?? $data['film_link']  ?? ''), 400);
$message= safe((string)($data['message']?? ''), 2000);
$page   = safe((string)($data['page']   ?? ''), 200);

if ($name === '' || mb_strlen($name) < 2) {
    json_out(400, ['ok' => false, 'error' => 'Укажите имя']);
}
if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    json_out(400, ['ok' => false, 'error' => 'Некорректный e-mail']);
}
if ($email === '' && $phone === '') {
    json_out(400, ['ok' => false, 'error' => 'Укажите e-mail или телефон']);
}

/* ---------- RATE-LIMIT ---------- */
$ip = client_ip();
$rateFile = sys_get_temp_dir() . '/dvk_rate_' . md5($ip) . '.lock';
if (is_file($rateFile) && (time() - filemtime($rateFile)) < RATE_LIMIT_SEC) {
    json_out(429, ['ok' => false, 'error' => 'Слишком часто — подождите минуту']);
}
@touch($rateFile);

/* ---------- ОТПРАВКА ---------- */
$host  = $_SERVER['HTTP_HOST'] ?? 'kinopremiya.local';
$from  = MAIL_FROM !== '' ? MAIL_FROM : ('noreply@' . preg_replace('/^www\./i', '', $host));
$ts    = date('d.m.Y H:i:s');

$subj  = 'Новая заявка — ДВ Кинопремия';

/* ---- Plain text ---- */
$plainLines = [
    'Новая заявка — Дальневосточная Кинопремия',
    '------------------------------------------------',
    'Имя:           ' . $name,
    'Роль:          ' . ($role   ?: '—'),
    'E-mail:        ' . ($email  ?: '—'),
    'Телефон:       ' . ($phone  ?: '—'),
    '— О фильме —',
    'Название:      ' . ($title  ?: '—'),
    'Год:           ' . ($year   ?: '—'),
    'Формат:        ' . ($format ?: '—'),
    'Регион:        ' . ($region ?: '—'),
    'Ссылка:        ' . ($link   ?: '—'),
    'Сообщение:     ' . ($message?: '—'),
    '— Служебное —',
    'Страница:      ' . ($page   ?: '/'),
    'IP:            ' . $ip,
    'UserAgent:     ' . substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 200),
    'Время:         ' . $ts . ' (server)',
];
$plain = implode("\r\n", $plainLines);

/* ---- HTML ---- */
$rows = '';
$pairs = [
    'Имя' => $name, 'Роль' => $role,
    'E-mail' => $email, 'Телефон' => $phone,
    'Название фильма' => $title, 'Год' => $year,
    'Формат' => $format, 'Регион' => $region,
    'Ссылка' => $link, 'Сообщение' => $message,
    'Страница' => $page ?: '/', 'IP' => $ip, 'Время' => $ts,
];
foreach ($pairs as $k => $v) {
    if ($v === '') $v = '—';
    $rows .= '<tr><td style="padding:6px 12px;color:#555;font-weight:600;white-space:nowrap">'
          . escape_html($k) . '</td>'
          . '<td style="padding:6px 12px;color:#111">'
          . nl2br(escape_html($v)) . '</td></tr>';
}
$html = '<!doctype html><meta charset="utf-8">'
      . '<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.55;color:#111">'
      . '<h2 style="margin:0 0 12px;font-family:Georgia,serif">Новая заявка — ДВ Кинопремия</h2>'
      . '<table cellspacing="0" cellpadding="0" style="border-collapse:collapse;border:1px solid #eee">'
      . $rows
      . '</table></div>';

/* ---- MIME ---- */
$boundary = 'b_' . bin2hex(random_bytes(8));
$body  = "--{$boundary}\r\n"
       . "Content-Type: text/plain; charset=UTF-8\r\n"
       . "Content-Transfer-Encoding: 8bit\r\n\r\n"
       . $plain . "\r\n"
       . "--{$boundary}\r\n"
       . "Content-Type: text/html; charset=UTF-8\r\n"
       . "Content-Transfer-Encoding: 8bit\r\n\r\n"
       . $html . "\r\n"
       . "--{$boundary}--";

$headers  = 'From: ' . mime_subject(MAIL_FROM_NAME) . ' <' . $from . ">\r\n";
if ($email !== '') $headers .= 'Reply-To: ' . $email . "\r\n";
$headers .= "MIME-Version: 1.0\r\n";
$headers .= "Content-Type: multipart/alternative; boundary=\"{$boundary}\"\r\n";
$headers .= "X-Mailer: dvkinopremiya-leadform/1.0\r\n";

/* ---- Лог (UTF-8, безусловно) ---- */
@file_put_contents(
    LOG_FILE,
    "[$ts] $ip $name | $email | $phone | $title\r\n",
    FILE_APPEND | LOCK_EX
);

/* ---- Отправка ---- */
$sent = @mail(MAIL_TO, mime_subject($subj), $body, $headers, '-f' . $from);

if (!$sent) {
    /* mail() недоступна → отвечаем ok, но помечаем что письмо не ушло.
       Заявка уже в leads.log, оператор увидит её через панель reg.ru. */
    json_out(202, ['ok' => true, 'warn' => 'mail-fallback']);
}

json_out(200, ['ok' => true]);
