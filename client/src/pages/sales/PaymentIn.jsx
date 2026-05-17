import { HandCoins } from 'lucide-react';

export default function PaymentIn() {
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-3 text-slate-400">
      <HandCoins size={40} className="text-slate-600" />
      <p className="text-lg font-medium">Payment In</p>
      <p className="text-sm">Coming soon</p>
    </div>
  );
}

