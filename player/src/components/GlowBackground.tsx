interface GlowProps {
  variant?: 'home' | 'settings' | 'login'
}

export default function GlowBackground({ variant = 'home' }: GlowProps) {
  return (
    <>
      <div
        className="absolute pointer-events-none rounded-full z-0"
        style={{
          top: variant === 'login' ? '-150px' : '-260px',
          right: variant === 'login' ? '-100px' : '-60px',
          width: variant === 'login' ? '600px' : '780px',
          height: variant === 'login' ? '450px' : '560px',
          backgroundImage: 'radial-gradient(ellipse 50% 50% at 50% 50%, #D9772A57 0%, #05050500 100%)',
        }}
      />
      <div
        className="absolute pointer-events-none rounded-full z-0"
        style={{
          bottom: variant === 'login' ? '-100px' : undefined,
          top: variant === 'login' ? undefined : '360px',
          left: variant === 'login' ? '-100px' : '-260px',
          width: variant === 'login' ? '500px' : '620px',
          height: variant === 'login' ? '400px' : '500px',
          backgroundImage: variant === 'settings'
            ? 'radial-gradient(ellipse 50% 50% at 50% 50%, #18443c38 0%, #05050500 100%)'
            : 'radial-gradient(ellipse 50% 50% at 50% 50%, #4da3ff2e 0%, #05050500 100%)',
        }}
      />
    </>
  )
}
