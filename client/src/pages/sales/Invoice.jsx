import { FileText } from 'lucide-react';

export default function SalesInvoice() {
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-3 text-slate-400">
      <FileText size={40} className="text-slate-600" />
      <p className="text-lg font-medium">Sales Invoice</p>
      <p className="text-sm">Coming soon</p>
    </div>
  );
}

