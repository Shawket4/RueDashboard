import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Building2, X, Search } from "lucide-react";
import { getOrgs, createOrg } from "../../api/orgs";

export default function Orgs() {
  const qc = useQueryClient();
  const [modal,  setModal]  = useState(false);
  const [search, setSearch] = useState("");
  const [error,  setError]  = useState("");
  const [form,   setForm]   = useState({ name: "", slug: "", currency_code: "EGP", tax_rate: 0.14, receipt_footer: "" });

  const { data, isLoading } = useQuery({
    queryKey: ["orgs"],
    queryFn:  () => getOrgs().then(r => r.data),
  });

  const mutation = useMutation({
    mutationFn: createOrg,
    onSuccess: () => {
      qc.invalidateQueries(["orgs"]);
      setModal(false);
      setForm({ name: "", slug: "", currency_code: "EGP", tax_rate: 0.14, receipt_footer: "" });
    },
    onError: (e) => setError(e.response?.data?.error || "Failed to create org"),
  });

  const filtered = data?.filter(o =>
    o.name.toLowerCase().includes(search.toLowerCase()) ||
    o.slug.toLowerCase().includes(search.toLowerCase())
  ) ?? [];

  return (
    <div className="p-3 sm:p-6 lg:p-8 space-y-4 sm:space-y-6">
      {/* Header bar */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        <div className="flex-1">
          <h2 className="font-bold text-gray-900">All Organizations</h2>
          <p className="text-gray-400 text-xs mt-0.5">{data?.length ?? 0} total</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search orgs..."
              className="border border-gray-200 rounded-xl pl-8 pr-4 py-2 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"
            />
          </div>
          <button onClick={() => setModal(true)}
            className="flex items-center gap-2 text-white font-semibold px-4 py-2 rounded-xl text-sm transition"
            style={{ background: "linear-gradient(135deg, #1a56db, #3b28cc)" }}>
            <Plus size={15} /> New Org
          </button>
        </div>
      </div>

      {/* Table card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-[3px] border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {["Organization", "Slug", "Currency", "Tax Rate", "Status"].map(h => (
                    <th key={h} className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(org => (
                  <tr key={org.id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                          style={{ background: "linear-gradient(135deg, #1a56db22, #3b28cc22)" }}>
                          <Building2 size={15} className="text-blue-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{org.name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="font-mono text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-lg">{org.slug}</span>
                    </td>
                    <td className="px-5 py-4 text-gray-600">{org.currency_code}</td>
                    <td className="px-5 py-4 text-gray-600">{(org.tax_rate * 100).toFixed(0)}%</td>
                    <td className="px-5 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold
                        ${org.is_active ? "bg-green-50 text-green-700 border border-green-100" : "bg-gray-100 text-gray-500"}`}>
                        {org.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                  </tr>
                ))}
                {!filtered.length && (
                  <tr><td colSpan={5} className="px-5 py-12 text-center text-gray-400 text-sm">No organizations found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-gray-100">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="font-bold text-gray-900">Create Organization</h2>
                <p className="text-gray-400 text-xs mt-0.5">Add a new coffee brand to the platform</p>
              </div>
              <button onClick={() => setModal(false)} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={e => { e.preventDefault(); setError(""); mutation.mutate({ ...form, tax_rate: parseFloat(form.tax_rate) }); }}
              className="p-6 space-y-4">
              <Field label="Organization Name" value={form.name}           onChange={v => setForm(f => ({ ...f, name: v }))}           placeholder="Bean & Brew Co." />
              <Field label="Slug"              value={form.slug}           onChange={v => setForm(f => ({ ...f, slug: v }))}           placeholder="bean-and-brew" />
              <div className="grid grid-cols-2 gap-4">
                <Field label="Currency" value={form.currency_code} onChange={v => setForm(f => ({ ...f, currency_code: v }))} placeholder="EGP" />
                <Field label="Tax Rate" value={form.tax_rate}      onChange={v => setForm(f => ({ ...f, tax_rate: v }))}      placeholder="0.14" type="number" step="0.01" />
              </div>
              <Field label="Receipt Footer" value={form.receipt_footer} onChange={v => setForm(f => ({ ...f, receipt_footer: v }))} placeholder="Thank you for visiting!" />
              {error && <p className="text-red-500 text-sm bg-red-50 border border-red-100 rounded-xl px-4 py-3">{error}</p>}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setModal(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">
                  Cancel
                </button>
                <button type="submit" disabled={mutation.isPending}
                  className="flex-1 text-white font-semibold rounded-xl py-2.5 text-sm transition disabled:opacity-60"
                  style={{ background: "linear-gradient(135deg, #1a56db, #3b28cc)" }}>
                  {mutation.isPending ? "Creating..." : "Create Org"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = "text", step }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">{label}</label>
      <input type={type} step={step} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
      />
    </div>
  );
}