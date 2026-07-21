import { Suspense } from 'react'
import { RegisterForm } from './register-form'
import { Loader2 } from 'lucide-react'

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>}>
      <RegisterForm />
    </Suspense>
  )
}
