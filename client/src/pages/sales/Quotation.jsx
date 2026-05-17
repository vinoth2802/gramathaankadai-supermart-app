import { MessageSquareQuote } from 'lucide-react';

export default function Quotation() {
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-3 text-slate-400">
      <MessageSquareQuote size={40} className="text-slate-600" />
      <p className="text-lg font-medium">Quotation</p>
      <p className="text-sm">Coming soon</p>
    </div>
  );
}

