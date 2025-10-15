# Руководство по развертыванию и эксплуатации проекта **webcraft\_server** (Arch Linux)

Документ описывает полную настройку проекта (API на Node.js + SQLite) и фронтенда под Apache. Предпочтительный вариант — **обратный прокси Apache → Node** (никаких открытых нестандартных портов наружу).

---

## 1. Предпосылки

* Arch Linux (Wayland/Hyprland не влияет).
* Права `sudo`.
* Apache установлен и включён:

  ```bash
  sudo pacman -Syu apache
  sudo systemctl enable --now httpd
  ```
* Git (если тянете проект из репозитория):

  ```bash
  sudo pacman -S git
  ```

---

## 2. Node.js (LTS) и менеджер версий

Рекомендуется **Node 22 (LTS)** — меньше проблем с нативными модулями.

### Вариант A. nvm для fish через Fisher

```bash
# Установка Fisher (если ещё нет)
curl -sL https://git.io/fisher | source && fisher install jorgebucaran/fisher
# Установка nvm для fish
fisher install jorgebucaran/nvm.fish

# Установка и активация Node 22
nvm install 22
nvm use 22

node -v   # должно показать v22.x
which node
which npm
```

> Альтернатива: системный пакет `nvm` инициализировать через `bass` (fish) — подходит продвинутым.

---

## 3. Структура проекта

Предполагаемый путь:

```
/srv/http/webcraft_server      ← backend (Node, SQLite)
/srv/http                      ← фронтенд/статика
```

Права на каталог проекта:

```bash
sudo chown -R $USER:$USER /srv/http/webcraft_server
```

---

## 4. Установка зависимостей

В проекте:

```bash
cd /srv/http/webcraft_server
rm -rf node_modules package-lock.json ~/.npm/_prebuilds  # чистим артефакты прошлых Node
npm install
```

> Если используете нестандартную версию Node и видите ошибки нативных модулей (better-sqlite3):
> `npm install --build-from-source`.

Проверка ABI текущего Node:

```bash
node -p "process.versions.node + ' ABI=' + process.versions.modules"
```

---

## 5. Конфигурация Apache (обратный прокси)

1. Включить модули в `/etc/httpd/conf/httpd.conf`:

```apache
LoadModule proxy_module modules/mod_proxy.so
LoadModule proxy_http_module modules/mod_proxy_http.so
```

2. Создать виртуальный хост `/etc/httpd/conf/extra/webcraft.conf`:

```apache
<VirtualHost *:80>
    ServerName 192.168.0.100        # замените при необходимости на свой IP/домен
    DocumentRoot "/srv/http"

    ProxyRequests Off
    ProxyPreserveHost On
    ProxyPass        "/api" "http://127.0.0.1:3000/api"
    ProxyPassReverse "/api" "http://127.0.0.1:3000/api"

    <Directory "/srv/http">
        Require all granted
        AllowOverride All
    </Directory>
</VirtualHost>
```

3. Подключить файл к основному конфигу (если ещё не подключен):

```bash
echo 'Include conf/extra/webcraft.conf' | sudo tee -a /etc/httpd/conf/httpd.conf
sudo systemctl restart httpd
```

---

## 6. Настройка и запуск backend (Node.js)

В `server.js` — слушать **loopback**, чтобы порт 3000 не был доступен извне:

```js
const PORT = 3000;
app.listen(PORT, '127.0.0.1', () => {
  console.log(`API слушает http://127.0.0.1:${PORT}`);
});
```

Ручной запуск для проверки:

```bash
node /srv/http/webcraft_server/server.js
```

Проверки:

```bash
# напрямую API (минуя Apache)
curl -s http://127.0.0.1:3000/            # должно ответить "Сервер работает 🚀"
curl -s http://127.0.0.1:3000/api/tasks   # [] или список задач

# через Apache-прокси
curl -s http://localhost/api/tasks
```

---

## 7. Автозапуск через systemd

Файл `/etc/systemd/system/webcraft.service`:

```ini
[Unit]
Description=Webcraft Node Server
After=network.target

[Service]
Environment=NODE_ENV=production PORT=3000
WorkingDirectory=/srv/http/webcraft_server
ExecStart=/home/user/.local/share/nvm/v22.19.0/bin/node /srv/http/webcraft_server/server.js
User=user
Group=user
Restart=always
RestartSec=2
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
```

> Укажите **вашего** пользователя и корректный путь к `node` (из `which node` при активном nvm).

Активировать:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now webcraft
sudo journalctl -u webcraft -f
```

---

## 8. База данных (SQLite)

