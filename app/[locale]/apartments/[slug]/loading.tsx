export default function Loading() {
  return (
    <div className="container" style={{ paddingBlock: "2rem" }} role="status" aria-busy="true">
      <div className="skel" style={{ height: 340, borderRadius: 22, marginBottom: 24 }} />
      <div className="skel-stack" style={{ maxWidth: 560 }}>
        <div className="skel skel-line" style={{ width: "60%", height: 26 }} />
        <div className="skel skel-line" style={{ width: "35%" }} />
        <div className="skel skel-line" style={{ width: "90%" }} />
        <div className="skel skel-line" style={{ width: "80%" }} />
      </div>
    </div>
  );
}
