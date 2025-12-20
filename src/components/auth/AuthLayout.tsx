import { Zap, Shield, Clock, Users } from "lucide-react";

interface AuthLayoutProps {
  children: React.ReactNode;
}

const features = [
  {
    icon: Zap,
    title: "Instant Recharge",
    description: "Top up airtime and data in seconds",
  },
  {
    icon: Shield,
    title: "Secure Transactions",
    description: "Bank-grade encryption for all payments",
  },
  {
    icon: Clock,
    title: "24/7 Availability",
    description: "Services available round the clock",
  },
  {
    icon: Users,
    title: "Trusted by Thousands",
    description: "Join our growing community of users",
  },
];

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex">
      <div
        className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary to-[#000a3f] relative overflow-hidden"
        aria-hidden="true"
      >
        <div
          className="absolute top-20 -left-20 w-96 h-96 rounded-full opacity-20"
          style={{
            background:
              "radial-gradient(circle, hsl(var(--primary)) 0%, transparent 70%)",
          }}
        />
        <div
          className="absolute bottom-10 right-10 w-80 h-80 rounded-full opacity-15"
          style={{
            background:
              "radial-gradient(circle, hsl(var(--accent)) 0%, transparent 70%)",
          }}
        />
        <div
          className="absolute top-1/2 left-1/3 w-64 h-64 rounded-full opacity-10"
          style={{
            background:
              "radial-gradient(circle, hsl(var(--accent)) 0%, transparent 70%)",
          }}
        />

        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-16 w-full">
          <div className="mb-8">
            <div className="flex items-center justify-center mb-6 gap-3">
              <img 
                src="/logo.png" 
                alt="OSGHub VTU Logo" 
                className="h-12 w-auto"
              />
              <span className="text-3xl font-bold text-white">OSGHub VTU</span>
            </div>
            <h1 className="text-4xl xl:text-5xl font-bold text-white mb-4 leading-tight">
              Your One-Stop
              <br />
              <span className="text-accent">VTU Platform</span>
            </h1>
            <p className="text-gray-300 text-lg max-w-md">
              Recharge airtime, buy data, pay bills, and more. Fast, secure, and
              reliable services at your fingertips.
            </p>
          </div>

          <div className="space-y-6">
            {features.map((feature, index) => (
              <div key={index} className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                  <feature.icon className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-1">
                    {feature.title}
                  </h3>
                  <p className="text-gray-300 text-sm">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center bg-background p-6 lg:p-8">
        <div className="w-full max-w-[450px]">{children}</div>
      </div>
    </div>
  );
}
