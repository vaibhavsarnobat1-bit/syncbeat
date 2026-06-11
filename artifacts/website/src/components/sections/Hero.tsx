import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Hero() {
  return (
    <section id="home" className="relative min-h-[90vh] flex items-center pt-20 overflow-hidden bg-background">
      {/* Background Decor */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-accent/50 rounded-full blur-[100px] translate-y-1/3 -translate-x-1/4" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          
          {/* Content */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="max-w-2xl"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-muted border border-border/50 text-sm font-medium text-foreground mb-6">
              <Sparkles className="w-4 h-4 text-primary" />
              <span>Introducing Vertex 2.0</span>
            </div>
            
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-foreground leading-[1.1] mb-6">
              Elevate your <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/60">
                digital presence
              </span>
            </h1>
            
            <p className="text-lg sm:text-xl text-muted-foreground mb-8 max-w-lg leading-relaxed">
              We build beautiful, fast, and scalable digital experiences that help modern teams move faster and look better doing it.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Button asChild size="lg" className="rounded-full px-8 text-base h-12 shadow-lg shadow-primary/20">
                <a href="#contact">
                  Start Building <ArrowRight className="w-5 h-5 ml-2" />
                </a>
              </Button>
              <Button asChild variant="outline" size="lg" className="rounded-full px-8 text-base h-12 bg-background/50 backdrop-blur-sm">
                <a href="#features">
                  Explore Features
                </a>
              </Button>
            </div>
            
            <div className="mt-10 flex items-center gap-4 text-sm text-muted-foreground font-medium">
              <div className="flex -space-x-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="w-8 h-8 rounded-full border-2 border-background bg-muted flex items-center justify-center overflow-hidden">
                    {/* Unsplash avatars for social proof */}
                    <img 
                      src={`https://images.unsplash.com/photo-15${34528741775 + i}-53994a69daeb?w=64&h=64&fit=crop&crop=faces`} 
                      alt="User avatar" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
              <p>Joined by 10,000+ forward-thinking teams</p>
            </div>
          </motion.div>

          {/* Hero Image / Visual */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
            className="relative lg:ml-auto w-full max-w-lg"
          >
            <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-black/10 border border-border/50 bg-card/50 backdrop-blur-sm aspect-[4/3] flex items-center justify-center p-2">
              <div className="w-full h-full rounded-xl overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-transparent mix-blend-overlay z-10" />
                <img 
                  src={`${import.meta.env.BASE_URL}images/hero-abstract.png`}
                  alt="Abstract modern geometric representation of digital architecture" 
                  className="w-full h-full object-cover"
                />
              </div>
              
              {/* Floating UI Elements */}
              <motion.div 
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -bottom-6 -left-6 bg-background rounded-xl p-4 shadow-xl border border-border flex items-center gap-4"
              >
                <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">System Status</p>
                  <p className="text-xs text-muted-foreground">All systems operational</p>
                </div>
              </motion.div>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
