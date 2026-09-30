const COLORS = ['#7F77DD','#1D9E75','#D85A30','#378ADD','#D4537E','#BA7517'];

export const Avatar = ({ name, size = 36 }: { name: string; size?: number }) => {
  const initials = name?.split(' ').map(n => n[0]).slice(0,2).join('').toUpperCase() || '?';
  const bg = COLORS[(name?.charCodeAt(0) ?? 0) % COLORS.length];
  return (
    <div
      style={{
        width: size, height: size, borderRadius: '50%',
        background: bg + '22', color: bg, border: `1.5px solid ${bg}44`,
        fontSize: size * 0.35, fontWeight: 600,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      {initials}
    </div>
  );
};
