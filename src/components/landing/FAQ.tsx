import React from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useWhitelabel, DEFAULT_FAQ } from '@/hooks/useWhitelabel';

export const FAQ: React.FC = () => {
  const { config, isLoading } = useWhitelabel();

  // Use whitelabel FAQ or defaults
  const faqItems = config.faq && config.faq.length > 0
    ? config.faq
    : DEFAULT_FAQ;

  const brandName = config.brand_name || 'FunnelSim';

  return (
    <section className="py-24 relative overflow-hidden">
      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-5xl font-display font-bold text-white mb-6">
            Frequently Asked <span className="text-indigo-400">Questions</span>
          </h2>
          <p className="text-slate-400 text-lg leading-relaxed">
            Everything you need to know about {brandName} and how it can help you optimize your conversion rates.
          </p>
        </div>

        <div className="max-w-3xl mx-auto">
          <Accordion type="single" collapsible className="w-full space-y-4">
            {faqItems.map((item, idx) => (
              <AccordionItem
                key={idx}
                value={`item-${idx}`}
                className="border border-white/5 bg-dark-800/50 px-6 rounded-lg hover:border-indigo-500/30 transition-colors duration-300"
              >
                <AccordionTrigger className="text-slate-200 hover:text-indigo-400 hover:no-underline text-left font-medium text-lg">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="text-slate-400 leading-relaxed text-base pb-6">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
};
