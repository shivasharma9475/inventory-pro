export default function OrbitRings() {
  return (
    <>
      {/* Inner ring with orbiting dot */}
      <div
        className="absolute pointer-events-none"
        style={{
          width: 260,
          height: 260,
          border: "0.5px solid rgba(124,58,237,0.2)",
          borderRadius: "50%",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
        }}
      >
        <div
          className="orbit-dot absolute"
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: "#a78bfa",
            top: "50%",
            left: "50%",
            marginTop: -3,
            marginLeft: -3,
            boxShadow: "0 0 8px #a78bfa",
          }}
        />
      </div>

      {/* Outer dashed ring */}
      <div
        className="absolute pointer-events-none anim-rotate"
        style={{
          width: 380,
          height: 380,
          border: "0.5px dashed rgba(59,130,246,0.12)",
          borderRadius: "50%",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
        }}
      />
    </>
  );
}