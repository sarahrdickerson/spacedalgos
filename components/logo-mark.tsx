const LogoMark = () => {
  return (
    <div className="w-7 h-7 rounded-lg bg-primary p-1.5 flex-shrink-0">
      <svg viewBox="0 0 10 10" fill="none" aria-hidden="true">
        <rect
          x="0"
          y="0"
          width="4"
          height="4"
          rx="0.8"
          fill="white"
          opacity="0.95"
        />
        <rect
          x="6"
          y="0"
          width="4"
          height="4"
          rx="0.8"
          fill="white"
          opacity="0.55"
        />
        <rect
          x="0"
          y="6"
          width="4"
          height="4"
          rx="0.8"
          fill="white"
          opacity="0.30"
        />
        <rect
          x="6"
          y="6"
          width="4"
          height="4"
          rx="0.8"
          fill="white"
          opacity="0.75"
        />
      </svg>
    </div>
  );
};

export default LogoMark;
