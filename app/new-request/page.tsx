'use client'

import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { IMaskInput } from 'react-imask'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const newRequestSchema = z.object({
  clientName: z.string().min(2, 'Введите имя (минимум 2 символа)'),
  phone: z
    .string()
    .regex(/^\+7 \(\d{3}\) \d{3}-\d{2}-\d{2}$/, 'Введите корректный номер телефона'),
  address: z.string().min(5, 'Введите адрес'),
  problemText: z.string().min(10, 'Опишите проблему подробнее (минимум 10 символов)'),
})

type NewRequestForm = z.infer<typeof newRequestSchema>

export default function NewRequestPage() {
  const [submittedId, setSubmittedId] = useState<string | null>(null)

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<NewRequestForm>({
    resolver: zodResolver(newRequestSchema),
  })

  const onSubmit = async (data: NewRequestForm) => {
    const res = await fetch('/api/requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    if (!res.ok) {
      const body = await res.json()
      toast.error(body.error ?? 'Ошибка при создании заявки')
      return
    }

    const { id } = await res.json()
    setSubmittedId(id)
  }

  if (submittedId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
        <Card className="w-full max-w-sm text-center">
          <CardHeader>
            <CardTitle className="text-xl text-green-700">Заявка принята!</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-muted-foreground">
              Номер вашей заявки:{' '}
              <span className="font-mono font-semibold text-foreground">
                #{submittedId.slice(-6)}
              </span>
            </p>
            <p className="text-sm text-muted-foreground">
              Наш специалист свяжется с вами в ближайшее время.
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setSubmittedId(null)
                reset()
              }}
            >
              Подать ещё одну заявку
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-xl">Создать заявку на ремонт</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="clientName">Ваше имя</Label>
              <Input
                id="clientName"
                placeholder="Введите ваше имя"
                {...register('clientName')}
              />
              {errors.clientName && (
                <p className="text-xs text-destructive">{errors.clientName.message}</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="phone">Телефон</Label>
              <Controller
                name="phone"
                control={control}
                render={({ field }) => (
                  <IMaskInput
                    id="phone"
                    mask="+7 (000) 000-00-00"
                    placeholder="+7 (___) ___-__-__"
                    inputMode="numeric"
                    value={field.value ?? ''}
                    onAccept={(value) => field.onChange(value)}
                    onBlur={field.onBlur}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                )}
              />
              {errors.phone && (
                <p className="text-xs text-destructive">{errors.phone.message}</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="address">Адрес</Label>
              <Input
                id="address"
                placeholder="Введите ваш адрес"
                {...register('address')}
              />
              {errors.address && (
                <p className="text-xs text-destructive">{errors.address.message}</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="problemText">Описание проблемы</Label>
              <Input
                id="problemText"
                placeholder="Опишите вашу проблему"
                {...register('problemText')}
              />
              {errors.problemText && (
                <p className="text-xs text-destructive">{errors.problemText.message}</p>
              )}
            </div>

            <Button type="submit" disabled={isSubmitting} className="mt-2">
              {isSubmitting ? 'Отправка…' : 'Отправить заявку'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