Файл БД: `/srv/http/webcraft_server/database.sqlite`.
Таблицы создаются автоматически при старте (есть `CREATE TABLE IF NOT EXISTS ...`).

CLI:

```bash
sudo pacman -S sqlite
sqlite3 /srv/http/webcraft_server/database.sqlite ".tables"
sqlite3 /srv/http/webcraft_server/database.sqlite "SELECT * FROM tasks ORDER BY created_at DESC;"
```

Экспорт/резервная копия:

```bash
sqlite3 /srv/http/webcraft_server/database.sqlite ".backup 'backup-$(date +%F).sqlite'"
```

---

## 9. API (краткая спецификация)

Базовый URL (через Apache): `http://<ServerName>/api`

* `GET /api/tasks` → список задач.
* `POST /api/tasks` → создать задачу.

  ```json
  { "content": "текст" }
  ```
* `DELETE /api/tasks/:id` → удалить задачу.
* (рекомендуется добавить) `PUT /api/tasks/:id` → обновить текст:

  ```json
  { "content": "новый текст" }
  ```
* (опционально) `PATCH /api/tasks/:id/toggle` → переключить `completed`.

Все SQL — через параметризованные запросы (`?`) → защита от SQL-инъекций.

---

## 10. Фронтенд

В файле `main.js` используйте **относительные пути** (так как настроен прокси):

```js
fetch('/api/tasks')          // GET
fetch('/api/tasks', {...})   // POST
fetch(`/api/tasks/${id}`, { method: 'DELETE' })
```

**Не** используйте хардкоды вида `http://192.168.0.100:3000/...`.

---

## 11. Безопасность и валидация

* На стороне сервера:

  ```js
  app.use(express.json({ limit: '16kb' }));

  // пример валидации
  if (typeof content !== 'string' || !(content = content.trim()) || content.length > 500)
    return res.status(400).json({ error: 'Некорректный контент' });

  // проверка id
  const idNum = Number.parseInt(req.params.id, 10);
  if (!Number.isInteger(idNum) || idNum <= 0)
    return res.status(400).json({ error: 'Некорректный id' });
  ```

* На фронтенде — выводите текст через `textContent` (не `innerHTML`), чтобы не было XSS.

* Если уйдёте на HTTPS — убедитесь, что **всё** идёт по HTTPS (прокси решает mixed content автоматически).

---

## 12. Диагностика и типовые ошибки

### 503 (Service Unavailable) при `GET /api/...`

* Бэкенд не слушает `127.0.0.1:3000` или Apache не видит его.
* Проверка:

  ```bash
  ss -lntp | grep :3000
  curl -v http://127.0.0.1:3000/api/tasks
  sudo httpd -M | grep proxy
  sudo tail -n 100 /var/log/httpd/error_log
  ```

### `ERR_CONNECTION_REFUSED` в браузере

* Фронтенд обращается к `127.0.0.1:3000` с **другой машины** (это loopback клиента).
* Решение: относительные URL + Apache-прокси (рекомендуется).

### `EACCES: permission denied, mkdir '.../node_modules'`

* Нет прав на каталог проекта.
  Решение:

  ```bash
  sudo chown -R $USER:$USER /srv/http/webcraft_server
  ```

### `ERR_DLOPEN_FAILED`, несовпадение `NODE_MODULE_VERSION`

* Бинарь `better-sqlite3` собран под другой Node ABI.
* Решение:

  ```bash
  rm -rf node_modules package-lock.json ~/.npm/_prebuilds
  nvm use 22
  npm install            # при необходимости: npm install --build-from-source
  ```

---

## 13. Проверка защиты от SQL-инъекций (пример)

```bash
# инъекции сохраняются как текст, таблица не рушится
curl -s -X POST http://localhost/api/tasks \
  -H 'Content-Type: application/json' \
  -d '{"content":"task1\'; DROP TABLE tasks; --"}'
curl -s http://localhost/api/tasks
```

---

## 14. (Опционально) Фаервол

Если включаете UFW:

```bash
sudo pacman -S ufw
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status verbose
```

Порт `3000` открывать **не нужно**, так как используем прокси.

---

## 15. Краткий чек-лист запуска

1. Node 22 активен: `node -v`.
2. Зависимости: `npm install` без `sudo`.
3. Apache: модули proxy включены, `webcraft.conf` подключён.
4. Backend слушает `127.0.0.1:3000`.
5. `curl http://127.0.0.1:3000/api/tasks` — OK.
6. `curl http://localhost/api/tasks` — OK.
7. Открываем сайт в браузере: список задач загружается, создание/удаление работает.
