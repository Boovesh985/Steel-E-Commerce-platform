export default function ProductSpecs({ specs }) {
  if (!specs || Object.keys(specs).length === 0) return null;

  const entries = Array.isArray(specs) ? specs : Object.entries(specs);

  return (
    <div className="border border-border rounded-container overflow-hidden">
      <table className="w-full text-body-sm">
        <tbody>
          {entries.map(([key, value], idx) => (
            <tr
              key={key}
              className={idx % 2 === 0 ? 'bg-surface' : 'bg-bg'}
            >
              <th
                scope="row"
                className="text-left font-medium text-text-secondary py-3 px-4 w-2/5 border-b border-border align-top"
              >
                {key}
              </th>
              <td className="py-3 px-4 text-text font-mono border-b border-border">{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
