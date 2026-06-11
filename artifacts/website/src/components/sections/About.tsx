import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function About() {
  return (
    <section id="about" className="py-24 bg-background overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          
          {/* Image Side */}
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative order-2 lg:order-1"
          >
            {/* Decorative background */}
            <div className="absolute -inset-4 bg-primary/5 rounded-3xl transform rotate-3" />
            
            <div className="relative rounded-2xl overflow-hidden border border-border shadow-xl aspect-square md:aspect-[4/3]">
              <img 
                src={`${import.meta.env.BASE_URL}images/about-modern.png`}
                alt="Modern professional tech office" 
                className="w-full h-full object-cover"
              />
            </div>

            {/* Stats Card Overlay */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="absolute -bottom-6 -right-6 md:bottom-8 md:-right-8 bg-card border border-border shadow-xl rounded-xl p-6 hidden sm:block"
            >
              <div className="flex items-center gap-6">
                <div>
                  <p className="text-3xl font-bold text-foreground">99.9%</p>
                  <p className="text-sm text-muted-foreground font-medium">Uptime SLA</p>
                </div>
                <div className="w-px h-12 bg-border" />
                <div>
                  <p className="text-3xl font-bold text-foreground">24/7</p>
                  <p className="text-sm text-muted-foreground font-medium">Expert Support</p>
                </div>
              </div>
            </motion.div>
          </motion.div>

          {/* Content Side */}
          <motion.div 
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="order-1 lg:order-2"
          >
            <h2 className="text-sm font-semibold text-primary uppercase tracking-wider mb-2">Our Story</h2>
            <h3 className="text-3xl md:text-4xl font-bold text-foreground mb-6 leading-tight">
              Building the foundation for the next generation of web apps.
            </h3>
            
            <p className="text-lg text-muted-foreground mb-6">
              Founded in 2023, Vertex was born from a simple observation: building high-quality, scalable applications was still too complex. We set out to create a platform that handles the heavy lifting, so you can focus on building great products.
            </p>
            
            <p className="text-lg text-muted-foreground mb-8">
              Today, thousands of developers rely on our infrastructure to serve millions of requests daily. Our commitment remains unchanged: provide the most robust, developer-friendly tools on the market.
            </p>

            <ul className="flex flex-col gap-4 mb-8">
              {[
                "Global infrastructure distributed across 35 regions",
                "Built by developers, for developers",
                "Committed to open source and community growth"
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-primary shrink-0" />
                  <span className="text-foreground font-medium">{item}</span>
                </li>
              ))}
            </ul>

            <Button size="lg" variant="outline" className="rounded-full">
              Learn More About Us
            </Button>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
