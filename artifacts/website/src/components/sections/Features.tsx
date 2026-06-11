import { motion } from "framer-motion";
import { Zap, Shield, Smartphone, Globe, Code2, LineChart } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const features = [
  {
    title: "Lightning Fast",
    description: "Built on modern edge infrastructure to deliver sub-second load times globally.",
    icon: Zap,
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
  },
  {
    title: "Enterprise Security",
    description: "Bank-grade encryption and security protocols protect your data by default.",
    icon: Shield,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  {
    title: "Mobile Optimized",
    description: "Flawless responsive experiences across all devices and screen sizes.",
    icon: Smartphone,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
  },
  {
    title: "Global Reach",
    description: "Deploy to our global CDN network with a single click, no configuration needed.",
    icon: Globe,
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
  },
  {
    title: "Developer First",
    description: "Extensive APIs, webhooks, and developer tooling to extend our platform.",
    icon: Code2,
    color: "text-pink-500",
    bgColor: "bg-pink-500/10",
  },
  {
    title: "Advanced Analytics",
    description: "Deep insights into user behavior and application performance metrics.",
    icon: LineChart,
    color: "text-indigo-500",
    bgColor: "bg-indigo-500/10",
  },
];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } }
};

export function Features() {
  return (
    <section id="features" className="py-24 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-sm font-semibold text-primary uppercase tracking-wider mb-2">Platform Features</h2>
          <h3 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Everything you need to scale
          </h3>
          <p className="text-lg text-muted-foreground">
            We've built a comprehensive suite of tools to help you build, deploy, and manage your applications with unprecedented speed.
          </p>
        </div>

        <motion.div 
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div key={index} variants={item}>
                <Card className="h-full border-border/50 bg-background/50 backdrop-blur-sm hover:shadow-md transition-shadow duration-300">
                  <CardHeader>
                    <div className={`w-12 h-12 rounded-xl ${feature.bgColor} flex items-center justify-center mb-4`}>
                      <Icon className={`w-6 h-6 ${feature.color}`} />
                    </div>
                    <CardTitle className="text-xl">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base">
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>
        
      </div>
    </section>
  );
}
