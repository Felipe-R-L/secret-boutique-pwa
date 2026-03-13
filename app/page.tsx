import { Header } from '@/components/header'
import { PanicButton } from '@/components/panic-button'
import { Catalog } from '@/components/catalog'
import { Footer } from '@/components/footer'

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <PanicButton />
      <Header />
      <main>
        <Catalog />
      </main>
      <Footer />
    </div>
  )
}
