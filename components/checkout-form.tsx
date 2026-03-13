'use client'

import React from "react"

import { useState } from 'react'
import { QrCode, CreditCard, CheckCircle } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useCartStore } from '@/lib/store/cart-store'

type PaymentMethod = 'pix' | 'maquininha'

interface CheckoutFormProps {
  onSuccess: () => void
}

export function CheckoutForm({ onSuccess }: CheckoutFormProps) {
  const [roomNumber, setRoomNumber] = useState('')
  const [pickupAtLobby, setPickupAtLobby] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix')
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const { getTotal, clearCart } = useCartStore()

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    // Simulate order submission
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    clearCart()
    setIsSubmitting(false)
    onSuccess()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <h3 className="font-medium text-foreground">Entrega</h3>
        
        <div className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
          <label htmlFor="pickup-toggle" className="text-sm text-foreground">
            Retirar na Portaria
          </label>
          <Switch
            id="pickup-toggle"
            checked={pickupAtLobby}
            onCheckedChange={setPickupAtLobby}
          />
        </div>
        
        {!pickupAtLobby && (
          <div className="space-y-2">
            <label htmlFor="room-number" className="text-sm text-muted-foreground">
              Numero do Quarto
            </label>
            <Input
              id="room-number"
              type="text"
              placeholder="Ex: 101"
              value={roomNumber}
              onChange={(e) => setRoomNumber(e.target.value)}
              className="h-12 rounded-xl"
            />
          </div>
        )}
      </div>

      <div className="space-y-4">
        <h3 className="font-medium text-foreground">Pagamento</h3>
        
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setPaymentMethod('pix')}
            className={cn(
              'flex flex-col items-center gap-2 rounded-xl border p-4 transition-colors',
              paymentMethod === 'pix'
                ? 'border-primary bg-primary/5'
                : 'border-border bg-card hover:bg-muted'
            )}
          >
            <QrCode className={cn(
              'size-6',
              paymentMethod === 'pix' ? 'text-primary' : 'text-muted-foreground'
            )} />
            <span className={cn(
              'text-sm font-medium',
              paymentMethod === 'pix' ? 'text-primary' : 'text-foreground'
            )}>
              Pix
            </span>
          </button>
          
          <button
            type="button"
            onClick={() => setPaymentMethod('maquininha')}
            className={cn(
              'flex flex-col items-center gap-2 rounded-xl border p-4 transition-colors',
              paymentMethod === 'maquininha'
                ? 'border-primary bg-primary/5'
                : 'border-border bg-card hover:bg-muted'
            )}
          >
            <CreditCard className={cn(
              'size-6',
              paymentMethod === 'maquininha' ? 'text-primary' : 'text-muted-foreground'
            )} />
            <span className={cn(
              'text-sm font-medium',
              paymentMethod === 'maquininha' ? 'text-primary' : 'text-foreground'
            )}>
              Maquininha
            </span>
          </button>
        </div>
      </div>

      <div className="space-y-3 border-t border-border pt-4">
        <div className="flex items-center justify-between text-lg font-semibold">
          <span>Total</span>
          <span>{formatPrice(getTotal())}</span>
        </div>
        
        <Button
          type="submit"
          size="lg"
          className="w-full rounded-xl"
          disabled={isSubmitting || (!pickupAtLobby && !roomNumber)}
        >
          {isSubmitting ? (
            'Processando...'
          ) : (
            <>
              <CheckCircle className="size-5" />
              Finalizar Pedido
            </>
          )}
        </Button>
      </div>
    </form>
  )
}
