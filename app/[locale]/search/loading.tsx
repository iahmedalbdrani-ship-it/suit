export default function Loading() {
  return (
    <div className="container" style={{ paddingBlock: "2rem" }} role="status" aria-busy="true">
      <div className="skel" style={{ height: 56, marginBottom: 24, borderRadius: 16 }} />
      <div className="listing-grid">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="skel-stack">
            <div className="skel" style={{ aspectRatio: "4 / 3", borderRadius: 18 }} />
            <div className="skel skel-line" style={{ width: "70%" }} />
            <div className="skel skel-line" style={{ width: "40%" }} />
          </div>
        ))}
      </div>
    </div>
  );
}
