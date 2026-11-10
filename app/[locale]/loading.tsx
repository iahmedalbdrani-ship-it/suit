export default function Loading() {
  return (
    <div className="container" style={{ paddingBlock: "3rem" }} role="status" aria-busy="true">
      <div className="skel-stack" style={{ maxWidth: 640 }}>
        <div className="skel skel-line" style={{ width: "50%", height: 30 }} />
        <div className="skel skel-line" style={{ width: "85%" }} />
        <div className="skel skel-line" style={{ width: "70%" }} />
      </div>
    </div>
  );
}
