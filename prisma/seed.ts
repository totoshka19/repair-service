import { PrismaClient } from '../generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcryptjs'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('Seeding database...')

  // ─── Пользователи ───────────────────────────────────────────────────────────

  const dispatcher = await prisma.user.upsert({
    where: { username: 'dispatcher' },
    update: {},
    create: {
      username: 'dispatcher',
      passwordHash: await bcrypt.hash('disp123', 10),
      role: 'DISPATCHER',
    },
  })

  const master1 = await prisma.user.upsert({
    where: { username: 'master1' },
    update: {},
    create: {
      username: 'master1',
      passwordHash: await bcrypt.hash('master123', 10),
      role: 'MASTER',
    },
  })

  const master2 = await prisma.user.upsert({
    where: { username: 'master2' },
    update: {},
    create: {
      username: 'master2',
      passwordHash: await bcrypt.hash('master123', 10),
      role: 'MASTER',
    },
  })

  console.log('Users created:', dispatcher.username, master1.username, master2.username)

  // ─── Заявки — создаём только если их ещё нет ────────────────────────────────

  const requestCount = await prisma.request.count()
  if (requestCount > 0) {
    console.log(`Requests already exist (${requestCount}), skipping seed.`)
    return
  }

  await prisma.request.createMany({
    data: [
      // NEW — ждут назначения
      {
        clientName: 'Анна Смирнова',
        phone: '+7 (495) 111-22-33',
        address: 'ул. Ленина, д. 5, кв. 12',
        problemText: 'Течёт кран на кухне, вода капает постоянно',
        status: 'NEW',
      },
      {
        clientName: 'Пётр Иванов',
        phone: '+7 (495) 222-33-44',
        address: 'пр. Мира, д. 10, кв. 7',
        problemText: 'Не работает розетка в ванной',
        status: 'NEW',
      },

      // ASSIGNED — назначены на master1
      {
        clientName: 'Мария Козлова',
        phone: '+7 (495) 333-44-55',
        address: 'ул. Садовая, д. 15, кв. 3',
        problemText: 'Засор в трубах, вода не уходит',
        status: 'ASSIGNED',
        assignedTo: master1.id,
      },
      {
        clientName: 'Сергей Попов',
        phone: '+7 (495) 444-55-66',
        address: 'ул. Гагарина, д. 20, кв. 1',
        problemText: 'Батарея не греет, в комнате холодно',
        status: 'ASSIGNED',
        assignedTo: master1.id,
      },

      // IN_PROGRESS — master2 взял в работу
      {
        clientName: 'Елена Новикова',
        phone: '+7 (495) 555-66-77',
        address: 'пер. Тихий, д. 2, кв. 5',
        problemText: 'Сломалась дверная ручка, дверь не закрывается',
        status: 'IN_PROGRESS',
        assignedTo: master2.id,
      },

      // DONE
      {
        clientName: 'Дмитрий Волков',
        phone: '+7 (495) 666-77-88',
        address: 'бул. Победы, д. 8, кв. 22',
        problemText: 'Замена электрической проводки на кухне',
        status: 'DONE',
        assignedTo: master1.id,
      },

      // CANCELED
      {
        clientName: 'Ольга Соколова',
        phone: '+7 (495) 777-88-99',
        address: 'ул. Чехова, д. 3, кв. 15',
        problemText: 'Протекает крыша над балконом',
        status: 'CANCELED',
      },
    ],
  })

  console.log('Requests created: 7')
  console.log('Seed completed successfully.')
}

main()
  .catch((e) => {
    console.error('Seed failed:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
