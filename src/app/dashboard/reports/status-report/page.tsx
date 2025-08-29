import ReportFilter from "@/components/report-filters/Report-Filter";

export default function Dashboard() {
  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Status Reports</h1>
      <ReportFilter />
    </div>
  );
}
