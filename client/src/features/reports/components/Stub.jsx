import { FileText } from 'lucide-react';

export default function ReportStub({ title }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <FileText size={40} className="text-slate-300" />
      <p className="text-lg font-semibold text-slate-600">{title}</p>
      <p className="text-sm text-slate-400">Coming soon</p>
    </div>
  );
}
