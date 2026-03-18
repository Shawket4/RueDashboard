export default function ActiveBadge({ active }) {
  return (
    <span
      className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0
        ${active ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-400"}`}
    >
      {active ? "Active" : "Inactive"}
    </span>
  );
}
