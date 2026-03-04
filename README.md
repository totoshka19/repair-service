# Repair Service

Сервис приёма и обработки заявок в ремонтную службу. Тестовое задание на позицию «Вайб кодер» - База Бизнеса.

## Стек

| Категория | Технология |
|-----------|-----------|
| Фреймворк | Next.js 16 (App Router) |
| UI | React 19, Tailwind CSS v4, shadcn/ui |
| Язык | TypeScript (strict) |
| БД | PostgreSQL 17 |
| ORM | Prisma 7 + `@prisma/adapter-pg` |
| Аутентификация | iron-session v8 (httpOnly cookie) |
| Валидация | Zod v4 + React Hook Form |
| Тесты | Vitest |
| Инфраструктура | Docker Compose |

## Быстрый старт

**Prerequisites:** Docker Desktop, Node.js 20+

```bash
git clone <repo-url>
cd repair-service

npm install

cp .env.example .env
# При необходимости отредактируй DATABASE_URL и SESSION_SECRET в .env

npm run setup
# Поднимает БД, выполняет миграции, заполняет тестовыми данными

npm run dev
# http://localhost:3000
```

## Тестовые пользователи

| Логин | Пароль | Роль |
|-------|--------|------|
| `dispatcher` | `disp123` | Диспетчер |
| `master1` | `master123` | Мастер |
| `master2` | `master123` | Мастер |

## Страницы

| URL | Доступ | Описание |
|-----|--------|----------|
| `/login` | Публичная | Вход в систему |
| `/new-request` | Публичная | Форма подачи заявки клиентом |
| `/dispatcher` | DISPATCHER | Все заявки, назначение мастера, отмена |
| `/master` | MASTER | Свои заявки, взять в работу, завершить |

## Жизненный цикл заявки

```
NEW → ASSIGNED → IN_PROGRESS → DONE
 ↓        ↓
CANCELED CANCELED
```

## Скрипты

```bash
npm run dev          # Запуск dev-сервера
npm run build        # Production сборка
npm run test         # Запуск тестов (Vitest)
npm run db:up        # Поднять БД (Docker)
npm run db:down      # Остановить БД
npm run db:migrate   # Выполнить миграции
npm run db:seed      # Заполнить тестовыми данными
npm run db:studio    # Открыть Prisma Studio
npm run db:reset     # Сбросить БД и пересоздать
```

## Тесты

```bash
npm test
```

Тесты покрывают:
- Создание и валидацию заявок
- Полный цикл статусов
- Защиту от гонки при одновременном взятии заявки двумя мастерами (ожидается `200` + `409`)
