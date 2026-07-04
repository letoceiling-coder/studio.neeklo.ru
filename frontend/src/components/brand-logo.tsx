type Variant = "mark" | "wordmark";

/**
 * Бренд-лого neeklo. Рендерится инлайново (текст + градиент бренда),
 * без внешних ассетов — корректно отображается в любом окружении.
 */
export function BrandLogo({
  variant = "mark",
  className,
  height,
  alt = "neeklo",
}: {
  variant?: Variant;
  className?: string;
  height?: number;
  alt?: string;
}) {
  if (variant === "wordmark") {
    const size = height ?? 24;
    return (
      <span
        role="img"
        aria-label={alt}
        className={className}
        style={{ display: "inline-flex", alignItems: "center", height, lineHeight: 1 }}
      >
        <span
          style={{
            fontSize: size,
            fontWeight: 800,
            letterSpacing: "-0.045em",
            lineHeight: 1,
            backgroundImage: "var(--gradient-warm)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
            WebkitTextFillColor: "transparent",
          }}
        >
          neeklo
        </span>
      </span>
    );
  }

  const s = height ?? 28;
  return (
    <span
      role="img"
      aria-label={alt}
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: s,
        height: s,
        borderRadius: s * 0.28,
        backgroundImage: "var(--gradient-warm)",
        color: "var(--accent-foreground)",
        fontWeight: 800,
        fontSize: s * 0.58,
        lineHeight: 1,
      }}
    >
      n
    </span>
  );
}
