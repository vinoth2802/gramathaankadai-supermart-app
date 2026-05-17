export default function PageStub({ icon: Icon, title }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-3 text-slate-400">
      <Icon size={40} className="text-slate-600" />
      <p className="text-lg font-medium">{title}</p>
      <p className="text-sm text-slate-500">Coming soon</p>
    </div>
  );
}
