type JarvisRingProps = {
  ringState: "idle" | "listening" | "speaking";
};

export default function JarvisRing({ ringState }: JarvisRingProps) {
  return (
    <div className={`jarvisRing ${ringState}`} aria-hidden="true">
      <span className="jarvisCore" />
    </div>
  );
}
